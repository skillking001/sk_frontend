"use client";

import React, { useState, useEffect } from "react";
import axios from "axios";
import {jwtDecode} from "jwt-decode"; 
import jsPDF from "jspdf";
import JsBarcode from "jsbarcode";

const Automatic = () => {
  const spots = ["STR", "BOX", "FP", "BP", "SP", "AP"];

  const checkboxLabels = {
    STRAIGHT: "STR",
    BOX: "BOX",
    "FRONT PAIR": "FP",
    "BACK PAIR": "BP",
    "SPLIT PAIR": "SP",
    "ANY PAIR": "AP",
  };

  const allCheckboxNames = [
    "ALL",
    ...Object.keys(checkboxLabels),
  ];

  // ------------------------- STATES ----------------------------
  const [checks, setChecks] = useState(
    allCheckboxNames.reduce((acc, cur) => ({ ...acc, [cur]: false }), {})
  );

  const [selectedRate, setSelectedRate] = useState(10);
  const [numberInput, setNumberInput] = useState("");

  const [entries, setEntries] = useState([]);

  const [spotData, setSpotData] = useState(
    spots.reduce((acc, s) => ({ ...acc, [s]: { qty: 0, rs: 0 } }), {})
  );

  const [isBuying, setIsBuying] = useState(false);

// helper to aggregate entries -> ticketNumbers expected by controller
const aggregateTicketNumbers = (entries) => {
  // key by number|type
  const map = new Map();
  entries.forEach((e) => {
    const key = `${e.number}|${e.type}`;
    const qty = Number(e.quantity) || 1;
    const rate = Number(e.rate) || 0;
    if (!map.has(key)) {
      map.set(key, {
        number: e.number,
        type: e.spot || e.type || e.type, // keep type/spot shape you use
        quantity: qty,
        rate: rate,
      });
    } else {
      const obj = map.get(key);
      obj.quantity += qty;
      obj.rate += rate;
    }
  });
  return Array.from(map.values());
};


  // ------------------- LOAD FROM LOCAL STORAGE -------------------
  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem("tickets") || "[]");
    if (saved.length > 0) {
      setEntries(saved);
      const updated = spots.reduce(
        (acc, s) => ({ ...acc, [s]: { qty: 0, rs: 0 } }),
        {}
      );
      saved.forEach((t) => {
        updated[t.spot].qty += 1;
        updated[t.spot].rs += t.rate;
      });
      setSpotData(updated);
    }
  }, []);

const formatNumberByType = (num, spot) => {
  if (!num || num.length !== 3) return num;

  const [a, b, c] = num.split("");

  switch (spot) {
    case "STR":
      return `${a}${b}${c}`;

    case "FP":
      return `${a}${b}*`;

    case "BP":
      return `*${b}${c}`;

    case "SP":
      return `${a}*${c}`;

    case "AP":
      return `**${c}`; // optional rule, adjust if needed

    case "BOX":
      return `${a}${b}${c}`;

    default:
      return num;
  }
};

  // ---------------------- CHECKBOX LOGIC ------------------------
  const handleCheck = (label) => {
    if (label === "ALL") {
      const newState = {};
      allCheckboxNames.forEach((l) => (newState[l] = !checks["ALL"]));
      setChecks(newState);
      return;
    }
    const updated = { ...checks, [label]: !checks[label] };
    const allChecked = Object.keys(checkboxLabels)
      .every((l) => updated[l]);
    updated["ALL"] = allChecked;
    setChecks(updated);
  };

const autoAddNumber = (val) => {
  const selectedSpots = Object.keys(checkboxLabels).filter((l) => checks[l]);
  if (selectedSpots.length === 0) return;

  let newEntries = [...entries];
  let updatedSpots = { ...spotData };

  selectedSpots.forEach((label) => {
    const spotKey = checkboxLabels[label];

    const formattedNumber = formatNumberByType(val, spotKey);

    const entry = {
      id: Date.now() + Math.random(),
      number: formattedNumber,   // ✅ formatted number
      type: label,
      spot: spotKey,
      rate: selectedRate,
      quantity: 1,
    };

    newEntries.push(entry);
    updatedSpots[spotKey].qty += 1;
    updatedSpots[spotKey].rs += selectedRate;
  });

  setEntries(newEntries);
  setSpotData(updatedSpots);
  setNumberInput("");
  localStorage.setItem("tickets", JSON.stringify(newEntries));
};


  // ---------------------- ADD NUMBER LOGIC ----------------------
  const handleNumberChange = (e) => {
    const val = e.target.value;
    if (/^\d{0,3}$/.test(val)) setNumberInput(val);

    setNumberInput(val);

    if(val.length === 3) {
      autoAddNumber(val);
    }

  };

  // this logic is not seems to work
