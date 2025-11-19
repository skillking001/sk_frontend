"use client";
import React, { useState, useEffect } from "react";
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

/* ---------- Slot Number Animation ---------- */
function SlotNumber({ value, delay = 0 }) {
  const isEmpty = !value;
  const [display, setDisplay] = useState(
    isEmpty ? "" : Math.floor(Math.random() * 9000 + 1000)
  );
  const [rolling, setRolling] = useState(true);

  useEffect(() => {
    if (isEmpty) {
      setDisplay("");
      setRolling(false);
      return;
    }
    let frame = 0;
    const animateRoll = () => {
      if (frame < 18) {
        setDisplay(Math.floor(Math.random() * 9000 + 1000));
        frame++;
        setTimeout(animateRoll, 18 + Math.random() * 22);
      } else {
        setDisplay(value);
        setRolling(false);
      }
    };
    setTimeout(animateRoll, delay);
  }, [value, delay, isEmpty]);

  return (
    <motion.div
      key={display}
      initial={{ y: -30, opacity: 0.3 }}
      animate={{ y: 0, opacity: 1, scale: rolling ? 1.05 : 1 }}
      transition={{ type: "spring", stiffness: 400, damping: 35 }}
      className="font-mono font-bold text-white text-[clamp(0.7rem,2vw,1rem)] select-none"
      style={{
        textShadow: isEmpty ? "none" : "0 1px 3px #0008",
        opacity: isEmpty ? 0.3 : 1,
      }}
    >
      {display}
    </motion.div>
  );
}

/* ---------- Compact Slot Machine ---------- */
function CasinoSlotMachine({ rows }) {
  return (
    <div className="w-full h-full flex items-center justify-center p-1">
      <div
        className="rounded-xl border-[2px] border-yellow-400 bg-gradient-to-br from-[#1a1a1a] to-[#252525]
                   shadow-[0_2px_8px_#000a,inset_0_0_10px_#ffd70020] px-2 py-1 w-full max-w-full"
      >
        <div className="flex flex-col gap-1 items-center justify-center w-full">
          {rows.map((row, i) => (
            <div
              key={i}
              className="flex gap-1 justify-center w-full flex-nowrap"
            >
              {row.map((num, j) => (
                <div
                  key={j}
                  className="flex justify-center items-center rounded
                             border-[1.5px] border-yellow-400 shadow-inner
                             w-full h-[clamp(20px,4vh,28px)] min-w-0 flex-1
                             overflow-hidden"
                  style={{
                    background: [
                      "linear-gradient(135deg,#25e37b,#067269)",
                      "linear-gradient(135deg,#32aaff,#1725ed)",
                      "linear-gradient(135deg,#b267fa,#6c23ed)",
                      "linear-gradient(135deg,#f5a242,#ea580c)",
                      "linear-gradient(135deg,#ec4899,#be185d)",
                      "linear-gradient(135deg,#00d2d3,#098790)",
                      "linear-gradient(135deg,#ef4444,#dc2626)",
                      "linear-gradient(135deg,#8b5cf6,#7c3aed)",
                      "linear-gradient(135deg,#06b6d4,#0891b2)",
                      "linear-gradient(135deg,#10b981,#059669)",
                    ][j % 10],
                  }}
                >
                  <SlotNumber value={num} delay={i * 100 + j * 40} />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------- Ultra Compact Main Layout ---------- */
export default function ShowResult({ drawTime }) {
  const [ticketNumbers, setTicketNumbers] = useState([[], [], []]);
  const [gameId, setGameId] = useState("-");

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

    console.log("🎯 Fetching results for drawTime:", drawTime);
    console.log("🕒 Backend converted drawTime:", getBackendDrawTime(drawTime));
    console.log("🧾 Admin ID:", gameId);

    axios
      .post(`${process.env.NEXT_PUBLIC_API_BASE_URL}/get-winning-numbers`, {
        drawTime: getBackendDrawTime(drawTime),
        adminId: gameId,
      })
      .then((res) => {
        console.log("✅ Raw API Response:", res.data);

        let tickets = [];
        if (Array.isArray(res.data.selectedTickets)) {
          tickets = res.data.selectedTickets;
        } else if (res.data.numbersBySeries) {
          tickets = Object.values(res.data.numbersBySeries).flat();
        }

        console.log("🎰 Parsed Ticket Numbers:", tickets);

        const [s10, s30, s50] = getSeriesRows(tickets);
        console.log("📊 Series Split:", { "10–19": s10, "30–39": s30, "50–59": s50 });

        setTicketNumbers([s10, s30, s50]);
      })
      .catch((err) => {
        console.error("🔥 Error fetching winning numbers:", err);
        setTicketNumbers([
          Array(10).fill(""),
          Array(10).fill(""),
          Array(10).fill(""),
        ]);
      });
  }, [drawTime, gameId]);

  return (
    <div className="w-full h-full flex items-center justify-center p-2">
      <img
        src="/Logo.png"
        alt="Skill KING"
        draggable="false"
        className="w-[140px] lg:w-[180px] h-auto drop-shadow-[0_0_12px_#000000]"
      />
      <CasinoSlotMachine rows={ticketNumbers} />
    </div>
  );
}
