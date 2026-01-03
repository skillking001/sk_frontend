"use client";

import React, { useEffect, useState } from "react";
import Manual from "../../Components/ThreeD/Manual";
import Automatic from "../../Components/ThreeD/Automatic";
import HowToPlay from "../../Components/ThreeD/HowToPlay";
import { useRouter } from "next/navigation";
import Details from '../../Components/ThreeD/Details'

const Page = () => {
  const router = useRouter();

  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [timeLeft, setTimeLeft] = useState("");
  const [nextContest, setNextContest] = useState("");
  const [winningNumbers, setWinningNumbers] = useState([]);


  const [active, setActive] = useState("manual");
  const [showHowToPlay, setShowHowToPlay] = useState(false);


  useEffect(() => {
    if (!localStorage.getItem("userToken")) router.push("/");
  }, [router]);

  useEffect(() => {
  const loadWinning = async () => {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/get-winning-today`
      );

      const data = await res.json();

      if (data?.winningNumbers?.length > 0) {
        setWinningNumbers(data.winningNumbers);
      } else {
        setWinningNumbers([]); // blank
      }

    } catch (err) {
      console.error("Failed fetching winning numbers", err);
      setWinningNumbers([]);
    }
  };

  loadWinning();
}, []);


  // -----------------------------
  // Load active tab
  // -----------------------------
  useEffect(() => {
    const savedTab = localStorage.getItem("threeD_active_tab");
    if (savedTab) setActive(savedTab);
  }, []);

  useEffect(() => {
    localStorage.setItem("threeD_active_tab", active);
  }, [active]);

  // -----------------------------
  // UPDATE CLOCK (IST)
  // -----------------------------
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      const ist = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);

      // DATE
      setDate(
        ist.toLocaleDateString("en-IN", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      );

      // TIME
      setTime(
        ist.toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
        })
      );

      // NEXT CONTEST TOMORROW @ 6 PM
      const next = new Date(ist);
      next.setDate(next.getDate() + 1);
      next.setHours(18, 0, 0, 0);
      setNextContest(
        next.toLocaleString("en-IN", {
          day: "numeric",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        })
      );

      // TIME LEFT TODAY
      const midnight = new Date(ist);
      midnight.setHours(23, 59, 59, 999);
      const diff = midnight - ist;

      const h = Math.floor(diff / (1000 * 60 * 60));
      const m = Math.floor((diff / (1000 * 60)) % 60);
      const s = Math.floor((diff / 1000) % 60);

      setTimeLeft(`${h}h : ${m}m : ${s}s`);
    };

    updateClock();
    const timer = setInterval(updateClock, 1000);
    return () => clearInterval(timer);
  }, []);

  // -----------------------------
  // HANDLERS
  // -----------------------------
  const handleShowManual = () => setActive("manual");
  const handleShowAutomatic = () => setActive("automatic");
  const handleShowHow = () => setShowHowToPlay(true);

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white">

{/* 🔥 WINNING NUMBERS STRIP (FULL WIDTH) */}
<div className="w-full px-4 py-3 flex justify-center">
  <div className="
      w-full flex justify-between gap-3 bg-black/40 border-2 border-yellow-500 
      rounded-xl px-4 py-3 overflow-x-auto
    "
  >
    {Array.from({ length: 10 }).map((_, i) => {
      const num = winningNumbers[i] || ""; // blank if missing
      return (
        <div
          key={i}
          className="
            flex-1 py-3 text-center rounded-lg text-white font-extrabold 
            text-xl shadow-lg min-w-[90px]
          "
          style={{
            background: [
              "#0FA968","#0E5BFF","#9333EA","#F59E0B","#D92662",
              "#0EA5A5","#EA4335","#7C3AED","#0284C7","#10B981",
            ][i],
          }}
        >
          {num}
        </div>
      );
    })}
  </div>
</div>

      {/* HEADER */}
      <div className="w-full text-center py-4 bg-white/10 backdrop-blur-md border-b border-white/20 shadow-lg">
        <h1 className="text-xl font-bold bg-gradient-to-r from-purple-300 to-pink-400 bg-clip-text text-transparent">
          3D Contest Dashboard
        </h1>

        <div className="flex flex-wrap justify-center gap-5 mt-2 text-sm">
          <p>📅 Date: <span className="text-purple-300 font-semibold">{date}</span></p>
          <p>⏰ Time: <span className="text-pink-300 font-semibold">{time}</span></p>
          <p>🏆 Next Contest: <span className="text-purple-300 font-semibold">{nextContest}</span></p>
          <p>⌛ Time Left: <span className="text-pink-300 font-semibold">{timeLeft}</span></p>
        </div>
      </div>

      {/* TABS */}
      <div className="px-4 mt-4">
        <div className="flex gap-3">
          <button
            onClick={handleShowManual}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold ${
              active === "manual"
                ? "bg-gradient-to-r from-purple-600 to-pink-600 shadow-lg"
                : "bg-white/5 hover:bg-white/10"
            }`}
          >
            Manual
          </button>

          <button
            onClick={handleShowAutomatic}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold ${
              active === "automatic"
                ? "bg-gradient-to-r from-purple-600 to-pink-600 shadow-lg"
                : "bg-white/5 hover:bg-white/10"
            }`}
          >
            Automatic
          </button>

          <button
            onClick={handleShowHow}
            className="flex-1 py-2 rounded-lg text-sm font-semibold bg-white/5 hover:bg-white/10"
          >
            How to Play
          </button>
        </div>

        {/* CONTENT */}
        <div className="mt-5 min-h-[60vh]">
          {active === "manual" && <Manual />}
          {active === "automatic" && <Automatic />}
        </div>
      </div>

      {/* MODAL */}
      <HowToPlay isOpen={showHowToPlay} onClose={() => setShowHowToPlay(false)} />


      <Details/>
    </div>
  );
};

export default Page;