const handleAddNumber = () => {}; 


const generateAutomaticReceipt = (data, ticketId) => {
  return new Promise((resolve) => {
    const lineHeight = 5;
    const rows = data.lines.length;

    const afterListLineGap = 6;
    const totalsBlock = 15;
    const barcodeBlock = 30;

    const requiredHeight =
      60 + rows * lineHeight + afterListLineGap + totalsBlock + barcodeBlock;

    const pageHeight = Math.max(297, requiredHeight);

    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: [80, pageHeight],
    });

    /* ---------- HEADER ---------- */
    pdf.setFontSize(10);
    pdf.text("SKILL KING", 40, 10, { align: "center" });
    pdf.setFontSize(8);
    pdf.text("Automatic Ticket Receipt", 40, 15, { align: "center" });
    pdf.text(`Date: ${data.gameTime}`, 40, 20, { align: "center" });

    pdf.setLineWidth(0.5);
    pdf.line(5, 25, 75, 25);

    pdf.setFontSize(9);
    pdf.text(`Login Id: ${data.loginId}`, 5, 30);

    pdf.line(5, 33, 75, 33);

    /* ---------- TICKET LINES ---------- */
    let yPos = 38;
    pdf.setFontSize(8);

    data.lines.forEach((line) => {
      pdf.text(`${line.label} : ${line.amount}`, 5, yPos);
      yPos += lineHeight;
    });

    pdf.line(5, yPos, 75, yPos);
    yPos += 6;

    /* ---------- TOTAL ---------- */
    pdf.setFontSize(10);
    pdf.text(`TOTAL AMOUNT : ${data.totalAmount}`, 5, yPos);
    yPos += 10;

    /* ---------- BARCODE ---------- */
    const canvas = document.createElement("canvas");
    JsBarcode(canvas, String(ticketId), {
      format: "CODE128",
      width: 2,
      height: 50,
      displayValue: false,
      margin: 5,
    });

    const barcodeImage = canvas.toDataURL("image/png");
    pdf.addImage(barcodeImage, "PNG", 10, yPos, 60, 20);

    pdf.setFontSize(12);
    pdf.text(`SK${ticketId}`, 40, yPos + 28, { align: "center" });

    /* ---------- PRINT ---------- */
    pdf.autoPrint();
    const pdfBlob = pdf.output("blob");
    const pdfUrl = URL.createObjectURL(pdfBlob);

    const printFrame = document.createElement("iframe");
    printFrame.style.display = "none";
    document.body.appendChild(printFrame);

    printFrame.onload = () => {
      printFrame.contentWindow.print();
      setTimeout(() => {
        document.body.removeChild(printFrame);
        URL.revokeObjectURL(pdfUrl);
        resolve();
      }, 5000);
    };

    printFrame.src = pdfUrl;
  });
};


