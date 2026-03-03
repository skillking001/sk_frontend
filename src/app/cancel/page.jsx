"use client";
import React, { useState, useEffect, useCallback } from "react";
import { Search, XCircle, Trash2, Home, X, Archive, RefreshCw, Filter } from "lucide-react";
import Navbar from "../../Components/Navbar/Navbar.jsx";
import Link from "next/link";
import axios from "axios";
import toast from "react-hot-toast";
import LoadingOverlay from "../../Components/LoadingOverlay/LoadingOverlay.jsx";

/* ---------- Helpers ---------- */
const getUserToken = () => localStorage.getItem("userToken");
const entryOptions = [10, 20, 50, 100];

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


/* ---------- Page Component ---------- */
export default function Page() {
  const [tickets, setTickets] = useState([]);
  const [cancelledTickets, setCancelledTickets] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isCancelling, setIsCancelling] = useState(false);
  const [showEntries, setShowEntries] = useState(10);
  const [search, setSearch] = useState("");
  const [current, setCurrent] = useState(1);
  const [loginId, setLoginId] = useState(null);


useEffect(() => {
  const token = getUserToken();

  if (!token) {
    window.location.href = "/";
    return;
  }

  const id = getLoginIdFromToken();
  if (id) setLoginId(id);
}, []);


useEffect(() => {
  if (loginId) {
    fetchTickets();
  }
}, [loginId]);


