"use client";
import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import axios from "axios";

/* ---------- Helpers ---------- */
function getBackendDrawTime(drawTime) {
  if (!drawTime) return drawTime;
  const [time, modifier] = drawTime.split(" ");
  let [hours, minutes] = time.split(":").map(Number);
  if (modifier.toUpperCase() === "PM" && hours !== 12) hours += 12;
  if (modifier.toUpperCase() === "AM" && hours === 12) hours = 0;
  const dt = new Date();
  dt.setHours(hours, minutes, 0, 0);
  dt.setMinutes(dt.getMinutes() - 15);
  let outHours = dt.getHours();
  let outMinutes = dt.getMinutes();
  const outModifier = outHours >= 12 ? "PM" : "AM";
  if (outHours === 0) outHours = 12;
  else if (outHours > 12) outHours -= 12;
  const minStr = outMinutes < 10 ? "0" + outMinutes : outMinutes;
  return `${outHours}:${minStr} ${outModifier}`;
}

function getSeriesRows(tickets) {
  const row1 = [],
    row2 = [],
    row3 = [];
  tickets.forEach((t) => {
    if (!t?.number) return;
    const prefix = Number(String(t.number).slice(0, 2));
    if (prefix >= 10 && prefix <= 19) row1.push(String(t.number));
    else if (prefix >= 30 && prefix <= 39) row2.push(String(t.number));
    else if (prefix >= 50 && prefix <= 59) row3.push(String(t.number));
  });
  const padAndSort = (row) => {
    const nums = row.filter(Boolean).sort((a, b) => Number(a) - Number(b));
    while (nums.length < 10) nums.push("");
    return nums;
  };
  return [padAndSort(row1), padAndSort(row2), padAndSort(row3)];
}

