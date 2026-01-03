"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Clock,
  Calendar,
  Play,
  RotateCcw,
  Printer,
  Zap,
  TrendingUp,
} from "lucide-react";
import toast from "react-hot-toast";
import Navbar from "../../Components/Navbar/Navbar.jsx";
import ShowResult from "../../Components/ShowResult/ShowResult";
import { FP_SETS } from "../../data/fpSets";
import axios from "axios";
import { DRAW_TIMES } from "../../data/drawTimes";
import jsPDF from "jspdf";
import JsBarcode from "jsbarcode";
import AdvanceDrawModal from "../../Components/AdvanceDrawModal/AdvanceDrawModal.jsx";
import TicketStatusModal from "../../Components/TicketStatusModal/TicketStatusModal.jsx";
import { useRouter } from "next/navigation.js";
import LoadingOverlay from "../LoadingOverlay/LoadingOverlay.jsx";

// Helper for number ranges
const range = (start, end) =>
  Array.from({ length: end - start + 1 }, (_, k) => k + start);

const numberBoxColors = [
  "bg-gradient-to-r from-red-400 to-red-600",
  "bg-gradient-to-r from-orange-400 to-orange-500",
  "bg-gradient-to-r from-pink-400 to-pink-500",
  "bg-gradient-to-r from-yellow-200 to-yellow-400",
  "bg-gradient-to-r from-cyan-400 to-blue-400",
  "bg-gradient-to-r from-yellow-400 to-yellow-500",
  "bg-gradient-to-r from-blue-400 to-blue-700",
  "bg-gradient-to-r from-gray-400 to-gray-500",
  "bg-gradient-to-r from-green-300 to-green-500",
  "bg-gradient-to-r from-red-400 to-red-600",
];

const allNumbers = [
  range(10, 19), // Col 1
  range(30, 39), // Col 2
  range(50, 59), // Col 3
];

const isOdd = (n) => n % 2 === 1;
const isEven = (n) => n % 2 === 0;
const isPrime = (n) => {
  if (n < 2) return false;
  for (let i = 2; i * i <= n; i++) if (n % i === 0) return false;
  return true;
};

// --- Timer & Date Helpers --- //
function getTodayDateString() {
  const d = new Date();
  return `${d.getDate().toString().padStart(2, "0")} ${d.toLocaleString("en", {
    month: "short",
  })} ${d.getFullYear()}`;
}

function parseTimeToToday(timeStr) {
  const [time, modifier] = timeStr.split(" ");
  let [hours, minutes] = time.split(":").map(Number);
  if (modifier === "PM" && hours !== 12) hours += 12;
  if (modifier === "AM" && hours === 12) hours = 0;

  const now = new Date();
  return new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    hours,
    minutes
  );
}

function getNextDrawSlot(drawTimes) {
  const now = new Date();
  const timeObjects = drawTimes.map((timeStr) => {
    const [time, modifier] = timeStr.split(" ");
    let [hours, minutes] = time.split(":").map(Number);
    if (modifier === "PM" && hours !== 12) hours += 12;
    if (modifier === "AM" && hours === 12) hours = 0;
    return new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      hours,
      minutes
    );
  });

  for (let i = 0; i < timeObjects.length; i++) {
    if (now < timeObjects[i]) {
      return drawTimes[i];
    }
  }
  return drawTimes[0]; // First slot of next day
}

function getRemainTime() {
  if (typeof window === "undefined") return 0;

  const nextSlot = getNextDrawSlot(DRAW_TIMES);
  const now = new Date();
  const nextSlotDate = parseTimeToToday(nextSlot);

  if (now > nextSlotDate) {
    nextSlotDate.setDate(nextSlotDate.getDate() + 1);
  }

  const remainMs = nextSlotDate - now;
  return Math.max(0, Math.floor(remainMs / 1000));
}

