"use client";

import React, { useState, useEffect } from "react";
import Details from "../../Components/ThreeD/Details";
import axios from "axios";
import Link from "next/link";
import { Home } from "lucide-react";
import { useRouter } from "next/navigation";
import LoadingOverlay from "../../Components/LoadingOverlay/LoadingOverlay";

// Tabs - Added Pending Claims
const TABS = [
  { label: "Points Summary", key: "points" },
  { label: "Net To Pay Summary", key: "net" },
  { label: "Points Allocation", key: "allocation" },
  { label: "Claimed Tickets", key: "claimed" },
  { label: "Pending Claims", key: "pending" }, // NEW TAB
];

// Table configs - Added pending claims config
const TABLE_CONFIG = {
  points: {
    columns: [
      { label: "Sr. No.", key: "sr" },
      { label: "Name", key: "name" },
      { label: "Username", key: "username" },
      { label: "Play Amount", key: "playAmount" },
      { label: "Winning Amount", key: "winningAmount" },
      { label: "Commission", key: "commission" },
      { label: "Net Amount", key: "netAmount" },
    ],
  },
  net: {
    columns: [
      { label: "Sr. No.", key: "sr" },
      { label: "Name", key: "name" },
      { label: "Username", key: "username" },
      { label: "Play Points", key: "playPoints" },
      { label: "Commission", key: "commission" },
      { label: "Purchase Points", key: "purchasePoints" },
      { label: "Winning Points", key: "winningPoints" },
      { label: "Net To Pay", key: "netToPay" },
    ],
  },
  allocation: {
    columns: [
      { label: "Sr. No.", key: "sr" },
      { label: "Date", key: "date" },
      { label: "Points Allocated", key: "points" },
    ],
  },
  claimed: {
    columns: [
      { label: "Sr. No.", key: "sr" },
      { label: "Ticket ID", key: "ticketId" },
      { label: "Draw Date", key: "drawDate" },
      { label: "Draw Time", key: "drawTime" },
      { label: "Claimed Date", key: "claimedDate" },
      { label: "Total Quantity", key: "totalQuantity" },
      { label: "Winning Tickets", key: "winningTickets" },
    ],
  },
  pending: { // NEW CONFIG
    columns: [
      { label: "Sr. No.", key: "sr" },
      { label: "Ticket ID", key: "ticketId" },
      { label: "Draw Date", key: "drawDate" },
      { label: "Draw Times", key: "drawTimes" },
      { label: "Winning Numbers", key: "winningNumbers" },
      { label: "Total Quantity", key: "totalQuantity" },
      { label: "Winning Amount", key: "winningAmount" },
      { label: "Status", key: "status" },
    ],
  },
};

// extract loginId from token
function getLoginIdFromToken() {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("userToken");
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        return payload.id;
      } catch {
        return null;
      }
    }
  }
  return null;
}