/* ---------- Individual Slot Reel Animation ---------- */
function SlotReel({ value, stopDelay = 0, startRolling }) {
  const isEmpty = !value;
  const [rolling, setRolling] = useState(false);
  const [displayValue, setDisplayValue] = useState("");
  const [hasStopped, setHasStopped] = useState(false);
  const reelNumbers = useRef([]);
  const intervalRef = useRef(null);
  
  useEffect(() => {
    if (isEmpty) {
      setDisplayValue("");
      return;
    }
    
    // Generate 20 random numbers for the reel
    reelNumbers.current = Array.from({ length: 20 }, () => 
      Math.floor(Math.random() * 9000 + 1000).toString()
    );
    
    setDisplayValue(reelNumbers.current[0]);
    setHasStopped(false);
  }, [value, isEmpty]);

  // Start rolling when triggered
  useEffect(() => {
    if (isEmpty || !startRolling) return;
    
    setRolling(true);
    setHasStopped(false);
    
    let currentIndex = 0;
    
    // Fast rolling animation
    intervalRef.current = setInterval(() => {
      currentIndex = (currentIndex + 1) % reelNumbers.current.length;
      setDisplayValue(reelNumbers.current[currentIndex]);
    }, 80);
    
    // Stop after delay
    const stopTimer = setTimeout(() => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      
      // Settle on final value
      setDisplayValue(value);
      setRolling(false);
      
      setTimeout(() => {
        setHasStopped(true);
      }, 100);
    }, stopDelay);
    
    return () => {
      clearTimeout(stopTimer);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [startRolling, stopDelay, value, isEmpty]);

  return (
    <div className="relative w-full h-full overflow-hidden rounded">
      <motion.div
        className="flex items-center justify-center w-full h-full"
        animate={{
          scale: rolling ? [1, 1.05, 1] : hasStopped ? [1, 1.1, 1] : 1,
        }}
        transition={{
          scale: {
            duration: rolling ? 0.15 : 0.3,
            repeat: rolling ? Infinity : 0,
          }
        }}
      >
        <span
          className={`font-mono font-bold transition-all duration-300 ${
            hasStopped
              ? "text-yellow-400"
              : rolling 
              ? "text-gray-400" 
              : "text-gray-500"
          }`}
          style={{
            fontSize: "clamp(1rem, 1.5vw, 1.3rem)",
            textShadow: hasStopped 
              ? "0 0 8px rgba(250, 204, 21, 0.4)" 
              : "none",
          }}
        >
          {displayValue}
        </span>
      </motion.div>
      
      {/* Subtle border */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 border border-yellow-600/20 rounded" />
      </div>
      
      {/* Highlight when stopped */}
      {hasStopped && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 bg-yellow-500/5 rounded pointer-events-none"
        />
      )}
    </div>
  );
}

/* ---------- Slot Machine with Sequential Reveal ---------- */
function CasinoSlotMachine({ rows }) {
  const [startRolling, setStartRolling] = useState(false);
  const [stoppedSlots, setStoppedSlots] = useState(new Set());
  
  const totalSlots = rows.flat().filter(Boolean).length;
  
  useEffect(() => {
    // Start all reels rolling at once
    setStartRolling(false);
    setStoppedSlots(new Set());
    
    const startTimer = setTimeout(() => {
      setStartRolling(true);
      
      // Stop slots one by one in sequence
      let slotIndex = 0;
      const slots = [];
      
      // Build slot list in order
      rows.forEach((row, rowIdx) => {
        row.forEach((num, colIdx) => {
          if (num) {
            slots.push({ rowIdx, colIdx, num });
          }
        });
      });
      
      // Stop each slot with delay
      const stopNextSlot = () => {
        if (slotIndex < slots.length) {
          setStoppedSlots(prev => new Set([...prev, slotIndex]));
          slotIndex++;
          setTimeout(stopNextSlot, 200); // 200ms between each stop
        }
      };
      
      // Start stopping after initial roll period
      setTimeout(stopNextSlot, 1500);
      
    }, 300);
    
    return () => clearTimeout(startTimer);
  }, [rows]);

  const getStopDelay = (rowIndex, colIndex) => {
    let slotIndex = 0;
    for (let r = 0; r < rows.length; r++) {
      for (let c = 0; c < rows[r].length; c++) {
        if (rows[r][c]) {
          if (r === rowIndex && c === colIndex) {
            return 1500 + (slotIndex * 200); // Base delay + sequential stop
          }
          slotIndex++;
        }
      }
    }
    return 1500;
  };

  return (
    <div className="w-full h-full flex items-center justify-center p-1">
      <div className="relative rounded-lg border border-yellow-700/40 bg-gradient-to-br from-gray-900 via-gray-850 to-gray-900 shadow-lg px-3 py-2 w-full max-w-full">
        
        {/* Reels container */}
        <div className="flex flex-col gap-2 items-center justify-center w-full relative z-10">
          {rows.map((row, rowIndex) => (
            <div
              key={rowIndex}
              className="flex gap-2 justify-center w-full flex-nowrap"
            >
              {row.map((num, colIndex) => {
                const stopDelay = getStopDelay(rowIndex, colIndex);
                
                return (
                  <div
                    key={`${rowIndex}-${colIndex}`}
                    className="relative flex justify-center items-center rounded border border-yellow-700/30 w-full h-[clamp(28px,5vh,35px)] min-w-0 flex-1 overflow-hidden bg-gradient-to-b from-gray-800 to-gray-900"
                  >
                    <SlotReel 
                      value={num} 
                      stopDelay={stopDelay}
                      startRolling={startRolling}
                    />
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        
        {/* Subtle decorative elements */}
        <div className="absolute -top-0.5 left-1/2 transform -translate-x-1/2 w-12 h-1 bg-gradient-to-r from-transparent via-yellow-600/50 to-transparent" />
        <div className="absolute -bottom-0.5 left-1/2 transform -translate-x-1/2 w-12 h-1 bg-gradient-to-r from-transparent via-yellow-600/50 to-transparent" />
      </div>
    </div>
  );
}

/* ---------- Main Layout ---------- */
export default function ShowResult({ drawTime }) {
  const [ticketNumbers, setTicketNumbers] = useState([[], [], []]);
  const [gameId, setGameId] = useState("-");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      const token = localStorage.getItem("userToken");
      if (!token) return;
      const payload = JSON.parse(atob(token.split(".")[1]));
      setGameId(payload?.id || "-");
    } catch {
      setGameId("-");
    }
  }, []);

useEffect(() => {
  if (!drawTime || gameId === "-") return;

  const backendDrawTime = getBackendDrawTime(drawTime);
  const cacheKey = `winning_result_${gameId}_${backendDrawTime}`;

  // 📦 1. Try localStorage first
  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed?.ticketNumbers) {
        setTicketNumbers(parsed.ticketNumbers);
        setIsLoading(false);
        return; // ⛔ STOP — no API call
      }
    }
  } catch (e) {
    console.warn("⚠ localStorage read failed, fallback to API");
  }

  setIsLoading(true);

  axios
    .post(`${process.env.NEXT_PUBLIC_API_BASE_URL}/get-winning-numbers`, {
      drawTime: backendDrawTime,
      adminId: gameId,
    })
    .then((res) => {
      let tickets = [];
      if (Array.isArray(res.data.selectedTickets)) {
        tickets = res.data.selectedTickets;
      } else if (res.data.numbersBySeries) {
        tickets = Object.values(res.data.numbersBySeries).flat();
      }

      const [s10, s30, s50] = getSeriesRows(tickets);
      const resultRows = [s10, s30, s50];

      setTicketNumbers(resultRows);

      // 💾 Save to localStorage
      try {
        localStorage.setItem(
          cacheKey,
          JSON.stringify({
            timestamp: new Date().toISOString(),
            ticketNumbers: resultRows,
          })
        );
        console.log("💾 Saved to localStorage:", cacheKey);
      } catch (e) {
        console.warn("⚠ localStorage write failed");
      }

      setIsLoading(false);
    })
    .catch((err) => {
      console.error("❌ API error fetching winning numbers:", err);
      setTicketNumbers([
        Array(10).fill(""),
        Array(10).fill(""),
        Array(10).fill(""),
      ]);
      setIsLoading(false);
    });
}, [drawTime, gameId]);


  return (
    <div className="w-full h-full flex items-center justify-center p-2 relative">
      <img
        src="/Logo.png"
        alt="Skill KING"
        draggable="false"
        className="w-[140px] lg:w-[180px] h-auto drop-shadow-[0_0_15px_#000000] z-10"
      />
      
      {isLoading ? (
        <div className="flex items-center justify-center ml-4">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-8 h-8 border-4 border-yellow-600 border-t-transparent rounded-full"
          />
        </div>
      ) : (
        <CasinoSlotMachine rows={ticketNumbers} />
      )}
    </div>
  );
}