const fetchTickets = useCallback(async () => {
  try {
    setLoading(true);
    if (!loginId) return;

    const savedSlot = localStorage.getItem("currentDrawSlot");

    if (!savedSlot) {
      toast.error("Draw slot not found.");
      setLoading(false);
      return;
    }

    const { data } = await axios.post(
      `${process.env.NEXT_PUBLIC_API_BASE_URL}/show-tickets`,
      {
        loginId,
        drawTime: savedSlot,
      }
    );

    const allTickets = [];
    let sr = 1;

    data.forEach((group) => {
      group.tickets.forEach((ticket) => {
        const formattedDrawTime = Array.isArray(ticket.drawTime)
          ? ticket.drawTime.join(", ")
          : ticket.drawTime;

let formattedTicketNo = "";

let parsedTicketNumbers = ticket.ticketNumber;

if (typeof parsedTicketNumbers === "string") {
  try {
    parsedTicketNumbers = JSON.parse(parsedTicketNumbers);
  } catch (err) {
    console.error("Ticket parse error:", err);
    parsedTicketNumbers = [];
  }
}

if (Array.isArray(parsedTicketNumbers)) {
  formattedTicketNo = parsedTicketNumbers
    .map((item) => `${item.ticketNumber}-${item.quantity}`)
    .join(", ");
}

        allTickets.push({
          sr: sr++,
          id: ticket.id,
          drawTime: formattedDrawTime,
          ticketNo: formattedTicketNo,
          point: ticket.totalPoints,
          quantity: ticket.totalQuatity,
        });
      });
    });

    setTickets(allTickets);
  } catch (err) {
    console.error(err);
    toast.error("Failed to load tickets.");
  } finally {
    setLoading(false);
  }
}, [loginId]);

  /* ---------- Load Cancelled Tickets ---------- */
  const fetchCancelledTickets = useCallback(async () => {
    try {
      setLoading(true);
      const loginId = getLoginIdFromToken();
      if (!loginId) return;

      const { data } = await axios.post(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/cancelled-tickets`,
        { loginId }
      );

      const allCancelled = [];
      let sr = 1;
      data.forEach((group) => {
        group.tickets.forEach((ticket) => {
          const formattedDrawTime = Array.isArray(ticket.drawTime)
            ? ticket.drawTime.join(", ")
            : typeof ticket.drawTime === "string" && ticket.drawTime.startsWith("[")
            ? JSON.parse(ticket.drawTime).join(", ")
            : ticket.drawTime;

let formattedTicketNo = "";
if (Array.isArray(ticket.ticketNumber)) {
  formattedTicketNo = ticket.ticketNumber
    .map((item) => `${item.ticketNumber} : ${item.quantity}`)
    .join(", ");
} else if (typeof ticket.ticketNumber === "string") {
  try {
    const parsed = JSON.parse(ticket.ticketNumber);
    formattedTicketNo = parsed
      .map((item) => `${item.ticketNumber} : ${item.quantity}`)
      .join(", ");
  } catch {
    formattedTicketNo = ticket.ticketNumber;
  }
}


          allCancelled.push({
            sr: sr++,
            id: ticket.id,
            drawTime: formattedDrawTime,
            ticketNo: formattedTicketNo,
            point: ticket.totalPoints,
            quantity: ticket.totalQuatity,
          });
        });
      });

      setCancelledTickets(allCancelled);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load cancelled tickets.");
    } finally {
      setLoading(false);
    }
  }, []);

const handleCancel = async (ticketId) => {
  if (isCancelling) return;

  const confirmed = window.confirm(
    "Are you sure you want to cancel this ticket?"
  );
  if (!confirmed) return;

  try {
    console.log("Sending ticketId:", ticketId);

    setIsCancelling(true);
    setLoading(true);

    await axios.post(
      `${process.env.NEXT_PUBLIC_API_BASE_URL}/cancel-ticket`,
      {
        ticketId,
      }
    );

    // Remove cancelled ticket from UI
    setTickets((prev) =>
      prev.filter((row) => row.id !== ticketId)
    );

    toast.success("Ticket cancelled successfully.");
  } catch (err) {
    console.error(err);
    toast.error("Failed to cancel ticket.");
  } finally {
    setLoading(false);
    setIsCancelling(false);
  }
};

  /* ---------- Filter + Pagination ---------- */
  let filtered = tickets;
  if (search.trim() !== "") {
    filtered = filtered.filter((row) =>
      String(row.ticketNo).toLowerCase().includes(search.toLowerCase())
    );
}

  const totalPages = Math.ceil(filtered.length / showEntries);
  const startIdx = (current - 1) * showEntries;
  const showData = filtered.slice(startIdx, startIdx + showEntries);

  /* ---------- Render ---------- */
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <LoadingOverlay visible={loading}/>
      <Navbar />

      {/* Header */}
      <div className="bg-gradient-to-r from-slate-800/70 to-slate-700/70 border-b border-slate-600/40 backdrop-blur-md shadow-lg">
        <div className="max-w-7xl mx-auto pt-6 px-6">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600/90 to-purple-600/90 text-white font-semibold shadow-lg hover:shadow-blue-500/25 hover:scale-105 transition-all duration-200 border border-blue-500/30"
          >
            <Home className="w-4 h-4" />
            <span className="hidden sm:inline">Back</span>
          </Link>
        </div>

        <div className="max-w-7xl mx-auto px-6 py-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <div className="space-y-2">
            <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight">
              Ticket Management
            </h1>
            <p className="text-slate-300 text-lg font-medium">
              Manage and monitor your lottery tickets
            </p>
            <div className="w-20 h-1.5 bg-gradient-to-r from-red-500 to-pink-500 rounded-full shadow"></div>
          </div>

          {/* Cancelled Tickets Button */}
          <button
            onClick={() => {
              setShowModal(true);
              fetchCancelledTickets();
            }}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500/90 to-orange-600/90 text-white font-semibold shadow-lg hover:shadow-amber-500/25 hover:scale-105 transition-all duration-200 border border-amber-400/30 group"
          >
            <Archive className="w-5 h-5 group-hover:scale-110 transition-transform" />
            View Cancelled Tickets
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gradient-to-r from-slate-800/80 to-slate-700/80 rounded-2xl p-6 border border-slate-600/40 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm font-medium">Total Tickets</p>
                <p className="text-2xl font-bold text-white mt-1">{tickets.length}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                <Archive className="w-6 h-6 text-blue-400" />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-slate-800/80 to-slate-700/80 rounded-2xl p-6 border border-slate-600/40 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm font-medium">Active Tickets</p>
                <p className="text-2xl font-bold text-white mt-1">{filtered.length}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
                <Filter className="w-6 h-6 text-green-400" />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-slate-800/80 to-slate-700/80 rounded-2xl p-6 border border-slate-600/40 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm font-medium">Cancelled Tickets</p>
                <p className="text-2xl font-bold text-white mt-1">{cancelledTickets.length}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center">
                <XCircle className="w-6 h-6 text-red-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Table Section */}
        <div className="bg-gradient-to-br from-slate-800/80 to-slate-700/80 rounded-2xl border border-slate-600/40 shadow-2xl overflow-hidden">
          {/* Controls */}
          <div className="p-6 border-b border-slate-600/40 bg-slate-800/50">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-3 bg-slate-900/60 rounded-xl px-4 py-2.5 border border-slate-600/40">
                  <span className="text-slate-300 text-sm font-medium whitespace-nowrap">Show</span>
                  <select
                    value={showEntries}
                    onChange={(e) => {
                      setShowEntries(Number(e.target.value));
                      setCurrent(1);
                    }}
                    className="bg-transparent text-white border-none focus:ring-0 px-0 py-1"
                  >
                    {entryOptions.map((opt) => (
                      <option key={opt} value={opt} className="bg-slate-800">
                        {opt}
                      </option>
                    ))}
                  </select>
                  <span className="text-slate-300 text-sm whitespace-nowrap">entries</span>
                </div>

                <div className="text-slate-400 text-sm">
                  Showing {Math.min(showData.length, showEntries)} of {filtered.length} records
                </div>
              </div>

              <div className="relative min-w-[300px]">
                <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setCurrent(1);
                  }}
                  className="w-full pl-11 pr-4 py-3 rounded-xl bg-slate-900/60 text-white border border-slate-600/40 focus:border-pink-500/50 focus:ring-2 focus:ring-pink-500/20 transition-all duration-200 placeholder-slate-400"
                  placeholder="Search ticket numbers..."
                />
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gradient-to-r from-slate-700/80 to-slate-600/80 border-b border-slate-600/40">
                  <th className="px-6 py-4 text-sm font-semibold text-slate-200 text-left uppercase tracking-wider">#</th>
                  <th className="px-6 py-4 text-sm font-semibold text-slate-200 text-left uppercase tracking-wider">Draw Time</th>
                  <th className="px-6 py-4 text-sm font-semibold text-slate-200 text-left uppercase tracking-wider">Ticket ID</th>
                  <th className="px-6 py-4 text-sm font-semibold text-slate-200 text-left uppercase tracking-wider">Ticket Number</th>
                  <th className="px-6 py-4 text-sm font-semibold text-slate-200 text-left uppercase tracking-wider">Quantity</th>
                  <th className="px-6 py-4 text-sm font-semibold text-slate-200 text-left uppercase tracking-wider">Points</th>
                  <th className="px-6 py-4 text-sm font-semibold text-slate-200 text-center uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/30">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12">
                      <div className="flex justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500"></div>
                      </div>
                      <p className="text-slate-400 mt-3">Loading tickets...</p>
                    </td>
                  </tr>
                ) : showData.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12">
                      <XCircle className="w-12 h-12 mx-auto text-slate-500 mb-3" />
                      <p className="text-slate-400 text-lg">No tickets found</p>
                      <p className="text-slate-500 text-sm mt-1">
                        {search ? "Try adjusting your search criteria" : "No tickets available"}
                      </p>
                    </td>
                  </tr>
                ) : (
                  showData.map((row) => (
                    <tr 
                      key={row.sr} 
                      className="hover:bg-slate-700/20 transition-all duration-200 group"
                    >
                      <td className="px-6 py-4">
                        <span className="text-slate-300 font-medium bg-slate-700/50 rounded-lg px-3 py-1.5 text-sm">
                          {row.sr}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-slate-300 font-mono text-sm bg-slate-800/50 rounded-lg px-3 py-2 border border-slate-600/30">
                          {row.drawTime}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-slate-300 font-mono text-sm">#{row.id}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-blue-300 font-mono text-sm bg-blue-500/10 rounded-lg px-3 py-2 border border-blue-500/20 max-w-xs truncate">
                          {row.ticketNo}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center justify-center bg-slate-700/50 rounded-full px-3 py-1.5 text-slate-200 font-bold text-sm min-w-12">
                          {row.quantity}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center justify-center bg-green-500/10 rounded-full px-3 py-1.5 text-green-400 font-bold text-sm min-w-16 border border-green-500/20">
                          {row.point}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => handleCancel(row.id)}
                          disabled={isCancelling}
                          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-semibold shadow-lg transition-all duration-200 group ${
                            isCancelling
                              ? "bg-slate-600 cursor-not-allowed opacity-50"
                              : "bg-gradient-to-r from-red-600/90 to-pink-600/90 hover:shadow-red-500/25 hover:scale-105 border border-red-500/30"
                          }`}
                        >
                          <Trash2 className="w-4 h-4 group-hover:scale-110 transition-transform" />
                          {isCancelling ? "Cancelling..." : "Cancel"}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-6 py-4 border-t border-slate-600/40 bg-slate-800/50">
              <div className="flex items-center justify-between">
                <div className="text-slate-400 text-sm">
                  Page {current} of {totalPages}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrent(prev => Math.max(prev - 1, 1))}
                    disabled={current === 1}
                    className="px-4 py-2 rounded-lg bg-slate-700/50 text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-600/50 transition-colors"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setCurrent(prev => Math.min(prev + 1, totalPages))}
                    disabled={current === totalPages}
                    className="px-4 py-2 rounded-lg bg-slate-700/50 text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-600/50 transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Cancelled Tickets Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 px-4 py-6">
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl shadow-2xl w-full max-w-6xl max-h-[85vh] overflow-hidden border border-slate-600/40 flex flex-col">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-600/40 bg-slate-800/50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
                  <Archive className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">Cancelled Tickets</h2>
                  <p className="text-slate-400 text-sm">View your cancelled ticket history</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <button
                  onClick={fetchCancelledTickets}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600/90 to-purple-600/90 text-white font-semibold shadow-lg hover:shadow-blue-500/25 hover:scale-105 transition-all duration-200 border border-blue-500/30"
                >
                  <RefreshCw className="w-4 h-4" />
                  Refresh
                </button>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-2 rounded-xl bg-slate-700/50 text-slate-300 hover:text-white hover:bg-slate-600/50 transition-colors border border-slate-600/40"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-auto">
              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
                </div>
              ) : cancelledTickets.length === 0 ? (
                <div className="text-center py-16">
                  <XCircle className="w-16 h-16 mx-auto text-slate-500 mb-4" />
                  <p className="text-slate-400 text-lg mb-2">No cancelled tickets found</p>
                  <p className="text-slate-500 text-sm">Cancelled tickets will appear here</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-slate-700/50 border-b border-slate-600/40">
                        <th className="px-6 py-4 text-sm font-semibold text-slate-200 text-left uppercase tracking-wider">#</th>
                        <th className="px-6 py-4 text-sm font-semibold text-slate-200 text-left uppercase tracking-wider">Draw Time</th>
                        <th className="px-6 py-4 text-sm font-semibold text-slate-200 text-left uppercase tracking-wider">Ticket ID</th>
                        <th className="px-6 py-4 text-sm font-semibold text-slate-200 text-left uppercase tracking-wider">Ticket Number</th>
                        <th className="px-6 py-4 text-sm font-semibold text-slate-200 text-left uppercase tracking-wider">Quantity</th>
                        <th className="px-6 py-4 text-sm font-semibold text-slate-200 text-left uppercase tracking-wider">Points</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/30">
                      {cancelledTickets.map((t) => (
                        <tr key={t.sr} className="hover:bg-slate-700/20 transition-colors">
                          <td className="px-6 py-4">
                            <span className="text-slate-300 font-medium bg-slate-700/50 rounded-lg px-3 py-1.5 text-sm">
                              {t.sr}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-slate-300 font-mono text-sm bg-slate-800/50 rounded-lg px-3 py-2 border border-slate-600/30">
                              {t.drawTime}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-slate-300 font-mono text-sm">#{t.id}</span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-blue-300 font-mono text-sm bg-blue-500/10 rounded-lg px-3 py-2 border border-blue-500/20 max-w-xs truncate">
                              {t.ticketNo}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center justify-center bg-slate-700/50 rounded-full px-3 py-1.5 text-slate-200 font-bold text-sm min-w-12">
                              {t.quantity}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center justify-center bg-green-500/10 rounded-full px-3 py-1.5 text-green-400 font-bold text-sm min-w-16 border border-green-500/20">
                              {t.point}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}