export default function Page() {
  const router = useRouter();

  const [refreshKey, setRefreshKey] = useState(1);

  useEffect(() => {
    if (!localStorage.getItem("userToken")) {
      router.push("/");
    }
  }, [router]);

  const [selected, setSelected] = useState(
    Array(10)
      .fill(null)
      .map(() => Array(3).fill(false))
  );
  const [activeFilter, setActiveFilter] = useState(null);

  // 👇 This now only controls input disabling, not checkboxes
  const [activeTypeFilter, setActiveTypeFilter] = useState(null);
  const [activeColFilter, setActiveColFilter] = useState(null);

  const [gameIdBox, setGameIdBox] = useState("-");
  const [lastPoints, setLastPoints] = useState("-");
  const [lastTicket, setLastTicket] = useState("-");
  const [balance, setBalance] = useState("-");

  const isPrintingRef = useRef(false);

  const [ticketStatusModalOpen, setTicketStatusModalOpen] = useState(false);
  const [ticketStatusData, setTicketStatusData] = useState(null);
  const [isClaimable, setIsClaimable] = useState(false);

  const [quantities, setQuantities] = useState(Array(10).fill(0));
  const [points, setPoints] = useState(Array(10).fill(0));

  const [isFPMode, setIsFPMode] = useState(false);
  const [activeFPSetIndex, setActiveFPSetIndex] = useState(null);

  const [currentDrawSlot, setCurrentDrawSlot] = useState(() =>
    getNextDrawSlot(DRAW_TIMES)
  );
  const [advanceModalOpen, setAdvanceModalOpen] = useState(false);
  const [advanceDrawTimes, setAdvanceDrawTimes] = useState([]);

  const [isBlocked, setIsBlocked] = useState(false);
  const [blockTill, setBlockTill] = useState(null);

  const COLS = 10,
    ROWS = 10;

  const [columnHeaders, setColumnHeaders] = useState(Array(COLS).fill(""));
  const [rowHeaders, setRowHeaders] = useState(Array(ROWS).fill(""));
  const [cellOverrides, setCellOverrides] = useState({});
  const [isPrinting, setIsPrinting] = useState(false);

  const [transactionInput, setTransactionInput] = useState("");
  const [activeFButtons, setActiveFButtons] = useState([]);
  const [selectedNumbers, setSelectedNumbers] = useState([]); 
  const [activeNumber, setActiveNumber] = useState(null);


  const [activeNumberBox, setActiveNumberBox] = useState({
    row: null,
    col: null,
  });

  const [activeCheckbox, setActiveCheckbox] = useState(null);
  const [checkboxInputs, setCheckboxInputs] = useState({});
  const [activeColGroup, setActiveColGroup] = useState(null);

  const LS_KEY = "sjTicketsV1";
  const [storeByNum, setStoreByNum] = useState({});

  useEffect(() => {
  async function checkBlockStatus() {
    const adminId = getLoginIdFromToken();
    if (!adminId) return;

    try {
      const res = await axios.post(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/check-blocked`,
        { adminId }
      );

      const data = res.data?.data;

      if (data?.blockStatus === true) {
        setIsBlocked(true);
        setBlockTill(data.blockTill);

        toast.error(
          `🚫 You are blocked until ${new Date(data.blockTill).toLocaleString()}`,
          {
            duration: Infinity, // stays forever
            position: "top-right",
          }
        );
      } else {
        setIsBlocked(false);
      }
    } catch (err) {
      console.error("Block status error:", err);
    }
  }

  checkBlockStatus();
}, []);


  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) setStoreByNum(JSON.parse(raw));
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(storeByNum));
    } catch {}
  }, [storeByNum]);

  function ensureSlot(num) {
    return (
      storeByNum[num] || {
        columnHeader: Array(10).fill(""),
        rowHeader: Array(10).fill(""),
        tickets: {},
      }
    );
  }

  function expandHeaderTickets(num, cols, rows) {
    const out = {};
    for (let r = 0; r < 10; r++) {
      for (let c = 0; c < 10; c++) {
        const rv = rows[r];
        const cv = cols[c];

        if (rv || cv) {
          const rNum = parseInt(rv || "0", 10);
          const cNum = parseInt(cv || "0", 10);
          const valNum = rv && cv ? rNum + cNum : rv ? rNum : cNum;

          if (!Number.isNaN(valNum) && valNum > 0) {
            const idx = String(r * 10 + c).padStart(2, "0");
            out[`${num}-${idx}`] = String(valNum);
          }
        }
      }
    }
    return out;
  }

  function buildTicketsForNumber(num, cols, rows, checkboxMap) {
    const tickets = { ...expandHeaderTickets(num, cols, rows) };
    if (checkboxMap) {
      Object.entries(checkboxMap).forEach(([cellIndex, v]) => {
        if (v !== "" && v !== "0" && v != null) {
          const idx = String(cellIndex).padStart(2, "0");
          const r = Math.floor(parseInt(cellIndex, 10) / 10);
          const c = parseInt(cellIndex, 10) % 10;

          const rv = rows[r];
          const cv = cols[c];
          const rNum = parseInt(rv || "0", 10);
          const cNum = parseInt(cv || "0", 10);
          const headerSum = (rv ? rNum : 0) + (cv ? cNum : 0);

          const manual = parseInt(v || "0", 10);
          const total = manual + headerSum;

          tickets[`${num}-${idx}`] = String(total);
        }
      });
    }
    return tickets;
  }

  // Helper: update value for a single number (used for activeNumber and range)
function assignValueToNumber(num, value, cellKey) {
  if (!/^\d*$/.test(value)) return;

  // --- 1. Update React state ---
  setCheckboxInputs((prev) => {
    const updated = { ...prev };
    if (!updated[num]) updated[num] = {};
    updated[num][cellKey] = value;
    return updated;
  });

  setStoreByNum((prev) => {
    const slot = ensureSlot(num);
    const t = { ...(slot.tickets || {}) };

    // Update the specific key (like 50-00)
    t[`${num}-${cellKey}`] = value;

    return { ...prev, [num]: { ...slot, tickets: t } };
  });

  // --- 2. Update LocalStorage ---
  try {
    const key = `${num}-${cellKey}`;
    const storedData = JSON.parse(localStorage.getItem("skillJackpotData") || "{}");
    storedData[key] = value;
    localStorage.setItem("skillJackpotData", JSON.stringify(storedData));
  } catch (err) {
    console.error("LocalStorage update failed:", err);
  }
}


  function persistActiveNumber(num) {
    if (!num) return;
    setStoreByNum((prev) => {
      const slot = ensureSlot(num);
      const mergedTickets = buildTicketsForNumber(
        num,
        columnHeaders,
        rowHeaders,
        checkboxInputs[num] || {}
      );
      return {
        ...prev,
        [num]: {
          columnHeader: [...columnHeaders],
          rowHeader: [...rowHeaders],
          tickets: mergedTickets,
        },
      };
    });
  }

  function loadNumberIntoUI(num) {
    const slot = ensureSlot(num);
    const cols = slot.columnHeader || Array(10).fill("");
    const rows = slot.rowHeader || Array(10).fill("");

    setColumnHeaders(cols);
    setRowHeaders(rows);

    const manualMap = {};
    Object.entries(slot.tickets || {}).forEach(([k, v]) => {
      const idxStr = k.split("-")[1];
      if (!idxStr) return;

      const idx = parseInt(idxStr, 10);
      if (Number.isNaN(idx)) return;

      const r = Math.floor(idx / 10);
      const c = idx % 10;

      const rNum = parseInt(rows[r] || "0", 10);
      const cNum = parseInt(cols[c] || "0", 10);
      const headerSum = (rows[r] ? rNum : 0) + (cols[c] ? cNum : 0);

      const total = parseInt(String(v) || "0", 10);
      const manual = total - headerSum;

      if (!Number.isNaN(manual) && manual > 0) {
        manualMap[idx] = String(manual);
      }
    });

    setCheckboxInputs((prev) => ({ ...prev, [num]: manualMap }));
  }

  function isCellDisabled(row, col) {
    if (isFPMode) return false;

    const idx = row * 10 + col;

    if (activeTypeFilter === "odd") {
      return idx % 2 === 0; // disable even
    }
    if (activeTypeFilter === "even") {
      return idx % 2 === 1; // disable odd
    }
    if (activeTypeFilter === "all") {
      return false;
    }

    // when no filter: lock unless a number or col-group active
    return !activeCheckbox && !activeColGroup;
  }

  const updatedQuantity = range(0, 9).map((rowIndex) => {
    let total = 0;
    for (let colIdx = 0; colIdx < 3; colIdx++) {
      if (!selected[rowIndex][colIdx]) continue;

      const num = allNumbers[colIdx][rowIndex];
      const tickets = (storeByNum[num] && storeByNum[num].tickets) || {};

      for (const key in tickets) {
        const parts = key.split("-");
        if (parts.length !== 2) continue;

        const idx = parseInt(parts[1], 10);
        if (Number.isNaN(idx)) continue;

        const r = Math.floor(idx / 10);
        const c = idx % 10;

        if (isCellDisabled(r, c)) continue;

        const n = parseInt(tickets[key], 10);
        if (!Number.isNaN(n) && n > 0) {
          total += n;
        }
      }
    }
    return total;
  });

  const updatedPoints = updatedQuantity.map((q) => q * 2);

  function toggleNumberBox(row, col) {
    setActiveNumberBox({ row, col });
  }

  const inputRefs = useRef(
    Array.from({ length: 10 }, () => Array.from({ length: 10 }, () => null))
  );
  const focusCell = (r, c) => {
    if (r < 0 || r > 9 || c < 0 || c > 9) return;
    const el = inputRefs.current?.[r]?.[c];
    if (el) {
      el.focus();
      requestAnimationFrame(() => {
        try {
          el.select();
        } catch {}
      });
    }
  };

  function getNumsForGroup(group) {
    if (group === "10-19") return allNumbers[0];
    if (group === "30-39") return allNumbers[1];
    if (group === "50-59") return allNumbers[2];
    if (group === "ALL")
      return [...allNumbers[0], ...allNumbers[1], ...allNumbers[2]];
    return [];
  }

  function clearFPHighlights() {
    for (let row = 0; row < 10; row++) {
      for (let col = 0; col < 10; col++) {
        const numStr = String(row * 10 + col).padStart(2, "0");
        const element = document.querySelector(`[data-index="${numStr}"]`);
        if (element) {
          element.classList.remove("fp-highlight");
        }
      }
    }
  }

  function highlightFPSet(setIndex) {
    clearFPHighlights();
    if (setIndex === -1 || setIndex === null) return;
    FP_SETS[setIndex].forEach((numStr) => {
      const element = document.querySelector(`[data-index="${numStr}"]`);
      if (element) {
        element.classList.add("fp-highlight");
      }
    });
  }

  const handleArrowNav = (e, kind, row, col) => {
    const k = e.key;
    if (!["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(k))
      return;

    const focusGrid = (r, c) => {
      const target = document.querySelector(
        `input[data-grid-cell="1"][data-row="${r}"][data-col="${c}"]`
      );
      if (target && !target.disabled) {
        e.preventDefault();
        target.focus();
        requestAnimationFrame(() => {
          try {
            target.select();
          } catch {}
        });
        return true;
      }
      return false;
    };

    const focusColHeader = (c) => {
      const target = document.querySelector(
        `input[data-colheader="1"][data-col="${c}"]`
      );
      if (target) {
        e.preventDefault();
        target.focus();
        requestAnimationFrame(() => {
          try {
            target.select();
          } catch {}
        });
        return true;
      }
      return false;
    };

    const focusRowHeader = (r) => {
      const target = document.querySelector(
        `input[data-rowheader="1"][data-row="${r}"]`
      );
      if (target) {
        e.preventDefault();
        target.focus();
        requestAnimationFrame(() => {
          try {
            target.select();
          } catch {}
        });
        return true;
      }
      return false;
    };

    if (kind === "grid") {
      if (k === "ArrowRight") {
        if (col < 9 && focusGrid(row, col + 1)) return;
        if (col === 0 && focusRowHeader(row)) return;
      }
      if (k === "ArrowLeft") {
        if (col > 0 && focusGrid(row, col - 1)) return;
        if (col === 0 && focusRowHeader(row)) return;
      }
      if (k === "ArrowDown") {
        if (row < 9 && focusGrid(row + 1, col)) return;
      }
      if (k === "ArrowUp") {
        if (row > 0 && focusGrid(row - 1, col)) return;
        if (row === 0 && focusColHeader(col)) return;
      }
      return;
    }

    if (kind === "colHeader") {
      if (k === "ArrowLeft") {
        if (col > 0 && focusColHeader(col - 1)) return;
      }
      if (k === "ArrowRight") {
        if (col < 9 && focusColHeader(col + 1)) return;
      }
      if (k === "ArrowDown") {
        if (focusGrid(0, col)) return;
      }
      return;
    }

    if (kind === "rowHeader") {
      if (k === "ArrowUp") {
        if (row > 0 && focusRowHeader(row - 1)) return;
      }
      if (k === "ArrowDown") {
        if (row < 9 && focusRowHeader(row + 1)) return;
      }
      if (k === "ArrowRight") {
        if (focusGrid(row, 0)) return;
      }
      return;
    }
  };

const handleCheckTicketStatus = async (ticketNumber) => {
  try {
    if (!ticketNumber?.trim()) {
      toast.error("Please enter or scan a Ticket ID.");
      return;
    }

    const res = await axios.post(
      `${process.env.NEXT_PUBLIC_API_BASE_URL}/is-claim-tickets`,
      { ticketId: ticketNumber.trim() }
    );

    const data = res.data;

    // ------------------ ERROR / NOT FOUND ------------------
    if (data.status === "error" || res.status === 404) {
      setIsClaimable(false);
      setTicketStatusData({
        status: "error",
        ticketId: ticketNumber,
        drawTimes: [],
        drawDate: "-",
        matches: [],
        totalWinningAmount: 0,
        claimedDate: null,
        claimedTime: null,
      });
      setTicketStatusModalOpen(true);
      return;
    }

    // PREPARE SAFE VALUES
    const drawTimes = data?.drawTimes || [];
    const matches = data?.matches || [];
    const totalWinningAmount = data?.totalWinningAmount || 0;

    // ------------------ ALREADY CLAIMED ------------------
    if (data.status === "already_claimed") {
      setIsClaimable(false);
      setTicketStatusData({
        status: "already_claimed",
        ticketId: ticketNumber,
        drawTimes: drawTimes,
        drawDate: data.drawDate || "-",
        matches: [],
        totalWinningAmount: 0,
        claimedDate: data.claimedDate,
        claimedTime: data.claimedTime,
      });

      // Toast
      toast.error("⚠️ This ticket has already been claimed.");

      setTicketStatusModalOpen(true);
      return;
    }

    // ------------------ NO WIN ------------------
    if (data.status === "no_win") {
      setIsClaimable(false);
      setTicketStatusData({
        status: "no_win",
        ticketId: ticketNumber,
        drawTimes,
        drawDate: data.drawDate || "-",
        matches: [],
        totalWinningAmount: 0,
        claimedDate: null,
        claimedTime: null,
      });

      toast.error("❌ This ticket has no winning numbers.");

      setTicketStatusModalOpen(true);
      return;
    }

    // ------------------ NO WINNING DECLARATION YET ------------------
    if (data.status === "no_winning_data") {
      setIsClaimable(false);
      setTicketStatusData({
        status: "no_winning_data",
        ticketId: ticketNumber,
        drawTimes: [],
        drawDate: data.drawDate || "-",
        matches: [],
        totalWinningAmount: 0,
        claimedDate: null,
        claimedTime: null,
      });

      toast("ℹ️ Winning numbers not published yet.", { icon: "ℹ️" });

      setTicketStatusModalOpen(true);
      return;
    }

    // ------------------ WINNER ------------------
    if (data.status === "winner") {
      setIsClaimable(true);

      setTicketStatusData({
        status: "winner",
        ticketId: ticketNumber,
        drawTimes,
        drawDate: data.drawDate,
        matches: matches,
        totalWinningAmount: totalWinningAmount,
        claimedDate: null,
        claimedTime: null,
      });

      toast.success("🎉 This is a winning ticket! You can now claim it.");

      setTicketStatusModalOpen(true);
      return;
    }

    // ------------------ UNKNOWN STATUS ------------------
    setIsClaimable(false);
    setTicketStatusData({
      status: "error",
      ticketId: ticketNumber,
      drawTimes: [],
      drawDate: "-",
      matches: [],
      totalWinningAmount: 0,
      claimedDate: null,
      claimedTime: null,
    });
    setTicketStatusModalOpen(true);

  } catch (error) {
    console.error("❌ Error checking ticket:", error);

    setIsClaimable(false);
    setTicketStatusData({
      status: "error",
      ticketId: ticketNumber,
      drawTimes: [],
      drawDate: "-",
      matches: [],
      totalWinningAmount: 0,
      claimedDate: null,
      claimedTime: null,
    });

    setTicketStatusModalOpen(true);
  }
};


const handleClaimTicket = async () => {
  try {
    if (!transactionInput.trim()) {
      toast.error("Please enter a ticket ID or scan barcode.");
      return;
    }

    const res = await axios.post(
      `${process.env.NEXT_PUBLIC_API_BASE_URL}/save-claimed-ticket`,
      { ticketId: transactionInput.trim() }
    );

    const data = res.data || {};

    console.log("🎯 Claim API Response:", data);

    // 1️⃣ Already Claimed
    if (data.status === "already_claimed") {
      toast.error("⚠️ This ticket has already been claimed.");
      setIsClaimable(false);
      return;
    }

    // 2️⃣ No Win
    if (data.status === "no_win" || data.status === "no_winning") {
      toast.error("❌ This ticket has no winning numbers.");
      setIsClaimable(false);
      return;
    }

    // 3️⃣ No Winning Data
    if (data.status === "no_winning_data" || data.status === "no_match") {
      toast("ℹ️ No winning data declared for this draw.", { icon: "ℹ️" });
      setIsClaimable(false);
      return;
    }

    // 4️⃣ Ticket Not Found
    if (data.status === "error" && data.message === "Ticket not found") {
      toast.error("🚫 Ticket not found. Please check the ticket ID.");
      setIsClaimable(false);
      return;
    }

    // 5️⃣ Ticket Successfully Claimed (Winner)
    if (data.status === "ticket_claimed") {
      const totalPayout = (data.matches || []).reduce(
        (sum, m) => sum + (m.payout || 0),
        0
      );

      toast.success(
        `🎉 Winning ticket claimed successfully! ₹${totalPayout} credited.`
      );

      // disable claim button again
      setIsClaimable(false);

      // refresh balance & last ticket info
      await fetchBalanceLimit();

      // clear transaction input
      setTransactionInput("");
      return;
    }

    // 6️⃣ Fallback
    toast("⚠️ Unable to determine ticket claim result. Try again.", {
      icon: "⚠️",
    });
  } catch (err) {
    console.error("🔥 Error in handleClaimTicket:", err);

    const errMsg =
      err?.response?.data?.message ||
      err?.response?.data?.error ||
      err.message;

    if (err?.response?.status === 404) {
      toast.error("🚫 Ticket not found. Please check again.");
    } else {
      toast.error(`🔥 Error claiming ticket: ${errMsg}`);
    }

    setIsClaimable(false);
  }
};


  const colKeyToIndex = { "10-19": 0, "30-39": 1, "50-59": 2 };

  function handleColButton(colKey) {
    const colIndex = colKeyToIndex[colKey];
    if (activeCheckbox) persistActiveNumber(activeCheckbox);

    setSelected((prev) => {
      const colAllSelectedPrev = prev.every((rowArr) => rowArr[colIndex]);
      const next = prev.map((rowArr) => rowArr.slice());

      for (let r = 0; r < 10; r++) next[r][colIndex] = !colAllSelectedPrev;

      const newQuantities = next.map((row) => row.filter(Boolean).length);
      setQuantities(newQuantities);
      setPoints(newQuantities.map((q) => q * 2));

      setActiveFButtons(() => {
        const keys = [];
        if (next.every((r) => r[0])) keys.push("10-19");
        if (next.every((r) => r[1])) keys.push("30-39");
        if (next.every((r) => r[2])) keys.push("50-59");
        return keys;
      });

      setActiveColGroup(() => {
        if (!colAllSelectedPrev) return colKey;
        const keys = [];
        if (next.every((r) => r[0])) keys.push("10-19");
        if (next.every((r) => r[1])) keys.push("30-39");
        if (next.every((r) => r[2])) keys.push("50-59");
        return keys.length ? keys[keys.length - 1] : null;
      });

      setActiveCheckbox(null);

      if (!colAllSelectedPrev) {
        setCellOverrides({});
        setColumnHeaders(Array(10).fill(""));
        setRowHeaders(Array(10).fill(""));
      }

      return next;
    });
  }

  const handleColumnHeaderChange = (col, value) => {
    if (!/^\d{0,3}$/.test(value) || parseInt(value || "0", 10) > 999) return;

    setColumnHeaders((headers) => {
      const nextCols = headers.map((v, i) => (i === col ? value : v));

      if (activeCheckbox) {
        setStoreByNum((prev) => {
          const slot = ensureSlot(activeCheckbox);
          const merged = buildTicketsForNumber(
            activeCheckbox,
            nextCols,
            slot.rowHeader ?? Array(10).fill(""),
            checkboxInputs[activeCheckbox] || {}
          );
          return {
            ...prev,
            [activeCheckbox]: {
              ...slot,
              columnHeader: nextCols,
              tickets: merged,
            },
          };
        });
      }

      if (activeColGroup) {
        const nums = getNumsForGroup(activeColGroup);
        if (nums.length) {
          setStoreByNum((prev) => {
            const next = { ...prev };
            nums.forEach((n) => {
              const slot = ensureSlot(n);
              const merged = buildTicketsForNumber(
                n,
                nextCols,
                slot.rowHeader ?? Array(10).fill(""),
                checkboxInputs[n] || {}
              );
              next[n] = { ...slot, columnHeader: nextCols, tickets: merged };
            });
            return next;
          });
        }
      }
      return nextCols;
    });

    setCellOverrides((overrides) => {
      const updated = { ...overrides };
      for (let r = 0; r < 10; r++) delete updated[`${r}-${col}`];
      return updated;
    });
  };

  const handleRowHeaderChange = (row, value) => {
    if (!/^\d{0,3}$/.test(value) || parseInt(value || "0", 10) > 999) return;

    setRowHeaders((headers) => {
      const nextRows = headers.map((v, i) => (i === row ? value : v));

      if (activeCheckbox) {
        setStoreByNum((prev) => {
          const slot = ensureSlot(activeCheckbox);
          const merged = buildTicketsForNumber(
            activeCheckbox,
            slot.columnHeader ?? Array(10).fill(""),
            nextRows,
            checkboxInputs[activeCheckbox] || {}
          );
          return {
            ...prev,
            [activeCheckbox]: { ...slot, rowHeader: nextRows, tickets: merged },
          };
        });
      }

      if (activeColGroup) {
        const nums = getNumsForGroup(activeColGroup);
        if (nums.length) {
          setStoreByNum((prev) => {
            const next = { ...prev };
            nums.forEach((n) => {
              const slot = ensureSlot(n);
              const merged = buildTicketsForNumber(
                n,
                slot.columnHeader ?? Array(10).fill(""),
                nextRows,
                checkboxInputs[n] || {}
              );
              next[n] = { ...slot, rowHeader: nextRows, tickets: merged };
            });
            return next;
          });
        }
      }
      return nextRows;
    });

    setCellOverrides((overrides) => {
      const updated = { ...overrides };
      for (let c = 0; c < 10; c++) delete updated[`${row}-${c}`];
      return updated;
    });
  };

  const [remainSecs, setRemainSecs] = useState(() => getRemainTime());
  const timerRef = useRef();

  // Barcode scanner: Enter -> check ticket status
  useEffect(() => {
    const inputEl = document.querySelector(
      'input[placeholder="Transaction No/Bar Code"]'
    );
    if (!inputEl) return;

    inputEl.focus();

    const handleScanEnter = (e) => {
      if (e.key === "Enter") {
        const scannedValue = e.target.value.trim();
        if (scannedValue) {
          setTransactionInput(scannedValue);
          handleCheckTicketStatus(scannedValue);
        }
      }
    };

    inputEl.addEventListener("keydown", handleScanEnter);
    return () => inputEl.removeEventListener("keydown", handleScanEnter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setRemainSecs(getRemainTime());
    timerRef.current = setInterval(() => {
      setRemainSecs(getRemainTime());
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, []);

  useEffect(() => {
    const newQuantities = selected.map((row) => row.filter(Boolean).length);
    const newPoints = newQuantities.map((q) => q * 2);
    setQuantities(newQuantities);
    setPoints(newPoints);
  }, [selected]);

  useEffect(() => {
    if (remainSecs === 0) {
      setCurrentDrawSlot(getNextDrawSlot(DRAW_TIMES));
    }
  }, [remainSecs]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentDrawSlot(getNextDrawSlot(DRAW_TIMES));
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const min = String(Math.floor(remainSecs / 60)).padStart(2, "0");
  const sec = String(remainSecs % 60).padStart(2, "0");
  const remainTime = `${min}:${sec}`;
  const drawDate = getTodayDateString();

  const toggle = (row, col) => {
    setSelected((prev) => {
      const copy = prev.map((arr) => arr.slice());
      copy[row][col] = !copy[row][col];

      setQuantities((prevQuantities) => {
        const updatedQuantities = [...prevQuantities];
        const selectedCount = copy[row].filter(Boolean).length;

        updatedQuantities[row] = selectedCount;

        setPoints((prevPoints) => {
          const updatedPoints = [...prevPoints];
          updatedPoints[row] = updatedQuantities[row] * 2;
          return updatedPoints;
        });

        return updatedQuantities;
      });

      return copy;
    });
  };

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === "F10") {
        e.preventDefault();
        window.location.reload();
      }

      const activateGroup = (colIdx, colKey) => {
        if (activeCheckbox) persistActiveNumber(activeCheckbox);

        setSelected((prev) => {
          const colAllSelectedPrev = prev.every((rowArr) => rowArr[colIdx]);
          const next = prev.map((rowArr) => rowArr.slice());

          for (let r = 0; r < 10; r++) next[r][colIdx] = !colAllSelectedPrev;

          const newQuantities = next.map((row) => row.filter(Boolean).length);
          setQuantities(newQuantities);
          setPoints(newQuantities.map((q) => q * 2));

          setActiveFButtons(() => {
            const keys = [];
            if (next.every((r) => r[0])) keys.push("10-19");
            if (next.every((r) => r[1])) keys.push("30-39");
            if (next.every((r) => r[2])) keys.push("50-59");
            return keys;
          });

          setActiveColGroup(() => {
            if (!colAllSelectedPrev) return colKey;
            const keys = [];
            if (next.every((r) => r[0])) keys.push("10-19");
            if (next.every((r) => r[1])) keys.push("30-39");
            if (next.every((r) => r[2])) keys.push("50-59");
            return keys.length ? keys[keys.length - 1] : null;
          });

          setActiveCheckbox(null);

          if (!colAllSelectedPrev) {
            setCellOverrides({});
            setColumnHeaders(Array(10).fill(""));
            setRowHeaders(Array(10).fill(""));
          }

          return next;
        });
      };

      if (e.key === "F7") {
        e.preventDefault();
        activateGroup(0, "10-19");
      }
      if (e.key === "F8") {
        e.preventDefault();
        activateGroup(1, "30-39");
      }
      if (e.key === "F9") {
        e.preventDefault();
        activateGroup(2, "50-59");
      }

      if (e.key === "F6") {
        e.preventDefault();
        if (!isPrinting) handlePrint();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFilter, activeCheckbox, activeColGroup, isPrinting]);

  function getTicketList() {
    const out = [];
    const seen = new Set();

    const selectedNumbers = [];
    for (let colIdx = 0; colIdx < allNumbers.length; colIdx++) {
      for (let rowIdx = 0; rowIdx < allNumbers[colIdx].length; rowIdx++) {
        if (selected[rowIdx][colIdx]) {
          selectedNumbers.push(allNumbers[colIdx][rowIdx]);
        }
      }
    }

    selectedNumbers.forEach((num) => {
      const slot = ensureSlot(num);
      const headerTickets = expandHeaderTickets(
        num,
        slot.columnHeader || Array(10).fill(""),
        slot.rowHeader || Array(10).fill("")
      );

      const perCell = checkboxInputs[num] || {};
      Object.entries(perCell).forEach(([cellIndex, val]) => {
        if (val && val !== "0") {
          const idx = String(cellIndex).padStart(2, "0");
          headerTickets[`${num}-${idx}`] = String(val);
        }
      });

      Object.entries(headerTickets).forEach(([k, v]) => {
        if (!seen.has(k)) {
          seen.add(k);
          out.push(`${k} : ${v}`);
        }
      });
    });

    return out;
  }

  function getFPSetIndexForNumber(numStr) {
    return FP_SETS.findIndex((set) => set.includes(numStr));
  }

  function getLoginIdFromToken() {
    const token = localStorage.getItem("userToken");
    if (!token) return null;
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      return payload.id;
    } catch (e) {
      return null;
    }
  }

  useEffect(() => {
    const id = getLoginIdFromToken();
    if (!id) return;

    setGameIdBox(String(id));

    axios
      .post(`${process.env.NEXT_PUBLIC_API_BASE_URL}/navbar-details`, {
        loginId: id,
      })
      .then((res) => {
        setLastPoints(parseInt(res.data.lastTotalPoint) ?? "-");
        setLastTicket(res.data.lastTicketNumber ?? "-");
        setBalance(res.data.balance ?? "-");
      })
      .catch(() => {
        setLastPoints("-");
        setLastTicket("-");
        setBalance("-");
      });
  }, []);

  function getFormattedDateTime() {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    return `${pad(now.getDate())}-${pad(
      now.getMonth() + 1
    )}-${now.getFullYear()} ${pad(now.getHours())}:${pad(
      now.getMinutes()
    )}:${pad(now.getSeconds())}`;
  }

const generatePrintReceipt = (data, ticketId) => {
  return new Promise((resolve) => {
    const lineHeight = 4;
    const ticketArray = (data.ticketNumber || "").split(", ").filter(Boolean);
    const ticketRows = Math.ceil(ticketArray.length / 3);

    const afterListLineGap = 5;
    const totalsBlock = 5 + 5 + 8;
    const barcodeBlock = 20 + 10;

    let requiredHeight =
      50 +
      ticketRows * lineHeight +
      afterListLineGap +
      totalsBlock +
      barcodeBlock;

    const pageHeight = Math.max(297, requiredHeight);

    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: [80, pageHeight],
    });

    pdf.setFontSize(10);
    pdf.text("SKILL KING", 40, 10, { align: "center" });
    pdf.setFontSize(8);
    pdf.text("This game for Adults Amusement Only", 40, 15, {
      align: "center",
    });
    pdf.text("GST No Issued by Govt of India", 40, 20, { align: "center" });
    pdf.text("GST No: In Process", 40, 25, { align: "center" });
    pdf.text(`Date: ${data.gameTime}`, 40, 30, { align: "center" });

    pdf.setLineWidth(0.5);
    pdf.line(5, 33, 75, 33);

    pdf.setFontSize(9);
    const drawTimeText = Array.isArray(data.drawTime)
      ? data.drawTime.length > 1
        ? `Draw Times: ${data.drawTime.join(", ")}`
        : `Draw Time: ${data.drawTime[0]}`
      : `Draw Time: ${data.drawTime}`;
    pdf.text(drawTimeText, 5, 38);
    pdf.text(`Login Id: ${data.loginId}`, 5, 43);

    pdf.line(5, 45, 75, 45);

    let yPos = 50;
    for (let i = 0; i < ticketArray.length; i += 3) {
      let rowText = "";
      for (let j = 0; j < 3 && i + j < ticketArray.length; j++) {
        const ticket = ticketArray[i + j];
        const formattedTicket = ticket.substring(0, 18);
        rowText += formattedTicket.padEnd(25, " ");
      }
      pdf.setFontSize(7);
      pdf.text(rowText.trim(), 5, yPos);
      yPos += lineHeight;
    }

    pdf.line(5, yPos, 75, yPos);
    yPos += 5;

    pdf.setFontSize(10);
    pdf.text(`Total Quantity : ${data.totalQuatity}`, 5, yPos);
    yPos += 5;
    pdf.text(`Total Amount : ${data.totalPoints}`, 5, yPos);
    yPos += 8;

    // ✅ Keep only the numeric ticketId encoded in the barcode
    const barcodeValue = String(ticketId);

    // Generate the barcode image
    const canvas = document.createElement("canvas");
    JsBarcode(canvas, barcodeValue, {
      format: "CODE128",
      width: 2,
      height: 50,
      displayValue: false,
      margin: 5,
    });

    const barcodeImage = canvas.toDataURL("image/png");
    pdf.addImage(barcodeImage, "PNG", 10, yPos, 60, 20);

    // Add text "SK<ticketId>" below barcode (printed only)
    pdf.setFontSize(12);
    pdf.text(`SK${ticketId}`, 40, yPos + 28, { align: "center" });

    // ✅ Print using hidden iframe
    pdf.autoPrint();
    const pdfBlob = pdf.output("blob");
    const pdfUrl = URL.createObjectURL(pdfBlob);
    
    // Create hidden iframe for printing
    const printFrame = document.createElement("iframe");
    printFrame.style.position = "fixed";
    printFrame.style.right = "0";
    printFrame.style.bottom = "0";
    printFrame.style.width = "0";
    printFrame.style.height = "0";
    printFrame.style.border = "none";
    
    document.body.appendChild(printFrame);
    
    // Track if print dialog was opened
    let printDialogOpened = false;
    
    printFrame.onload = function() {
      try {
        printFrame.contentWindow.focus();
        printFrame.contentWindow.print();
        printDialogOpened = true;
        
        // ✅ Wait longer before cleanup - give user time to print/cancel
        setTimeout(() => {
          if (document.body.contains(printFrame)) {
            document.body.removeChild(printFrame);
          }
          URL.revokeObjectURL(pdfUrl);
          resolve();
        }, 5000); // Wait 5 seconds instead of 1
        
      } catch (err) {
        console.error("Print error:", err);
        if (document.body.contains(printFrame)) {
          document.body.removeChild(printFrame);
        }
        URL.revokeObjectURL(pdfUrl);
        toast.error("Unable to print. Please try again.");
        resolve();
      }
    };
    
    // Fallback cleanup if iframe fails to load
    setTimeout(() => {
      if (!printDialogOpened && document.body.contains(printFrame)) {
        document.body.removeChild(printFrame);
        URL.revokeObjectURL(pdfUrl);
        resolve();
      }
    }, 10000); // 10 second absolute timeout
    
    printFrame.src = pdfUrl;
  });
};


function handleCheckboxClick(num) {
  setSelectedNumbers((prev) => {
    let newSel = [...prev];
    if (newSel.includes(num)) {
      // ✅ Deselect if already selected
      newSel = newSel.filter((n) => n !== num);
    } else {
      // ✅ Add normally
      newSel.push(num);
    }
    return newSel;
  });
  setActiveNumber(null); // clear blue highlight when checkbox changes
}

function assignValueToNumber(num, value, cellKey) {
  if (!/^\d*$/.test(value)) return;

  setCheckboxInputs((prev) => {
    const updated = { ...prev };
    if (!updated[num]) updated[num] = {};
    updated[num][cellKey] = value;
    return updated;
  });

  setStoreByNum((prev) => {
    const slot = ensureSlot(num);
    const t = { ...(slot.tickets || {}) };
    t[`${num}-${cellKey}`] = value;
    return { ...prev, [num]: { ...slot, tickets: t } };
  });

  try {
    const key = `${num}-${cellKey}`;
    const storedData = JSON.parse(localStorage.getItem("skillJackpotData") || "{}");
    storedData[key] = value;
    localStorage.setItem("skillJackpotData", JSON.stringify(storedData));
  } catch (err) {
    console.error("LocalStorage update failed:", err);
  }
}


  async function fetchBalanceLimit() {
    try {
      const id = getLoginIdFromToken();
      if (!id) return;

      const res = await axios.post(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/navbar-details`,
        { loginId: id }
      );

      setLastPoints(parseInt(res.data.lastTotalPoint) ?? "-");
      setLastTicket(res.data.lastTicketNumber ?? "-");
      setBalance(res.data.balance ?? "-");
    } catch (err) {
      console.error("Error fetching balance limit:", err);
      setBalance("-");
    }
  }

  useEffect(() => {
    const beforeUnload = () => {
      if (activeCheckbox) persistActiveNumber(activeCheckbox);
    };
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [activeCheckbox, columnHeaders, rowHeaders, checkboxInputs]);

const handlePrint = async () => {
  if (isPrintingRef.current) return;
  isPrintingRef.current = true;
  setIsPrinting(true);

  try {
    const ticketList = getTicketList();

    // 🚫 Restrict printing during the last 30 seconds before draw
    if (remainSecs <= 30) {
      toast.error(
        "Print is disabled during the last 30 seconds before draw time!"
      );
      return;
    }

    const totalUpdatedQuantity = updatedQuantity.reduce(
      (sum, val) => sum + val,
      0
    );

    if (totalUpdatedQuantity === 0) {
      toast.error("No quantity selected or no tickets to print.");
      return;
    }

    const drawMultiplier =
      advanceDrawTimes && advanceDrawTimes.length > 0
        ? advanceDrawTimes.length
        : 1;

    const totalUpdatedPoints = updatedPoints.reduce(
      (sum, val) => sum + val,
      0
    );

    const displayTotalQuantity = totalUpdatedQuantity * drawMultiplier;
    const displayTotalPoints = totalUpdatedPoints * drawMultiplier;

    const loginId = getLoginIdFromToken();
    if (!loginId) {
      toast.error("User not logged in.");
      return;
    }

    const gameTime = getFormattedDateTime();

    // 🧾 Build payload
    const payload = {
      gameTime,
      ticketNumber: ticketList.join(", "),
      totalQuatity: displayTotalQuantity,
      totalPoints: displayTotalPoints,
      loginId,
      drawTime:
        advanceDrawTimes.length > 0 ? advanceDrawTimes : [currentDrawSlot],
    };

    // 📤 Send to backend
    const response = await axios.post(
      `${process.env.NEXT_PUBLIC_API_BASE_URL}/saveTicket`,
      payload
    );

    setRefreshKey((prev) => prev + 1);

    if (response.status === 201) {
      const data = response.data || {};
      const ticketObjId = data.ticket?.id ?? data.ticket?.ticketId ?? null;
      const rootId = data.ticketId ?? data.id ?? null;
      const ticketId = String(ticketObjId ?? rootId ?? Date.now());

      toast.success(`Tickets saved successfully! Ticket ID: ${ticketId}`);

      // 🖨️ Generate receipt and print
      await generatePrintReceipt(
        {
          gameTime,
          drawTime:
            advanceDrawTimes.length > 0 ? advanceDrawTimes : [currentDrawSlot],
          loginId,
          ticketNumber: ticketList.join(", "),
          totalQuatity: displayTotalQuantity,
          totalPoints: displayTotalPoints,
        },
        ticketId
      );

      // 🧮 Refresh updated balance after successful print
      await fetchBalanceLimit();

      // ✅ COMPLETE RESET AFTER SUCCESSFUL PRINT
      setSelected(Array(10).fill(null).map(() => Array(3).fill(false)));
      setQuantities(Array(10).fill(0));
      setPoints(Array(10).fill(0));
      setCellOverrides({});
      setColumnHeaders(Array(10).fill(""));
      setRowHeaders(Array(10).fill(""));
      setCheckboxInputs({});
      setStoreByNum({});
      setActiveCheckbox(null);
      setActiveColGroup(null);
      setActiveNumber(null);
      setSelectedNumbers([]);
      setTransactionInput("");
      setAdvanceDrawTimes([]);

      // 🧹 Clear localStorage for fresh start
      localStorage.removeItem("checkboxInputs");
      localStorage.removeItem(LS_KEY);
      localStorage.removeItem("skillJackpotData");
      
    } else {
      toast.error(
        "Failed to save tickets: " +
          (response.data?.message || "Unknown error")
      );
    }
  } catch (error) {
    toast.error(
      "Error saving tickets: " +
        (error?.response?.data?.message ||
          error?.response?.data?.error ||
          error.message)
    );
  } finally {
    await fetchBalanceLimit();
    isPrintingRef.current = false;
    setIsPrinting(false);
  }
};


  const totalUpdatedQuantity = updatedQuantity.reduce(
    (sum, val) => sum + val,
    0
  );
  const totalUpdatedPoints = updatedPoints.reduce((sum, val) => sum + val, 0);
  const drawMultiplier =
    advanceDrawTimes && advanceDrawTimes.length > 0
      ? advanceDrawTimes.length
      : 1;
  const displayTotalQuantity = totalUpdatedQuantity * drawMultiplier;
  const displayTotalPoints = totalUpdatedPoints * drawMultiplier;

  const canPrint = !isBlocked && remainSecs > 30 && displayTotalQuantity > 0;


return (
  <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900" style={{ minWidth: '1400px' }}>
    <div className="w-full h-fit">
      <ShowResult drawTime={currentDrawSlot} refreshKey={refreshKey} />
    </div>

    {/* Header */}
    <div className="w-full flex items-center justify-between gap-4 px-4" style={{ minWidth: '1400px' }}>
      {/* LEFT: Filters */}
<div className="w-auto flex flex-col gap-3">
  <div className="flex gap-2 text-sm">
    {[
      {
        label: "All",
        value: "all",
        activeClass: "from-purple-600 to-pink-600",
      },
      {
        label: "Even",
        value: "even",
        activeClass: "from-blue-600 to-indigo-600",
      },
      {
        label: "Odd",
        value: "odd",
        activeClass: "from-rose-600 to-red-500",
      },
    ].map((btn) => (
      <button
        key={btn.value}
        onClick={() => {
          const turningOff = activeTypeFilter === btn.value;

          if (turningOff) {
            // 🔴 Turn off active type
            setActiveTypeFilter(null);

            // 🧹 If "All" was active → uncheck all boxes and reset totals
            if (btn.value === "all") {
              setSelected((prev) => prev.map((row) => row.map(() => false)));
              setQuantities(Array(10).fill(0));
              setPoints(Array(10).fill(0));
              setActiveCheckbox(null);
              setActiveColGroup(null);
              setSelectedNumbers([]);
              setActiveNumber(null);
            }
          } else {
            // 🟢 Activate new type filter
            setActiveTypeFilter(btn.value);

            // ✅ “All” button logic: select all checkboxes & numbers
            if (btn.value === "all") {
              // Persist current number if active
              if (activeCheckbox) persistActiveNumber(activeCheckbox);

              // Select every checkbox using existing logic
              for (let r = 0; r < 10; r++) {
                for (let c = 0; c < 3; c++) {
                  if (!selected[r][c]) {
                    const num = allNumbers[c][r];
                    handleCheckboxClick(num); // adds number to selectedNumbers
                    toggle(r, c); // updates selected + quantities + points
                  }
                }
              }

              // Mark ALL as active group (for consistent UI logic)
              setActiveColGroup("ALL");

              // Ensure every checkbox visually checked
              setSelected(Array(10).fill(null).map(() => Array(3).fill(true)));
            }
          }
        }}
        className={`px-1 py-2 rounded-md border-b-3 border-gray-500/30 bg-gradient-to-bl from-gray-100 to-gray-300 font-semibold transition-all duration-200 flex items-center gap-2 min-w-[80px] justify-center ${
          activeTypeFilter === btn.value
            ? `text-white bg-gradient-to-r ${btn.activeClass} shadow-lg`
            : "text-[#4A314D] bg-[#f3e7ef] hover:bg-[#ede1eb] shadow-md"
        }`}
      >
        {btn.label}
      </button>
    ))}

    {/* FP Mode */}
    <button
      onClick={() => {
        setIsFPMode(!isFPMode);
        if (isFPMode) {
          clearFPHighlights();
          setActiveFPSetIndex(null);
        }
      }}
      className={`px-2 py-1 text-sm rounded-md border-b-3 border-green-500/30 font-semibold transition-all duration-200 flex items-center gap-2 min-w-[80px] justify-center ${
        isFPMode
          ? "text-white bg-gradient-to-r from-green-600 to-lime-600 shadow-lg"
          : "text-[#4A314D] bg-[#ece6fc] border border-[#968edb] hover:bg-[#e5def7] shadow-md"
      }`}
    >
      FP Mode
    </button>
  </div>
</div>


      {/* CENTER: Timer & Draw */}
      <div className="flex-1 flex items-center justify-between gap-4">
        <div className="flex-1 flex items-center justify-center gap-6">
          <div className="flex items-center gap-3 px-4 py-2 bg-slate-800/90 border border-slate-700/60 rounded-sm shadow-md min-w-[180px]">
            <Clock className="w-4 h-4 text-red-400 animate-pulse flex-shrink-0" />
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-400">
                Time Remaining
              </span>
              <span className="text-lg font-mono font-bold text-red-400">
                {remainTime}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 px-4 py-2 bg-slate-800/90 border border-slate-700/60 rounded-sm shadow-md min-w-[200px]">
            <Calendar className="w-4 h-4 text-green-400 flex-shrink-0" />
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-400">
                Draw Date & Time
              </span>
              <span className="text-sm font-mono font-bold text-red-400">
                {drawDate} | {currentDrawSlot}
              </span>
            </div>
          </div>
        </div>

        {/* RIGHT: Game Status */}
        <div className="w-auto">
          <div className="grid grid-cols-4 gap-2 min-w-[400px]">
            <div className="p-2 bg-slate-800/70 text-center rounded-sm border border-slate-700/50 shadow-md flex flex-col">
              <span className="text-[8px] text-slate-400 font-medium">
                Game ID
              </span>
              <span className="text-lg font-mono font-bold text-purple-400 truncate">
                {gameIdBox}
              </span>
            </div>
            <div className="p-2 bg-slate-800/70 text-center rounded-sm border border-slate-700/50 shadow-md flex flex-col">
              <span className="text-[8px] text-slate-400 font-medium">
                Last Points
              </span>
              <span className="text-lg font-mono font-bold text-pink-400">
                {lastPoints}
              </span>
            </div>
            <div className="p-2 bg-slate-800/70 text-center rounded-sm border border-slate-700/50 shadow-md flex flex-col">
              <span className="text-[8px] text-slate-400 font-medium">
                Last Ticket
              </span>
              <span className="text-lg font-mono font-bold text-cyan-400 truncate">
                {lastTicket}
              </span>
            </div>
            <div className="p-2 bg-slate-800/70 rounded-sm border text-center border-slate-700/50 shadow-md flex flex-col">
              <span className="text-[8px] text-slate-400 font-medium">
                Balance Limit
              </span>
              <span className="text-lg font-mono font-bold text-emerald-400">
                {balance}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    {/* Main Content Row */}
    <div className="flex p-2 gap-2" style={{ minWidth: '1400px' }}>
      {/* Left Panel */}
      <div className="rounded-sm shadow-2xl bg-gradient-to-b from-slate-100/95 to-slate-300/80 p-2 border-2 border-gray-300/50 min-h-[600px] w-[320px] backdrop-blur-sm flex-shrink-0">
        <div className="flex gap-3 mb-2">
          {[
            { key: "10-19", label: "F7 (10-19)" },
            { key: "30-39", label: "F8 (30-39)" },
            { key: "50-59", label: "F9 (50-59)" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => handleColButton(tab.key)}
              className={`px-2 py-1 rounded-md border-b-4 border-purple-800/50 font-bold text-sm w-full text-white ${
                activeFilter === tab.key
                  ? "bg-gradient-to-r from-purple-700 to-pink-600 scale-105 shadow-lg"
                  : "bg-gradient-to-r from-purple-500 to-pink-500"
              } hover:from-pink-500 hover:to-purple-500 shadow-lg hover:shadow-purple-500/25 transition-all duration-300 active:scale-95 border border-purple-400/30`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Number + Checkbox Grid */}
        <div className="grid grid-cols-3 gap-1 mb-4 mt-5">
          {range(0, 9).map((row) =>
            allNumbers.map((colArray, colIdx) => {
              const num = colArray[row];
              const color =
                numberBoxColors[row % numberBoxColors.length];
              return (
                <div
                  key={num}
                  className={`relative flex items-center gap-1 px-2 py-1 ${color} hover:scale-105 transition-all duration-200 cursor-pointer`}
                  style={{
                    border: "2px solid #fff",
                    borderRadius: "12px",
                    margin: "0",
                    boxShadow: "0 4px 8px rgba(0,0,0,0.15)",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selected[row][colIdx]}
                    onChange={() => {
                      const checkboxNum = allNumbers[colIdx][row];
                      const wasChecked = selected[row][colIdx];
                      handleCheckboxClick(checkboxNum);
                      toggle(row, colIdx);

                      if (!wasChecked) {
                        if (activeCheckbox)
                          persistActiveNumber(activeCheckbox);

                        setActiveCheckbox(checkboxNum);
                        setActiveColGroup(null);

                        setCellOverrides({});
                        setColumnHeaders(Array(10).fill(""));
                        setRowHeaders(Array(10).fill(""));

                        loadNumberIntoUI(checkboxNum);
                      } else {
                        setCheckboxInputs((prev) => {
                          const updated = { ...prev };
                          delete updated[checkboxNum];
                          return updated;
                        });

                        if (activeCheckbox === checkboxNum) {
                          persistActiveNumber(checkboxNum);
                          setActiveCheckbox(null);
                          setActiveColGroup(null);
                          setColumnHeaders(Array(10).fill(""));
                          setRowHeaders(Array(10).fill(""));
                          setCellOverrides({});
                        }
                      }
                    }}
                    className="peer appearance-none w-6 h-6 rounded bg-white border-2 border-[#4A314D] checked:bg-gradient-to-r checked:from-purple-600 checked:to-pink-600 checked:border-purple-600 flex-shrink-0 transition-all duration-200 hover:scale-110"
                    style={{
                      boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                    }}
                  />
                  <span
                    className={`absolute left-3 top-3 text-white text-sm font-bold pointer-events-none transition-all duration-200 ${
                      selected[row][colIdx]
                        ? "opacity-100 scale-100"
                        : "opacity-0 scale-50"
                    }`}
                  >
                    ✓
                  </span>
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleNumberBox(row, colIdx);
                      setActiveCheckbox(num);
                      setActiveColGroup(null);
                      setActiveNumber((prev) => (prev === num ? null : num));
                    }}
                    className={`w-10 h-7 flex items-center justify-center font-bold text-md border-2 rounded transition-all
                    ${activeNumber === num ? "bg-blue-600 text-white" :
                      selectedNumbers.includes(num) ? "bg-purple-700 text-white" :
                      "bg-white text-[#4A314D]"}`}
                    style={{
                      boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                    }}
                  >
                    {num}
                  </span>
                </div>
              );
            })
          )}
        </div>

        {/* Buttons */}
        <div className="flex gap-3 mt-6">
          <button
            type="button"
            onClick={handlePrint}
            disabled={!canPrint || isPrinting || isBlocked}
            className={`
              flex-1 flex items-center justify-center gap-2 py-2 rounded-md 
              border-b-4 border-blue-900/80 font-semibold text-white 
              bg-gradient-to-r from-purple-600 to-blue-500 shadow-lg 
              hover:shadow-purple-500/25 hover:from-purple-500 hover:to-blue-400 
              transition-all duration-300 hover:scale-105 active:scale-95
              ${(!canPrint || isPrinting || isBlocked) ? "opacity-50 cursor-not-allowed" : ""}
            `}
          >
            {isBlocked ? "Blocked" : isPrinting ? "Printing..." : "Print"}
          </button>
          <button
            onClick={() => {
              window.location.reload();
              setCheckboxInputs({});
              localStorage.removeItem("checkboxInputs");
              setStoreByNum({});
              localStorage.removeItem(LS_KEY);
            }}
            className="flex-1 flex items-center justify-center gap-2 py-2 rounded-sm font-semibold text-white bg-gradient-to-r border-b-4 border-red-600/50 from-pink-500 to-red-500 shadow-lg hover:shadow-pink-500/25 hover:from-pink-400 hover:to-red-400 transition-all duration-300 hover:scale-105 active:scale-95 text-sm"
          >
            <RotateCcw className="w-5 h-5" />
            Reset (F10)
          </button>
        </div>
      </div>

      {/* Main Table */}
      <div className="flex-1 bg-gradient-to-b from-slate-800/70 to-slate-900/90 rounded-sm shadow-2xl border-2 border-slate-700/50 transparent-scrollbar p-1 overflow-hidden backdrop-blur-sm">
        <div className="overflow-x-auto transparent-scrollbar">
          <table className="w-full">
            
            <tbody>
              {/* Column Headers */}
              <tr>
                <td className="bg-transparent"></td>
                {range(0, 9).map((col) => (
                  <td
                    key={`col-header-${col}`}
                    className="p-1 text-center border-r border-slate-700/20 last:border-r-0"
                  >
                    <input
                      type="text"
                      className="w-16 h-6  rounded bg-cyan-900/80 text-cyan-200 border-2 border-cyan-400/40 text-center font-bold shadow focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 outline-none transition-all duration-200 hover:border-cyan-300"
                      maxLength={3}
                      value={columnHeaders[col]}
                      onChange={(e) =>
                        handleColumnHeaderChange(col, e.target.value)
                      }
                      data-colheader="1"
                      data-col={col}
                      onKeyDownCapture={(e) =>
                        handleArrowNav(e, "colHeader", 0, col)
                      }
                    />
                  </td>
                ))}
                <td className="bg-transparent"></td>
                <td className="p-1 text-center font-bold text-yellow-400">
                  Quantity
                </td>
                <td className="p-1 text-center font-bold text-pink-400">
                  Amounts
                </td>
              </tr>

              {/* Grid Rows */}
              {range(0, 9).map((row) => (
                <tr
                  key={row}
                  className="border-b border-slate-700/30 hover:bg-slate-800/20 transition-colors"
                >
                  <td className=" text-center border-r border-slate-700/20">
                    <div className="text-xs text-white font-bold py-2"></div>
                    <input
                      type="text"
                      className="w-16 h-6 rounded bg-lime-900/80 text-lime-200 border-2 border-lime-400/40 text-center font-bold shadow focus:border-lime-500 focus:ring-2 focus:ring-lime-500/20 outline-none transition-all duration-200 hover:border-lime-300"
                      maxLength={3}
                      value={rowHeaders[row]}
                      onChange={(e) =>
                        handleRowHeaderChange(row, e.target.value)
                      }
                      data-rowheader="1"
                      data-row={row}
                      onKeyDownCapture={(e) =>
                        handleArrowNav(e, "rowHeader", row, 0)
                      }
                    />
                  </td>

                  {range(0, 9).map((col) => {
                    const idxStr = String(row * 10 + col).padStart(2, "0");
                    const disabled = isCellDisabled(row, col);
                    const isFPHighlighted =
                      isFPMode &&
                      activeFPSetIndex !== null &&
                      FP_SETS[activeFPSetIndex].includes(idxStr);

                    const key = `${row}-${col}`;
                    const cellIndex = row * 10 + col;

                    const cellValue = (() => {
                      if (
                        cellOverrides[key] !== undefined &&
                        cellOverrides[key] !== ""
                      )
                        return cellOverrides[key];

                      const headerFallback = (rows, cols) => {
                        if (disabled) return "";
                        const rHas = rows[row] !== "" && rows[row] != null;
                        const cHas = cols[col] !== "" && cols[col] != null;
                        const rVal = parseInt(rows[row] || "0", 10);
                        const cVal = parseInt(cols[col] || "0", 10);
                        if (rHas && cHas) return String(rVal + cVal);
                        if (cHas) return String(cVal);
                        if (rHas) return String(rVal);
                        return "";
                      };

                      const addHeaders = (manualStr, rows, cols) => {
                        const rHas =
                          rows[row] !== "" && rows[row] != null;
                        const cHas =
                          cols[col] !== "" && cols[col] != null;
                        const rVal = parseInt(rows[row] || "0", 10);
                        const cVal = parseInt(cols[col] || "0", 10);
                        const headerSum =
                          (rHas ? rVal : 0) + (cHas ? cVal : 0);
                        const manual = parseInt(manualStr || "0", 10);
                        return String(manual + headerSum);
                      };

                      if (activeCheckbox) {
                        const slot = storeByNum[activeCheckbox];
                        const effRows =
                          slot?.rowHeader ?? rowHeaders;
                        const effCols =
                          slot?.columnHeader ??
                          columnHeaders;

                        const perCell =
                          checkboxInputs[activeCheckbox];
                        const manual = perCell
                          ? perCell[cellIndex]
                          : undefined;

                        if (manual !== undefined && manual !== "") {
                          return addHeaders(
                            manual,
                            effRows,
                            effCols
                          );
                        }

                        const hv = headerFallback(
                          effRows,
                          effCols
                        );
                        if (hv !== "") return hv;
                      }

                      if (activeColGroup) {
                        const nums = getNumsForGroup(
                          activeColGroup
                        );

                        if (nums.length) {
                          for (const n of nums) {
                            const m =
                              checkboxInputs[n]?.[
                                cellIndex
                              ];
                            if (
                              m !== undefined &&
                              m !== ""
                            ) {
                              return addHeaders(
                                m,
                                rowHeaders,
                                columnHeaders
                              );
                            }
                          }
                        }

                        const hv = headerFallback(
                          rowHeaders,
                          columnHeaders
                        );
                        if (hv !== "") return hv;
                      }

                      return "";
                    })();

                    return (
                      <td
                        key={col}
                        className="p-1 text-center border-r border-slate-700/20 last:border-r-0"
                      >
                        <div className="text-[11px] text-white font-bold">
                          {idxStr}
                        </div>
                        <input
                          type="text"
                          data-index={idxStr}
                          data-grid-cell="1"
                          data-row={row}
                          data-col={col}
                          onKeyDownCapture={(e) => handleArrowNav(e, "grid", row, col)}
                          className={`
                            w-14 h-6 rounded-sm bg-slate-900/90 text-white border-2 border-purple-600/40
                            text-center font-bold  shadow-lg focus:border-pink-500 focus:ring-2
                            focus:ring-pink-500/20 outline-none transition-all duration-200
                            hover:border-purple-400
                            ${isFPHighlighted ? "fp-highlight" : ""}
                            ${disabled ? "bg-gray-200 text-transparent cursor-not-allowed opacity-70" : ""}
                          `}
                          maxLength={3}
                          value={cellValue}
                          disabled={disabled}
                          onClick={() => {
                            if (isFPMode) {
                              const setIdx = getFPSetIndexForNumber(idxStr);
                              if (setIdx !== -1) {
                                setActiveFPSetIndex(setIdx);
                                highlightFPSet(setIdx);
                              } else {
                                setActiveFPSetIndex(null);
                                clearFPHighlights();
                              }
                            }
                          }}
                          onChange={(e) => {
                            const input = e.target.value;
                            if (!/^\d{0,3}$/.test(input)) return;
                            const cellKey = idxStr;

                            // --- UNIVERSAL VALUE ASSIGNMENT LOGIC ---
                            if (activeNumber) {
                              assignValueToNumber(activeNumber, input, cellKey);
                            } else if (selectedNumbers.length > 0) {
                              selectedNumbers.forEach((num) => assignValueToNumber(num, input, cellKey));
                            } else if (activeColGroup) {
                              const nums = getNumsForGroup(activeColGroup);
                              nums.forEach((num) => assignValueToNumber(num, input, cellKey));
                            }

                            const updateOverride = (key, value) => {
                              setCellOverrides((prev) => {
                                const updated = { ...prev };
                                if (value === "" || value == null) delete updated[key];
                                else updated[key] = value;
                                return updated;
                              });
                            };

                            const numStrLocal = idxStr;

                            if (
                              isFPMode &&
                              activeFPSetIndex !== null &&
                              FP_SETS[activeFPSetIndex].includes(numStrLocal)
                            ) {
                              FP_SETS[activeFPSetIndex].forEach((setNum) => {
                                const r = Math.floor(parseInt(setNum, 10) / 10);
                                const c = parseInt(setNum, 10) % 10;
                                updateOverride(`${r}-${c}`, input);
                              });
                            } else if (activeColGroup) {
                              const nums = getNumsForGroup(activeColGroup);
                              setCheckboxInputs((prev) => {
                                const updated = { ...prev };
                                nums.forEach((n) => {
                                  if (!updated[n]) updated[n] = {};
                                  if (input === "" || input == null) delete updated[n][cellIndex];
                                  else updated[n][cellIndex] = input;
                                });
                                return updated;
                              });

                              const idxKey = idxStr;
                              setStoreByNum((prev) => {
                                const next = { ...prev };
                                nums.forEach((n) => {
                                  const slot = ensureSlot(n);
                                  const t = { ...(slot.tickets || {}) };
                                  const rv = slot.rowHeader?.[row] ?? rowHeaders[row] ?? "";
                                  const cv = slot.columnHeader?.[col] ?? columnHeaders[col] ?? "";
                                  const rNum = parseInt(rv || "0", 10);
                                  const cNum = parseInt(cv || "0", 10);
                                  const headerSum = (rv ? rNum : 0) + (cv ? cNum : 0);
                                  if (input === "" || input == null) delete t[`${n}-${idxKey}`];
                                  else {
                                    const manual = parseInt(input || "0", 10);
                                    t[`${n}-${idxKey}`] = String(manual + headerSum);
                                  }
                                  next[n] = { ...slot, tickets: t };
                                });
                                return next;
                              });

                              if (input === "") {
                                setCellOverrides((prev) => {
                                  const copy = { ...prev };
                                  delete copy[key];
                                  return copy;
                                });
                              }
                            } else if (activeCheckbox) {
                              setCheckboxInputs((prev) => {
                                const updated = { ...prev };
                                if (!updated[activeCheckbox]) updated[activeCheckbox] = {};
                                if (input === "" || input == null) delete updated[activeCheckbox][cellIndex];
                                else updated[activeCheckbox][cellIndex] = input;
                                return updated;
                              });

                              const idxKey = idxStr;
                              setStoreByNum((prev) => {
                                const slot = ensureSlot(activeCheckbox);
                                const t = { ...(slot.tickets || {}) };
                                const rv = slot.rowHeader?.[row] ?? rowHeaders[row] ?? "";
                                const cv = slot.columnHeader?.[col] ?? columnHeaders[col] ?? "";
                                const rNum = parseInt(rv || "0", 10);
                                const cNum = parseInt(cv || "0", 10);
                                const headerSum = (rv ? rNum : 0) + (cv ? cNum : 0);
                                if (input === "" || input == null) delete t[`${activeCheckbox}-${idxKey}`];
                                else {
                                  const manual = parseInt(input || "0", 10);
                                  t[`${activeCheckbox}-${idxKey}`] = String(manual + headerSum);
                                }
                                return { ...prev, [activeCheckbox]: { ...slot, tickets: t } };
                              });

                              if (input === "") {
                                setCellOverrides((prev) => {
                                  const copy = { ...prev };
                                  delete copy[key];
                                  return copy;
                                });
                              }
                            } else {
                              updateOverride(key, input);
                            }
                          }}
                        />
                      </td>
                    );
                  })}

                  <td className="bg-transparent"></td>
                  <td className="p-1 text-center">
                    <div className="w-16 h-8 rounded-sm bg-gradient-to-r from-yellow-200 to-yellow-300 text-slate-900 font-bold flex items-center justify-center mx-auto shadow-lg border border-yellow-400">
                      {updatedQuantity[row]}
                    </div>
                  </td>
                  <td className="p-1 text-center">
                    <div className="w-16 h-8 rounded-sm bg-gradient-to-r from-pink-200 to-pink-300 text-slate-900 font-bold flex items-center justify-center mx-auto shadow-lg border border-pink-400">
                      {updatedPoints[row]}
                    </div>
                  </td>
                </tr>
              ))}

              {/* Totals Row + Ticket actions */}
              <tr className="bg-slate-800/40 border-t-2 border-purple-500/50">
                <td
                  colSpan={12}
                  className="p-1 text-center font-bold text-purple-300"
                >
                  <div className="flex items-center mt-1 gap-3">
                    <div className="flex-1">
                      <input
                        type="text"
                        placeholder="Transaction No/Bar Code"
                        value={transactionInput}
                        onChange={(e) =>
                          setTransactionInput(e.target.value)
                        }
                        className="w-full py-1 px-5 rounded-md bg-slate-700/90 text-white font-semibold placeholder-purple-300 border-2 border-purple-500/50 focus:border-pink-400 focus:ring-2 focus:ring-pink-400/20 outline-none shadow-lg transition-all duration-200 hover:border-purple-400"
                      />
                    </div>
                    <div className="flex-none flex gap-2">
                      <button
                        className="flex items-center border-b-4 border-green-700/70 gap-3 px-6 rounded-sm font-bold h-10 text-white bg-gradient-to-r from-green-600 to-lime-500 shadow-xl hover:from-lime-500 hover:to-green-600 transition-all duration-300 text-sm hover:scale-105 active:scale-95 hover:shadow-green-400/25 disabled:opacity-60 disabled:cursor-not-allowed"
                        disabled={!isClaimable}
                        onClick={handleClaimTicket}
                      >
                        <TrendingUp className="w-5 h-5" />
                        Claim Ticket
                      </button>

                      <button
                        className="flex items-center gap-3 px-6 py-1  border-b-4 border-purple-800/80 rounded-md font-bold text-white bg-gradient-to-r from-purple-500 to-pink-500 shadow-xl hover:from-pink-500 hover:to-purple-500 transition-all duration-300 text-sm hover:scale-105 active:scale-95 hover:shadow-purple-500/25"
                        onClick={() =>
                          setAdvanceModalOpen(true)
                        }
                      >
                        <Zap className="w-5 h-5" />
                        Advance Draw
                      </button>
                    </div>
                  </div>
                </td>
                <td className="p-1 text-center">
                 <div className="font-extrabold text-lg text-yellow-400 bg-slate-900/50 px-3 py-2 rounded-sm border border-yellow-500/50">
                    {displayTotalQuantity}
                  </div>
                </td>
                <td className="p-1 text-center">
                  <div className="font-extrabold text-lg text-pink-400 bg-slate-900/50 px-3 py-2 rounded-sm border border-pink-500/50">
                    {displayTotalPoints}
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <AdvanceDrawModal
      open={advanceModalOpen}
      onClose={() => setAdvanceModalOpen(false)}
      selectedTimes={advanceDrawTimes}
      setSelectedTimes={setAdvanceDrawTimes}
      onConfirm={(selected) => setAdvanceDrawTimes(selected)}
    />

    <style jsx>{`
      .fp-highlight {
        background-color: rgba(34, 197, 94, 0.3) !important;
        border: 2px solid #22c55e !important;
        box-shadow: 0 0 8px rgba(34, 197, 94, 0.5) !important;
      }
    `}</style>

    <TicketStatusModal
      open={ticketStatusModalOpen}
      onClose={() => setTicketStatusModalOpen(false)}
      statusData={ticketStatusData}
    />

    <Navbar />
  </div>
);
}
