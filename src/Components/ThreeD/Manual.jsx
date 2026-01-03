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

  const handleSelectionChangeTop = (e) => {
    const value = e.target.value;
    setSelection(value);
    
    // If the selection is not "all", apply it to all grid cells
    if (value !== "all") {
      setSelections(prev =>
        prev.map(col => col.map(() => value))
      );
    }
  };

  const handlePickChange = (e) => setPick(e.target.value);

  const handleQuantityChange = (e) => {
    const raw = e.target.value.replace(/\D/g, "");
    setQuantity(raw.slice(0, 3)); // Allow only 3 digits for lucky pick
  };

  const handleRateChange = (value) => setRate(value);

  // ------------------------------ LUCKY PICK FUNCTIONALITY -------------------------------
  const applyLuckyPick = () => {
    if (!quantity || quantity.length !== 3) {
      alert("Please enter a valid 3-digit number for Lucky Pick");
      return;
    }

    // Convert quantity string to digits array for display building
    const digits = quantity.split("");

    // Build display number with 'x' for disabled positions according to pick type
    const displayArr = [0, 1, 2].map((i) =>
      isDisabled(pick, i) ? "x" : digits[i] || ""
    );
    const display = displayArr.join("");

    const code = typeToCode[pick] || "STR";

    // For compatibility with existing stored format:
    // stored.ticket.rate is totalPoints for that ticket (quantity * perUnitRate)
    const perUnitRate = parseInt(rate, 10) || 0;
    const qtyNumber = Number(quantity);

    const newTicket = {
      number: display,
      type: code,
      quantity: qtyNumber, // for lucky pick this is the numeric 3-digit value
      rate: qtyNumber * perUnitRate, // total points for this ticket
    };

    // merge into existing storage (combine same number+type)
    const existing = loadLocal();
    const key = `${newTicket.number}|${newTicket.type}`;
    let merged = [...existing];
    let found = false;
    for (let i = 0; i < merged.length; i++) {
      const t = merged[i];
      const k = `${t.number}|${t.type}`;
      if (k === key) {
        // add quantities and add total-points (rate) to keep same stored format
        merged[i] = {
          ...t,
          quantity: Number(t.quantity || 0) + newTicket.quantity,
          rate: Number(t.rate || 0) + newTicket.rate,
        };
        found = true;
        break;
      }
    }
    if (!found) merged.push(newTicket);

    saveLocal(merged);
  };

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

  // keep an in-memory copy so UI re-renders when storage changes
  const [localTickets, setLocalTickets] = useState(() => loadLocal());

  const saveLocal = (data) => {
    try {
      localStorage.setItem(LOCAL_KEY, JSON.stringify(data));
      setLocalTickets(data); // update state so React re-renders grand total etc.
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

  const topSelectionOptions = [
    { value: "all", label: "All Selection" },
    ...selectionOptions
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

  // Whenever numbers, selections or ratesPerCell change, recompute aggregated tickets
  // and merge them into existing saved tickets (don't overwrite lucky picks)
  useEffect(() => {
    const aggregated = computeAggregatedTickets(numbers, selections, ratesPerCell);

    // load existing saved tickets and merge aggregated into them
    const existing = loadLocal();
    const map = new Map();

    // add existing into map by key
    existing.forEach((t) => {
      const key = `${t.number}|${t.type}`;
      map.set(key, { ...t });
    });

    // merge aggregated (aggregated entries use same format: {number,type,quantity,rate})
    aggregated.forEach((a) => {
      const key = `${a.number}|${a.type}`;
      if (!map.has(key)) {
        map.set(key, { ...a });
      } else {
        const prev = map.get(key);
        map.set(key, {
          ...prev,
          quantity: Number(prev.quantity || 0) + Number(a.quantity || 0),
          rate: Number(prev.rate || 0) + Number(a.rate || 0),
        });
      }
    });

    const merged = Array.from(map.values());
    saveLocal(merged);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [numbers, selections, ratesPerCell]);


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
    setLocalTickets([]);
    setBarcode("");
    setQuantity("");
  };

  // ------------------------------ GRAND TOTAL -------------------------------
  const grandTotal = useMemo(() => {
    // localTickets is kept in state and updated via saveLocal
    return (localTickets || []).reduce((sum, x) => sum + (Number(x.rate) || 0), 0);
  }, [localTickets]);


  // ------------------------------ UI -------------------------------
  return (
    <div className="w-full max-w-full mt-6 space-y-6 px-1 ">
      {/* -------- TOP CONTROLS ---------- */}
      <div className="rounded-xl bg-gradient-to-r from-gray-800 to-gray-900 border-2 border-gray-700 shadow-lg p-4">
        <div className="flex flex-wrap items-center gap-4 px-3 py-2 w-full">
          {/* Left Selection Dropdown */}
          <div className="flex flex-col min-w-[200px]">
            <label className="text-sm text-gray-300 mb-1 font-medium">SELECTION</label>
            <select
              value={selection}
              onChange={handleSelectionChangeTop}
              className="bg-gray-900/80 text-white text-sm rounded-lg px-4 py-3 border-2 border-gray-600 hover:border-blue-500 transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {topSelectionOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Lucky Pick Section */}
          <div className="flex flex-col flex-1">
            <label className="text-sm text-gray-300 mb-1 font-medium">LUCKY PICK</label>
            <div className="flex items-center gap-3">
              <select
                value={pick}
                onChange={handlePickChange}
                className="bg-gray-900/80 text-white text-sm rounded-lg px-4 py-3 border-2 border-gray-600 hover:border-purple-500 transition-all duration-200 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 min-w-[160px]"
              >
                {selectionOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              
              <div className="relative flex items-center">
                <input
                  value={quantity}
                  onChange={handleQuantityChange}
                  placeholder="Enter 3-digit number"
                  className="bg-gray-900/80 placeholder-gray-400 text-white text-sm rounded-lg px-4 py-3 border-2 border-gray-600 hover:border-purple-500 transition-all duration-200 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 w-48"
                  maxLength={3}
                />
                <button
                  onClick={applyLuckyPick}
                  className="ml-2 px-4 py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg border-2 border-purple-500 hover:from-purple-700 hover:to-purple-800 active:border-b-0 active:mt-[2px] transition-all duration-150 font-medium shadow-md"
                >
                  Apply
                </button>
              </div>
            </div>
          </div>

          {/* Rates Section */}
          <div className="flex flex-col ml-auto">
            <label className="text-sm text-gray-300 mb-1 font-medium">RATES</label>
            <div className="flex items-center gap-3 bg-gray-900/80 rounded-lg p-2 border-2 border-gray-600">
              {["10", "20", "50", "100", "200", "500"].map((r) => (
                <label key={r} className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="radio"
                    name="rate"
                    value={r}
                    checked={rate === r}
                    onChange={() => handleRateChange(r)}
                    className="w-5 h-5 accent-blue-500 cursor-pointer"
                  />
                  <span className={`text-sm font-medium group-hover:text-white transition-colors ${
                    rate === r 
                      ? "text-white bg-blue-600 px-2 py-1 rounded" 
                      : "text-gray-400"
                  }`}>
                    {r}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* -------- GRID SECTION ---------- */}
      <div className="rounded-xl bg-gradient-to-b from-gray-800/40 to-gray-900/20 border-2 border-gray-700 shadow-xl p-2">
        <div className="grid md:flex lg:flex sm:grid-cols-2 gap-3">
          {Array.from({ length: NUM_COLS }).map((_, colIdx) => (
            <div key={`col-${colIdx}`} className="flex flex-col gap-3 w-full">
              {Array.from({ length: NUM_ROWS }).map((__, rowIdx) => {
                const type = selections[colIdx][rowIdx];
                const cellComplete = isCellComplete(colIdx, rowIdx);

                return (
                  <div
                    key={`row-${colIdx}-${rowIdx}`}
                    className={`flex items-center gap-3 w-fit p-1 rounded-lg ${cellComplete ? 'bg-green-900/20 border border-green-700/30' : 'bg-gray-900/10 hover:bg-gray-800/60 border border-gray-700/50'}`}
                  >
                    <div className="">
                      <select
                        value={type}
                        onChange={(e) =>
                          handleSelectionChangeGrid(colIdx, rowIdx, e.target.value)
                        }
                        className="w-20 text-xs font-medium rounded-md border-b-4 border-gray-600/80 outline-none bg-white text-gray-800 py-2 transition-all"
                      >
                        {selectionOptions.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Entry Boxes */}
                    <div className="flex gap-1">
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
                          className={`w-10 h-10 outline-none text-center rounded-lg border-2 text-sm font-bold transition-all duration-150 ${
                            isDisabled(type, inputIdx)
                              ? "bg-gray-800 text-gray-500 cursor-not-allowed border-gray-700"
                              : cellComplete
                                ? "bg-green-100 text-green-800 border-green-400 focus:ring-2 focus:ring-green-400"
                                : "bg-white text-gray-800 border-gray-400 hover:border-blue-400 focus:ring-2 focus:ring-blue-400 focus:border-blue-500"
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

      {/* -------- BOTTOM SECTION ---------- */}
      <div className="flex justify-between items-center bg-gradient-to-r from-gray-800 to-gray-900 rounded-xl border-2 border-gray-700 p-4 shadow-lg">
        {/* Barcode Section */}
        <div className="flex items-center gap-2">
          <label htmlFor="barcode" className="text-sm text-gray-300 font-medium">
            BARCODE:
          </label>
          <div className="flex">
            <input
              id="barcode"
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              placeholder="Scan or enter barcode"
              className="px-4 py-2.5 border-2 border-r-0 border-gray-600 rounded-l-lg bg-gray-900/80 text-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all w-64"
            />
            <button className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-r-lg border-2 border-purple-500 hover:from-purple-700 hover:to-purple-800 active:border-b-0 active:mt-[2px] transition-all duration-150 font-medium">
              🔍 Scan
            </button>
          </div>
        </div>

        {/* Grand Total Display */}
        <div className="flex items-center gap-3 bg-gradient-to-r from-amber-100 to-yellow-100 border-2 border-amber-300 rounded-lg px-6 py-3 shadow-lg">
          <span className="text-gray-800 font-bold text-lg">GRAND TOTAL:</span>
          <span className="text-2xl font-extrabold text-gray-900">{grandTotal}</span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-center gap-6 mb-8">
        <button
          onClick={handleReset}
          className="px-8 py-3.5 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-xl border-b-4 border-gray-800 hover:from-gray-700 hover:to-gray-800 active:border-b-0 active:mt-[4px] transition-all duration-150 font-bold text-lg shadow-lg"
        >
          ↻ Reset All
        </button>
        
        <button
          onClick={handleBuyClick}
          className="px-8 py-3.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl border-b-4 border-emerald-800 hover:from-green-700 hover:to-emerald-700 active:border-b-0 active:mt-[4px] transition-all duration-150 font-bold text-lg shadow-lg"
        >
          💳 Buy Tickets
        </button>
        
      </div>
    </div>
  );
}