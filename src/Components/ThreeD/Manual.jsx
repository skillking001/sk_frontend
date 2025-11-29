// src/Components/ThreeD/Manual.jsx
"use client";

import React, { useState, useRef, useMemo, useEffect } from "react";
import axios from "axios";
import { jwtDecode } from "jwt-decode";

export default function Manual() {
  // ------------------------------ TOP CONTROLS -------------------------------
  const [selection, setSelection] = useState("all");
  const [pick, setPick] = useState("straight");
  const [quantity, setQuantity] = useState("");
  const [rate, setRate] = useState("10");

  const handleSelectionChangeTop = (e) => setSelection(e.target.value);
  const handlePickChange = (e) => setPick(e.target.value);

  const handleQuantityChange = (e) => {
    const raw = e.target.value.replace(/\D/g, "");
    setQuantity(raw.slice(0, 4));
  };

  const handleRateChange = (value) => setRate(value);

  // ------------------------------ LOCAL STORAGE SETUP -------------------------------
  const LOCAL_KEY = "threeD_manual_tickets";
  const loadLocal = () => {
    try {
      const stored = JSON.parse(localStorage.getItem(LOCAL_KEY));
      return Array.isArray(stored) ? stored : [];
    } catch {
      return [];
    }
  };
  const saveLocal = (data) => {
    try {
      localStorage.setItem(LOCAL_KEY, JSON.stringify(data));
    } catch (err) {
      console.error("Failed saving local:", err);
    }
  };

  // ------------------------------ BARCODE -------------------------------
  const [barcode, setBarcode] = useState("");

  // ------------------------------ GRID -------------------------------
  const NUM_COLS = 6;
  const NUM_ROWS = 8;

  const selectionOptions = [
    { value: "straight", label: "Straight" },
    { value: "box", label: "Box" },
    { value: "frontPair", label: "Front Pair" },
    { value: "backPair", label: "Back Pair" },
    { value: "splitPair", label: "Split Pair" },
    { value: "anyPair", label: "Any Pair" },
  ];

  const [selections, setSelections] = useState(() =>
    Array.from({ length: NUM_COLS }, () => Array(NUM_ROWS).fill("straight"))
  );

  const [numbers, setNumbers] = useState(() =>
    Array.from({ length: NUM_COLS }, () =>
      Array.from({ length: NUM_ROWS }, () => ["", "", ""])
    )
  );

  // stores the rate assigned the moment a cell became complete; null otherwise
  const [ratesPerCell, setRatesPerCell] = useState(() =>
    Array.from({ length: NUM_COLS }, () =>
      Array.from({ length: NUM_ROWS }, () => null)
    )
  );

  const inputRefs = useRef(
    Array.from({ length: NUM_COLS }, () =>
      Array.from({ length: NUM_ROWS }, () => [null, null, null])
    )
  );

  // ------------------------------ TYPE DISABLE LOGIC -------------------------------
  const isDisabled = (type, inputIdx) => {
    // if true => input at inputIdx is disabled and should be represented as 'x' when saved
    switch (type) {
      case "frontPair":
        return inputIdx === 2; // last digit disabled => e.g. 11x
      case "backPair":
        return inputIdx === 0; // first digit disabled => e.g. x11
      case "splitPair":
        return inputIdx === 1; // middle disabled => e.g. 1x1
      case "anyPair":
        return inputIdx === 2; // same as frontPair
      default:
        return false; // straight / box => all active
    }
  };

  // Map selection value to short code used in tickets
  const typeToCode = {
    straight: "STR",
    box: "BOX",
    frontPair: "FP",
    backPair: "BP",
    splitPair: "SP",
    anyPair: "AP",
  };

  // ------------------------------ HELPERS: display string & completion -------------------------------
  const getCellDisplayNumber = (colIdx, rowIdx) => {
    const type = selections[colIdx][rowIdx] || "straight";
    const digits = numbers[colIdx][rowIdx] || ["", "", ""];

    // Build display array with 'x' for disabled positions
    const displayArr = [0, 1, 2].map((i) =>
      isDisabled(type, i) ? "x" : digits[i] || ""
    );

    return displayArr.join("");
  };

  const isCellComplete = (colIdx, rowIdx) => {
    const type = selections[colIdx][rowIdx] || "straight";
    const digits = numbers[colIdx][rowIdx] || ["", "", ""];

    // A cell is complete when all non-disabled positions are filled with a digit
    for (let i = 0; i < 3; i++) {
      if (!isDisabled(type, i)) {
        if (!digits[i] || digits[i] === "") return false;
      }
    }
    return true;
  };

  // direction: "left" | "right" | "up" | "down"
const focusAt = (col, row, inputIdx) => {
  const ref = inputRefs.current?.[col]?.[row]?.[inputIdx];
  if (ref && typeof ref.focus === "function") ref.focus();
};

// find the next enabled input cell in the given direction, skipping disabled inputs
const findNextEnabled = (startCol, startRow, startInputIdx, direction) => {
  let col = startCol;
  let row = startRow;
  let inputIdx = startInputIdx;

  const step = () => {
    if (direction === "right") {
      inputIdx++;
      if (inputIdx >= 3) {
        inputIdx = 0;
        row++;
        if (row >= NUM_ROWS) {
          row = 0;
          col++;
          if (col >= NUM_COLS) return null;
        }
      }
    } else if (direction === "left") {
      inputIdx--;
      if (inputIdx < 0) {
        inputIdx = 2;
        row--;
        if (row < 0) {
          row = NUM_ROWS - 1;
          col--;
          if (col < 0) return null;
        }
      }
    } else if (direction === "down") {
      row++;
      if (row >= NUM_ROWS) {
        row = 0;
        col++;
        if (col >= NUM_COLS) return null;
      }
    } else if (direction === "up") {
      row--;
      if (row < 0) {
        row = NUM_ROWS - 1;
        col--;
        if (col < 0) return null;
      }
    }
    return { col, row, inputIdx };
  };

  // attempt at most NUM_COLS * NUM_ROWS * 3 steps to avoid infinite loops
  const maxSteps = NUM_COLS * NUM_ROWS * 3;
  for (let i = 0; i < maxSteps; i++) {
    const next = step();
    if (!next) return null;
    const { col: c, row: r, inputIdx: idx } = next;
    // check bounds
    if (!inputRefs.current?.[c] || !inputRefs.current[c][r]) continue;
    // check disabled by using your isDisabled(selection, inputIdx)
    const type = selections?.[c]?.[r] ?? "straight";
    if (isDisabled(type, idx)) continue;
    // ensure ref exists
    const ref = inputRefs.current[c][r][idx];
    if (ref) return { col: c, row: r, inputIdx: idx };
  }
  return null;
};

const handleBuyClick = async () => {
  try {
    const token = localStorage.getItem("userToken");
    if (!token) {
      alert("User not logged in!");
      return;
    }

    const decoded = jwtDecode(token);
    const loginId = decoded?.id || decoded?.userId || "unknown";

    // Load final aggregated tickets
    const tickets = loadLocal();

    if (tickets.length === 0) {
      alert("No tickets found to submit!");
      return;
    }

    const totalQuantity = tickets.reduce((sum, t) => sum + t.quantity, 0);
    const totalPoints = tickets.reduce((sum, t) => sum + t.rate, 0);

    const payload = {
      gameTime: new Date().toISOString(),
      loginId,
      ticketNumbers: tickets,
      range: parseInt(rate),
      totalQuantity,
      totalPoints,
    };

    console.log("Posting:", payload);

    const res = await axios.post(
      `${process.env.NEXT_PUBLIC_API_BASE_URL}/save-threed`,
      payload
    );

    alert("Saved Successfully!");
    handleReset();

  } catch (error) {
    console.error("Buy Error:", error);
    alert("Failed to save!");
  }
};



  // ------------------------------ GRID TYPE CHANGE -------------------------------
  const handleSelectionChangeGrid = (colIdx, rowIdx, value) => {
    // update selection type
    setSelections((prev) => {
      const copy = prev.map((col) => col.slice());
      copy[colIdx][rowIdx] = value;
      return copy;
    });

    // Clear any inputs that are now disabled and clear recorded rate if cell becomes incomplete
    setNumbers((prevNums) => {
      const copy = prevNums.map((col) => col.map((r) => r.slice()));
      const disabledIdx = [0, 1, 2].filter((i) => isDisabled(value, i));
      disabledIdx.forEach((i) => {
        copy[colIdx][rowIdx][i] = "";
      });

      // If after disabling the cell becomes incomplete, also clear ratesPerCell for it
      const joined = copy[colIdx][rowIdx].join("");
      if (!isCellComplete(colIdx, rowIdx)) {
        setRatesPerCell((prevRates) => {
          const rcopy = prevRates.map((c) => c.slice());
          rcopy[colIdx][rowIdx] = null;
          return rcopy;
        });
      }

      return copy;
    });
  };

  // ------------------------------ AUTO FOCUS -------------------------------
  const moveToNext = (colIdx, rowIdx, inputIdx) => {
    let nc = colIdx,
      nr = rowIdx,
      ni = inputIdx + 1;

    if (ni >= 3) {
      ni = 0;
      nr++;
      if (nr >= NUM_ROWS) {
        nr = 0;
        nc++;
        if (nc >= NUM_COLS) return;
      }
    }

    const nextRef = inputRefs.current[nc][nr][ni];
    if (nextRef) nextRef.focus();
  };

  const moveToPrevious = (colIdx, rowIdx, inputIdx) => {
    let pc = colIdx,
      pr = rowIdx,
      pi = inputIdx - 1;

    if (pi < 0) {
      pi = 2;
      pr--;
      if (pr < 0) {
        pr = NUM_ROWS - 1;
        pc--;
        if (pc < 0) return;
      }
    }

    const prevRef = inputRefs.current[pc][pr][pi];
    if (prevRef) prevRef.focus();
  };

  // ------------------------------ DIGIT INPUT -------------------------------
  const handleNumberChange = (colIdx, rowIdx, inputIdx, rawValue) => {
    const digit = rawValue.replace(/\D/g, "").slice(-1);
    if (!digit) return;

    setNumbers((prev) => {
      const copy = prev.map((c) => c.map((r) => r.slice()));
      copy[colIdx][rowIdx][inputIdx] = digit;
      return copy;
    });

    moveToNext(colIdx, rowIdx, inputIdx);
  };

const handleKeyDown = (colIdx, rowIdx, inputIdx, e) => {
  // Backspace logic (keep your existing behaviour)
  if (e.key === "Backspace") {
    e.preventDefault();
    setNumbers((prev) => {
      const copy = prev.map((c) => c.map((r) => r.slice()));
      if (copy[colIdx][rowIdx][inputIdx]) {
        // clear the current digit
        copy[colIdx][rowIdx][inputIdx] = "";
        // clear recorded rate for that cell
        setRatesPerCell((prevRates) => {
          const rcopy = prevRates.map((c) => c.slice());
          rcopy[colIdx][rowIdx] = null;
          return rcopy;
        });
        // keep focus on this input (optional) OR move to previous
        focusAt(colIdx, rowIdx, inputIdx);
      } else {
        // if empty, move to previous input
        const prev = findNextEnabled(colIdx, rowIdx, inputIdx, "left");
        if (prev) focusAt(prev.col, prev.row, prev.inputIdx);
      }
      return copy;
    });
    return;
  }

  // Arrow navigation
  if (e.key === "ArrowRight" || e.key === "Right") {
    e.preventDefault();
    const next = findNextEnabled(colIdx, rowIdx, inputIdx, "right");
    if (next) focusAt(next.col, next.row, next.inputIdx);
    return;
  }
  if (e.key === "ArrowLeft" || e.key === "Left") {
    e.preventDefault();
    const next = findNextEnabled(colIdx, rowIdx, inputIdx, "left");
    if (next) focusAt(next.col, next.row, next.inputIdx);
    return;
  }
  if (e.key === "ArrowDown" || e.key === "Down") {
    e.preventDefault();
    const next = findNextEnabled(colIdx, rowIdx, inputIdx, "down");
    if (next) focusAt(next.col, next.row, next.inputIdx);
    return;
  }
  if (e.key === "ArrowUp" || e.key === "Up") {
    e.preventDefault();
    const next = findNextEnabled(colIdx, rowIdx, inputIdx, "up");
    if (next) focusAt(next.col, next.row, next.inputIdx);
    return;
  }
};


  // ------------------------------ WHEN CELL BECOMES COMPLETE -------------------------------
  // Set per-cell rate at the moment cell is completed
  useEffect(() => {
    setRatesPerCell((prevRates) => {
      const rcopy = prevRates.map((c) => c.slice());
      for (let c = 0; c < NUM_COLS; c++) {
        for (let r = 0; r < NUM_ROWS; r++) {
          const complete = isCellComplete(c, r);
          if (complete && rcopy[c][r] == null) {
            // record rate at completion time
            rcopy[c][r] = parseInt(rate, 10);
          }
          // if cell becomes incomplete, clear the stored rate
          if (!complete && rcopy[c][r] != null) {
            rcopy[c][r] = null;
          }
        }
      }
      return rcopy;
    });
    // include rate in deps so if user changes rate before completion it's applied
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [numbers, selections, rate]);

  // ------------------------------ AGGREGATE TICKETS AND SAVE TO LOCAL -------------------------------
  const computeAggregatedTickets = (nums, sel, ratesGrid) => {
    const map = new Map(); // key: `${displayNumber}|${code}` -> aggregated object
    for (let c = 0; c < NUM_COLS; c++) {
      for (let r = 0; r < NUM_ROWS; r++) {
        // build display number with 'x' for disabled positions
        const type = sel[c][r] || "straight";
        if (!ratesGrid?.[c]?.[r]) continue; // only consider cells that have a recorded rate (completed)
        const cellRate = ratesGrid[c][r];
        // Build display number array
        const digits = nums[c][r] || ["", "", ""];
        const displayArr = [0, 1, 2].map((i) =>
          isDisabled(type, i) ? "x" : digits[i] || ""
        );
        // Determine if non-disabled positions are filled (safety)
        const filledAll = [0, 1, 2].every(
          (i) => isDisabled(type, i) || (digits[i] && digits[i] !== "")
        );
        if (!filledAll) continue;

        const display = displayArr.join("");
        const code = typeToCode[type] || "STR";
        const key = `${display}|${code}`;

        if (!map.has(key)) {
          map.set(key, {
            number: display,
            type: code,
            quantity: 1,
            rate: cellRate,
          });
        } else {
          const obj = map.get(key);
          obj.quantity += 1;
          obj.rate += cellRate; // sum the per-occurrence rates
          map.set(key, obj);
        }
      }
    }
    return Array.from(map.values());
  };

  // Whenever numbers, selections or ratesPerCell change, recompute and save to localStorage
  useEffect(() => {
    const aggregated = computeAggregatedTickets(numbers, selections, ratesPerCell);
    saveLocal(aggregated);
  }, [numbers, selections, ratesPerCell]);

  // ------------------------------ RESET -------------------------------
  const handleReset = () => {
    setSelections(
      Array.from({ length: NUM_COLS }, () => Array(NUM_ROWS).fill("straight"))
    );

    setNumbers(
      Array.from({ length: NUM_COLS }, () =>
        Array.from({ length: NUM_ROWS }, () => ["", "", ""])
      )
    );

    setRatesPerCell(
      Array.from({ length: NUM_COLS }, () =>
        Array.from({ length: NUM_ROWS }, () => null)
      )
    );

    localStorage.removeItem(LOCAL_KEY);
    setBarcode("");
  };

  // ------------------------------ GRAND TOTAL -------------------------------
  const grandTotal = useMemo(() => {
    const data = loadLocal();
    return data.reduce((sum, x) => sum + (Number(x.rate) || 0), 0);
  }, [numbers, selections, ratesPerCell]);

  // ------------------------------ UI -------------------------------
  return (
    <div className="w-full max-w-full mt-6 space-y-6 px-1">
      {/* -------- TOP CONTROLS ---------- */}
      <div className="rounded-xl bg-white/6 border border-white/10 backdrop-blur-sm p-3">
        <div className="flex flex-wrap items-center gap-4 px-3 py-2 w-full">
          <select
            value={selection}
            onChange={handleSelectionChangeTop}
            className="min-w-[180px] bg-gray-900/30 text-white text-sm rounded-md px-4 py-2 border border-white/10"
          >
            <option value="all">All Selection</option>
            <option value="odds">Odds</option>
            <option value="evens">Evens</option>
            <option value="high">High</option>
            <option value="low">Low</option>
          </select>

          <div className="flex items-center gap-3 flex-1">
            <span className="text-sm text-gray-200">LUCKY PICK</span>
            <select
              value={pick}
              onChange={handlePickChange}
              className="min-w-[160px] bg-gray-900/30 text-white text-sm rounded-md px-4 py-2 border border-white/10"
            >
              {selectionOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <input
            value={quantity}
            onChange={handleQuantityChange}
            placeholder="Enter Quantity"
            className="min-w-[140px] bg-white/5 placeholder-gray-300 text-white text-sm rounded-md px-4 py-2 border border-white/10"
          />

          <div className="flex items-center gap-3 ml-auto">
            <span className="text-sm text-gray-200">Rates:</span>
            {["10", "20", "50", "100", "200", "500"].map((r) => (
              <label key={r} className="flex items-center gap-1 cursor-pointer">
                <input
                  type="radio"
                  name="rate"
                  value={r}
                  checked={rate === r}
                  onChange={() => handleRateChange(r)}
                  className="w-4 h-4 accent-blue-500"
                />
                <span className={rate === r ? "text-white font-semibold" : "text-gray-300"}>
                  {r}
                </span>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* -------- GRID SECTION ---------- */}
      <div className="rounded-sm bg-white/6 w-full backdrop-blur-sm p-2 ">
        <div className="grid md:grid-cols-4 lg:grid-cols-6 sm:grid-cols-2 gap-2">
          {Array.from({ length: NUM_COLS }).map((_, colIdx) => (
            <div key={`col-${colIdx}`} className="flex flex-col gap-3 w-full">
              {Array.from({ length: NUM_ROWS }).map((__, rowIdx) => {
                const type = selections[colIdx][rowIdx];

                return (
                  <div
                    key={`row-${colIdx}-${rowIdx}`}
                    className="flex items-center gap-3 w-full"
                  >
                    <div className="bg-yellow-50/90 rounded p-0.5 flex-shrink-0 max-w-full border-1">
                      <select
                        value={type}
                        onChange={(e) =>
                          handleSelectionChangeGrid(colIdx, rowIdx, e.target.value)
                        }
                        className="w-15 text-xs rounded px-1 py-0.5 border border-yellow-200 outline-none bg-yellow-50 text-slate-800"
                      >
                        {selectionOptions.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Entry Boxes */}
                    <div className="flex gap-0.5">
                      {[0, 1, 2].map((inputIdx) => (
                        <input
                          key={`inp-${colIdx}-${rowIdx}-${inputIdx}`}
                          
                          ref={(el) =>
                            (inputRefs.current[colIdx][rowIdx][inputIdx] = el)
                          }
                          value={numbers[colIdx][rowIdx][inputIdx]}
                          onChange={(e) =>
                            handleNumberChange(colIdx, rowIdx, inputIdx, e.target.value)
                          }
                          onKeyDown={(e) => handleKeyDown(colIdx, rowIdx, inputIdx, e)}
                          inputMode="numeric"
                          maxLength={1}
                          disabled={isDisabled(type, inputIdx)}
                          className={`w-8 h-8 outline-none text-center rounded border text-xs ${
                            isDisabled(type, inputIdx)
                              ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                              : "bg-white text-slate-700 border-gray-300"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* -------- BOTTOM ---------- */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <label htmlFor="barcode" className="text-sm text-white">
            Barcode:
          </label>
          <input
            id="barcode"
            value={barcode}
            onChange={(e) => setBarcode(e.target.value)}
            placeholder="Barcode"
            className="px-3 py-1.5 border border-gray-300 rounded-l-md text-sm"
          />
          <button className="px-3 py-1.5 bg-purple-700 text-white rounded-r-md hover:bg-purple-800">
            🔍
          </button>
        </div>

        <div className="flex items-center gap-3 bg-yellow-50/90 border border-yellow-200 rounded px-4 py-2">
          <span className="text-gray-800 font-semibold">Grand Total:</span>
          <span className="text-black font-bold">{grandTotal}</span>
        </div>
      </div>

      {/* Buttons */}
      <div className="flex justify-center gap-4 mb-6">
        <button
          onClick={handleReset}
          className="px-6 py-2 bg-gray-300 text-gray-800 rounded-md shadow hover:bg-gray-400 transition"
        >
          Reset
        </button>
          <button
            onClick={handleBuyClick}
            className="px-6 py-2 bg-green-600 text-white rounded-md shadow hover:bg-green-700 transition"
          >
            Buy
          </button>
      </div>
    </div>
  );
}