const ShopAccounts = () => {
  const router = useRouter();
  const today = new Date().toISOString().split("T")[0];

  const [activeTab, setActiveTab] = useState("points");
  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate] = useState(today);
  const [pointsSummaryData, setPointsSummaryData] = useState([]);
  const [netToPayData, setNetToPayData] = useState([]);
  const [allocationData, setAllocationData] = useState([]);
  const [claimedTicketsData, setClaimedTicketsData] = useState([]);
  const [pendingClaimsData, setPendingClaimsData] = useState([]); // NEW STATE
  const [loginId, setLoginId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // load loginId
  useEffect(() => {
    const id = getLoginIdFromToken();
    setLoginId(id);
  }, []);

  useEffect(() => {
    if (!localStorage.getItem("userToken")) {
      router.push("/");
    }
  }, [router]);

useEffect(() => {
  if (activeTab === "pending" && loginId) {
    fetchPendingClaims();
  }
}, [activeTab, loginId]);


  // fetch net to pay summary
  const fetchNetToPaySummary = async () => {
    if (!loginId) return;
    setLoading(true);
    setError("");

    try {
      const res = await axios.post(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/3d/nettopaysummary`,
        {
          from: fromDate,
          to: toDate,
          loginId,
        }
      );

      const mapped = [
        {
          sr: 1,
          name: res.data.summary.shopName,
          username: res.data.summary.userName,
          playPoints: res.data.summary.playPoints,
          commission: res.data.summary.commission,
          purchasePoints: res.data.summary.purchasePoints,
          winningPoints: res.data.summary.winningPoints,
          netToPay: res.data.summary.netToPay,
        },
      ];

      setNetToPayData(mapped);
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong");
      setNetToPayData([]);
    }

    setLoading(false);
  };

  // fetch points allocation
  const fetchPointsAllocation = async () => {
    if (!loginId) return;
    setLoading(true);
    setError("");

    try {
      const res = await axios.post(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/3d/pointallocation"`,
        {
          from: fromDate,
          to: toDate,
          loginId,
        }
      );

      const mapped = res.data.pointsAllocated.map((item, idx) => ({
        sr: idx + 1,
        date: item.date,
        points: item.points,
      }));

      setAllocationData(mapped);
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong");
      setAllocationData([]);
    }

    setLoading(false);
  };

  const fetchPointsSummary = async () => {
    if (!loginId) return;

    setLoading(true);
    setError("");

    try {
      const res = await axios.post(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/3d/pointssummary`,
        {
          from: fromDate, 
          to: toDate,
          loginId,
        }
      );

      setPointsSummaryData([
        {
          sr: 1,
          name: res.data.summary.shopName,
          username: res.data.summary.userName,
          playAmount: res.data.summary.playPoints,
          winningAmount: res.data.summary.winningPoints,
          commission: res.data.summary.commission,
          netAmount: res.data.summary.netPoints,
        },
      ]);
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong");
      setPointsSummaryData([]);
    }

    setLoading(false);
  };

  // fetch claimed tickets
  const fetchClaimedTickets = async () => {
    if (!loginId) return;

    setLoading(true);
    setError("");

    try {
      const res = await axios.post(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/user-claimed-tickets`,
        {
          adminId: loginId,
          fromDate,
          toDate,
        }
      );

      const mapped = res.data.data?.map((item, idx) => ({
        sr: idx + 1,
        ticketId: item.ticketId,
        drawDate: item.drawDate || "N/A",
        drawTime: item.drawTime || "N/A",
        claimedDate: item.claimedDate || "N/A",
        totalQuantity: item.totalQuantity || 0,
        winningTickets: Array.isArray(item.ticketNumbers)
          ? item.ticketNumbers
              .filter((ticket) => ticket && ticket !== "")
              .join(", ")
          : "No winning tickets",
      })) || [];

      setClaimedTicketsData(mapped);
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong");
      setClaimedTicketsData([]);
    }

    setLoading(false);
  };

  // NEW: fetch pending claims
  const fetchPendingClaims = async () => {
    if (!loginId) return;

    setLoading(true);
    setError("");

    try {
      const res = await axios.post(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/pending-claims`,
        {
          loginId,
        }
      );

      const mapped = res.data.pendingClaimableTickets?.map((item, idx) => ({
        sr: idx + 1,
        ticketId: item.ticketId,
        drawDate: item.drawDate || "N/A",
        drawTimes: Array.isArray(item.drawTimes) 
          ? item.drawTimes.join(", ") 
          : "N/A",
        winningNumbers: Array.isArray(item.matches)
          ? item.matches.map(match => `${match.number} (x${match.quantity})`).join(", ")
          : "No winning numbers",
        totalQuantity: Array.isArray(item.matches)
          ? item.matches.reduce((sum, match) => sum + match.quantity, 0)
          : 0,
        winningAmount: `₹${item.totalWinningAmount?.toLocaleString() || "0"}`,
        status: (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-300">
            Pending Claim
          </span>
        ),
      })) || [];

      setPendingClaimsData(mapped);
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong");
      setPendingClaimsData([]);
    }

    setLoading(false);
  };

  const handleTabChange = (tabKey) => {
    setActiveTab(tabKey);
    setError("");
    
    // Clear all data when switching tabs
    setPointsSummaryData([]);
    setNetToPayData([]);
    setAllocationData([]);
    setClaimedTicketsData([]);
    setPendingClaimsData([]);
  };

  const handleViewClick = () => {
    switch (activeTab) {
      case "points":
        fetchPointsSummary();
        break;
      case "net":
        fetchNetToPaySummary();
        break;
      case "allocation":
        fetchPointsAllocation();
        break;
      case "claimed":
        fetchClaimedTickets();
        break;
      default:
        break;
    }
  };

  const getCurrentData = () => {
    switch (activeTab) {
      case "points":
        return pointsSummaryData;
      case "net":
        return netToPayData;
      case "allocation":
        return allocationData;
      case "claimed":
        return claimedTicketsData;
      case "pending": // NEW CASE
        return pendingClaimsData;
      default:
        return [];
    }
  };

  const currentData = getCurrentData();
  const hasData = currentData.length > 0;

  return (
    <div className="min-h-screen w-full flex flex-col bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <LoadingOverlay visible={loading}/>
      <div className="mb-10">
        <Details />
        <div className="max-w-7xl mx-auto pt-8 px-6">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-3 px-5 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold shadow-lg hover:scale-105 transition-all duration-200 text-base"
          >
            <Home className="w-5 h-5" />
            <span className="hidden sm:inline">Home</span>
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto bg-slate-900 rounded-2xl shadow-2xl p-8 mb-12 border border-slate-700">
        {/* Tabs */}
        <div className="flex gap-3 mb-8 flex-wrap">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              className={`rounded-xl px-6 py-3 font-bold text-base transition-all duration-200 ${
                activeTab === tab.key
                  ? "bg-gradient-to-r from-purple-700 to-pink-700 text-white shadow-lg scale-105"
                  : "bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-750"
              }`}
              onClick={() => handleTabChange(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Filters */}
{/* Filters — HIDDEN for Pending Claims */}
{activeTab !== "pending" && (
  <div className="flex flex-wrap gap-6 items-end mb-8 p-6 bg-slate-800/50 rounded-xl border border-slate-700">
    <div className="flex-1 min-w-[200px]">
      <label className="text-slate-300 text-sm font-medium mb-2 block">From Date</label>
      <input
        type="date"
        className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-3 text-slate-200 text-base"
        value={fromDate}
        onChange={(e) => setFromDate(e.target.value)}
      />
    </div>

    <div className="flex-1 min-w-[200px]">
      <label className="text-slate-300 text-sm font-medium mb-2 block">To Date</label>
      <input
        type="date"
        className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-3 text-slate-200 text-base"
        value={toDate}
        onChange={(e) => setToDate(e.target.value)}
      />
    </div>

    <div className="flex gap-3">
      <button
        onClick={handleViewClick}
        disabled={loading}
        className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-8 py-3 rounded-lg shadow-lg font-bold text-base"
      >
        {loading ? "Loading..." : "View"}
      </button>
    </div>
  </div>
)}


        {/* Note for Pending Claims */}
        {activeTab === "pending" && (
          <div className="mb-6 p-4 bg-blue-900/20 rounded-lg border border-blue-800 text-blue-300 text-sm">
            💡 <strong>Note:</strong> Pending Claims show tickets that have winning numbers but haven't been claimed yet. 
            These are automatically detected based on draw results.
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="text-red-400 font-bold mb-6 p-4 bg-red-900/20 rounded-lg border border-red-800 text-base">
            {error}
          </div>
        )}

        {/* Table */}
        <div className="overflow-x-auto rounded-2xl bg-slate-900 border border-slate-800 shadow-lg">
          <table className="min-w-full text-base text-center text-white">
            <thead className="bg-gradient-to-r from-purple-800 to-pink-800">
              <tr>
                {TABLE_CONFIG[activeTab]?.columns.map((col) => (
                  <th key={col.key} className="px-6 py-4 font-bold text-base">
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {hasData ? (
                currentData.map((row) => (
                  <tr
                    key={row.sr}
                    className="border-b border-slate-700 hover:bg-slate-800/50 transition-colors duration-150"
                  >
                    {TABLE_CONFIG[activeTab].columns.map((col) => (
                      <td key={col.key} className="px-6 py-4 text-base">
                        {row[col.key]}
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={TABLE_CONFIG[activeTab].columns.length}
                    className="py-12 text-slate-400 text-lg font-medium"
                  >
                    {loading ? "Loading data..." : "No data found. Click 'View' to load data."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Summary for Pending Claims */}
        {activeTab === "pending" && hasData && (
          <div className="mt-6 p-4 bg-slate-800/50 rounded-xl border border-slate-700">
            <div className="flex flex-wrap gap-6 text-slate-300">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <span className="text-sm">
                  Total Pending Tickets: <strong className="text-white">{pendingClaimsData.length}</strong>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-sm">
                  Total Winning Amount: <strong className="text-white">
                    ₹{pendingClaimsData.reduce((sum, item) => {
                      const amount = item.winningAmount.replace('₹', '').replace(/,/g, '');
                      return sum + parseInt(amount || 0);
                    }, 0).toLocaleString()}
                  </strong>
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ShopAccounts;