const handleBuy = async () => {
  try {
    if (entries.length === 0) {
      alert("No entries to buy");
      return;
    }

    setIsBuying(true);

    /* ---------- GET LOGIN ID ---------- */
    let loginId = "unknown";
    try {
      const token = localStorage.getItem("userToken");
      if (token) {
        const decoded = jwtDecode(token);
        loginId = decoded?.id || decoded?.userId || loginId;
      }
    } catch {
      console.warn("JWT decode failed");
    }

    /* ---------- AGGREGATE ENTRIES ---------- */
    const ticketNumbers = aggregateTicketNumbers(entries);

    const totalQuantity = ticketNumbers.reduce(
      (sum, t) => sum + (Number(t.quantity) || 0),
      0
    );

    const totalPoints = ticketNumbers.reduce(
      (sum, t) => sum + (Number(t.rate) || 0),
      0
    );

    /* ---------- BACKEND PAYLOAD ---------- */
    const payload = {
      gameTime: new Date().toISOString(),
      loginId,
      ticketNumbers,
      range: Number(selectedRate || 10),
      totalQuantity,
      totalPoints: String(totalPoints),
    };

    const urlBase = process.env.NEXT_PUBLIC_API_BASE_URL || "";
    const response = await axios.post(`${urlBase}/save-threed`, payload);

    /* ---------- EXTRACT TICKET ID ---------- */
    const ticketId =
      response?.data?.ticket?.id ||
      response?.data?.ticketId ||
      Date.now();

    /* ---------- BUILD PRINT LINES ---------- */
    const printLines = ticketNumbers.map((t) => ({
      label: `${t.type}-${String(t.number).toUpperCase()}`,
      amount: Number(t.rate) || 0,
    }));

    const printTotalAmount = printLines.reduce(
      (sum, l) => sum + l.amount,
      0
    );

    /* ---------- PRINT RECEIPT ---------- */
    await generateAutomaticReceipt(
      {
        gameTime: new Date().toLocaleString(),
        loginId,
        lines: printLines,
        totalAmount: printTotalAmount,
      },
      ticketId
    );

    /* ---------- RESET UI AFTER PRINT ---------- */
    setEntries([]);
    setSpotData(
      spots.reduce(
        (acc, s) => ({ ...acc, [s]: { qty: 0, rs: 0 } }),
        {}
      )
    );

    localStorage.removeItem("tickets");

    alert("Tickets saved & printed successfully!");

  } catch (error) {
    console.error("BUY ERROR:", error);
    alert(
      error?.response?.data?.message ||
      error?.message ||
      "Failed to save tickets"
    );
  } finally {
    setIsBuying(false);
  }
};


  // ---------------------- REMOVE ENTRY ---------------------------
  const removeEntry = (id, spot) => {
    const entry = entries.find((e) => e.id === id);
    const updatedEntries = entries.filter((e) => e.id !== id);
    const updatedSpot = { ...spotData };
    updatedSpot[spot].qty -= 1;
    updatedSpot[spot].rs -= entry.rate;
    setEntries(updatedEntries);
    setSpotData(updatedSpot);
    localStorage.setItem("tickets", JSON.stringify(updatedEntries));
  };

  // ---------------------- TOTALS ---------------------------
  const grandTotal = Object.values(spotData).reduce(
    (sum, s) => sum + s.rs,
    0
  );

  return (
    <div className="w-full h-4xl bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 backdrop-blur-md border border-purple-500/30 rounded-lg p-3 shadow-2xl text-white overflow-hidden flex flex-col">


      {/* =========== SINGLE ROW CONTROLS =========== */}
      <div className="bg-gray-800/40 border border-gray-600 rounded-lg p-2 mb-2 flex-shrink-0">
        <div className="flex items-center gap-4 justify-between">
          
          {/* BET TYPES - Compact horizontal */}
          <div className="flex items-center gap-4">
            <span className="text-xs font-semibold text-gray-300 whitespace-nowrap">BET TYPE:</span>
            <div className="flex flex-wrap gap-1">
              {allCheckboxNames.map((label, idx) => (
                <label key={idx} className="flex items-center gap-1 cursor-pointer">
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={checks[label]}
                      onChange={() => handleCheck(label)}
                      className="w-3 h-3 appearance-none border border-gray-500 rounded checked:border-blue-400 checked:bg-blue-400 transition-all cursor-pointer"
                    />
                    {checks[label] && (
                      <div className="absolute inset-0 flex items-center justify-center text-white text-[8px]">
                        ✓
                      </div>
                    )}
                  </div>
                  <span className="text-xs text-gray-200 whitespace-nowrap">{label}</span>
                </label>
              ))}
            </div>
          </div>

                    {/* NUMBER INPUT - Compact */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-300 whitespace-nowrap">ADD NUMBER:</span>
            <input
              value={numberInput}
              onChange={handleNumberChange}
              onKeyDown={handleAddNumber}
              className="w-20 bg-gray-700 border border-gray-600 text-white font-bold px-2 py-1 rounded focus:border-blue-400 focus:ring-1 focus:ring-blue-400 transition-all text-center text-sm tracking-widest"
              placeholder="000"
              maxLength={3}
            />
          </div>

          {/* RATES - Compact */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-300 whitespace-nowrap">RATE:</span>
            <div className="flex gap-1">
              {[10, 20, 50, 100, 200, 500].map((r) => (
                <button
                  key={r}
                  onClick={() => setSelectedRate(r)}
                  className={`px-2 py-1 rounded text-xs font-semibold transition-all whitespace-nowrap ${
                    selectedRate === r 
                      ? 'bg-blue-500 text-white shadow' 
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>



        </div>
      </div>

      {/* ================= MAIN CONTENT - Full Height ================= */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-2 flex-1 min-h-0">
        
        {/* ENTRIES LIST - Full Height */}
        <div className="lg:col-span-3 bg-gray-800/40 border border-gray-600 rounded-lg p-2 flex flex-col">
          <div className="flex items-center justify-between mb-2 flex-shrink-0">
            <h3 className="text-sm font-semibold text-white">Entries</h3>
            <span className="bg-blue-500 text-white px-2 py-0.5 rounded-full text-xs font-medium">
              {entries.length}
            </span>
          </div>
          
          <div className="flex-1 overflow-auto custom-scrollbar">
            {entries.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400 text-sm">
                <div className="text-xl mb-1">🎯</div>
                <p>No entries yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-5 gap-1">
                {entries.map((item) => (
                  <div key={item.id} className="bg-gray-700/50 border border-gray-600 rounded p-1 hover:border-blue-400/50 transition-all group">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="bg-blue-500 text-white px-1.5 py-0.5 rounded text-xs font-bold min-w-8 text-center">{item.spot}</span>
                        <span className="text-white font-mono text-sm font-bold">{item.number}</span>
                        <span className="text-gray-300 text-xs">{item.type}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-yellow-400 text-xs font-semibold">₹{item.rate}</span>
                        <button
                          onClick={() => removeEntry(item.id, item.spot)}
                          className="opacity-70 hover:opacity-100 bg-red-500 text-white w-4 h-4 rounded text-[10px] flex items-center justify-center transition-all"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* SPOT SUMMARY - Full Height */}
        <div className="bg-amber-50 border border-amber-300 rounded-lg p-2 shadow flex flex-col">
          <h3 className="text-sm font-bold text-gray-800 mb-2 text-center flex-shrink-0">Summary</h3>
          
          <div className="flex-1 flex flex-col min-h-0">
            {/* Header */}
            <div className="grid grid-cols-12 gap-1 py-1 px-2 bg-amber-200 rounded text-xs font-bold text-gray-800 flex-shrink-0">
              <div className="col-span-5">Spot</div>
              <div className="col-span-3 text-center">Qty</div>
              <div className="col-span-4 text-center">Rs</div>
            </div>

            {/* Spot Rows - Scrollable */}
            <div className="flex-1 overflow-auto custom-scrollbar-amber mt-1">
              {spots.map((s) => (
                <div key={s} className="grid grid-cols-12 gap-1 py-1 px-2 bg-white rounded border border-amber-100 hover:border-amber-200 transition-colors mb-1">
                  <div className="col-span-5 font-semibold text-gray-800 text-xs flex items-center">
                    {s}
                  </div>
                  <div className="col-span-3">
                    <input 
                      disabled 
                      className="w-full bg-gray-50 border border-gray-200 rounded px-1 py-0.5 text-center text-xs font-medium text-gray-700" 
                      value={spotData[s].qty} 
                    />
                  </div>
                  <div className="col-span-4">
                    <input 
                      disabled 
                      className="w-full bg-gray-50 border border-gray-200 rounded px-1 py-0.5 text-center text-xs font-medium text-gray-700" 
                      value={spotData[s].rs} 
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Totals - Fixed at bottom */}
            <div className="space-y-1 pt-2 border-t border-amber-200 flex-shrink-0 mt-auto">
              <div className="flex justify-between items-center bg-amber-200/50 rounded px-2 py-1">
                <span className="font-bold text-gray-700 text-xs">Grand Total</span>
                <input 
                  disabled 
                  value={grandTotal} 
                  className="bg-white border border-amber-300 rounded px-2 py-0.5 w-16 text-center text-xs font-bold text-gray-800" 
                />
              </div>
              <div className="flex justify-between items-center bg-amber-200/50 rounded px-2 py-1">
                <span className="font-bold text-gray-700 text-xs">Net Total</span>
                <input 
                  disabled 
                  value={grandTotal} 
                  className="bg-white border border-amber-300 rounded px-2 py-0.5 w-16 text-center text-xs font-bold text-gray-800" 
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* COMPACT ACTION BUTTONS */}
      <div className="flex gap-2 justify-center mt-2 flex-shrink-0">
        <button
          className="flex-1 bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white font-semibold px-3 py-2 rounded text-sm transition-all flex items-center justify-center gap-1"
          onClick={() => {
            setEntries([]);
            setSpotData(
              spots.reduce((acc, s) => ({ ...acc, [s]: { qty: 0, rs: 0 } }), {})
            );
            localStorage.removeItem("tickets");
          }}
        >
          <span className="text-xs">🔄</span>
          RESET (F2)
        </button>
<button
  className="flex-1 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white border-b-4 border-green-900/50 font-semibold px-3 py-2 rounded text-sm transition-all flex items-center justify-center gap-1"
  onClick={handleBuy}
  disabled={isBuying}
  style={{ opacity: isBuying ? 0.6 : 1 }}
>
  <span className="text-xs">💳</span>
  {isBuying ? "Saving..." : "BUY (F6)"}
</button>

      </div>

      {/* Custom Scrollbar Styles */}
      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 2px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.3);
          border-radius: 2px;
        }
        .custom-scrollbar-amber::-webkit-scrollbar {
          width: 3px;
        }
        .custom-scrollbar-amber::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.1);
          border-radius: 2px;
        }
        .custom-scrollbar-amber::-webkit-scrollbar-thumb {
          background: rgba(0, 0, 0, 0.3);
          border-radius: 2px;
        }
      `}</style>
    </div>
  );
};

export default Automatic;