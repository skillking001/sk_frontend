"use client";
import React, { useEffect } from "react";
import {
  X,
  CheckCircle,
  XCircle,
  AlertCircle,
  TicketCheck,
  IndianRupee,
} from "lucide-react";
import confetti from "canvas-confetti";
import { toast } from "react-hot-toast";

export default function TicketStatusModal({ open, onClose, statusData }) {
  if (!open) return null;

  /* 🎉 Confetti Only for Winner */
  useEffect(() => {
    if (statusData?.status === "winner") {
      const duration = 2500;
      const end = Date.now() + duration;

      (function frame() {
        confetti({
          particleCount: 6,
          startVelocity: 25,
          spread: 80,
          origin: { x: 0 },
        });
        confetti({
          particleCount: 6,
          startVelocity: 25,
          spread: 80,
          origin: { x: 1 },
        });

        if (Date.now() < end) requestAnimationFrame(frame);
      })();
    }
  }, [statusData]);

  /* UI Status Info */
  const getStatusInfo = () => {
    if (!statusData)
      return {
        icon: AlertCircle,
        color: "text-gray-300",
        title: "No Data",
        message: "No information available.",
      };

    switch (statusData.status) {
      case "winner":
        return {
          icon: CheckCircle,
          color: "text-green-400",
          title: "🎉 You Won!",
          message: "Congratulations!",
        };

      case "no_win":
        return {
          icon: XCircle,
          color: "text-red-400",
          title: "No Win",
          message: "Better luck next time!",
        };

      case "already_claimed":
        return {
          icon: TicketCheck,
          color: "text-yellow-400",
          title: "Already Claimed",
          message: "Ticket already processed.",
        };

      case "error":
      default:
        return {
          icon: XCircle,
          color: "text-red-400",
          title: "Invalid Ticket",
          message: "Ticket ID not found.",
        };
    }
  };

  const { icon: Icon, color, title, message } = getStatusInfo();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-[380px] mx-4 p-5 text-white relative">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-400 hover:text-white p-1"
        >
          <X size={18} />
        </button>

        {/* Header */}
        <div className="text-center mb-4">
          <h2 className="text-lg font-bold text-white">Ticket Status</h2>
        </div>

        {/* Status */}
        <div className="flex justify-center items-center gap-3 mb-4 p-3 bg-slate-800/50 rounded-lg">
          <Icon size={32} className={color} />
          <div>
            <h3 className={`font-semibold ${color}`}>{title}</h3>
            <p className="text-gray-300 text-sm">{message}</p>
          </div>
        </div>

        {/* WINNER CONTENT */}
        {statusData?.status === "winner" && statusData.matches && (
          <div className="space-y-3">
            {/* Total Amount */}
            <div className="bg-green-900/30 border border-green-600 rounded-lg p-3 text-center">
              <p className="text-gray-300 text-xs mb-1">Total Winnings</p>
              <div className="flex items-center justify-center gap-2">
                <IndianRupee size={19} className="text-emerald-400" />
                <p className="text-2xl font-bold text-emerald-400">
                  {statusData.totalWinningAmount}
                </p>
              </div>
            </div>

            {/* Winning Numbers - Show ALL matches */}
            <div className="bg-slate-800/40 border border-slate-600 rounded-lg p-3">
              <p className="text-gray-300 text-xs mb-2 text-center">
                {statusData.matches.length > 1 ? 'Winning Numbers' : 'Winning Number'}
              </p>
              <div className="space-y-2 max-h-[160px] overflow-y-auto transparent-scrollbar">
                {statusData.matches.map((match, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-slate-700/30 rounded">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-green-600 rounded-lg flex items-center justify-center">
                        <span className="text-white font-bold text-sm">
                          {match.number}
                        </span>
                      </div>
                      <div>
                        <p className="text-white font-semibold text-sm">{match.number}</p>
                        <p className="text-gray-400 text-xs">Qty: {match.quantity}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-emerald-400 font-bold text-sm">₹{match.payout}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Ticket Info */}
            <div className="bg-slate-800/30 border border-slate-600 rounded-lg p-3">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <p className="text-gray-400">Ticket ID</p>
                  <p className="text-purple-300 font-semibold">#{statusData.ticketId}</p>
                </div>
                <div>
                  <p className="text-gray-400">Draw Date</p>
                  <p className="text-gray-200">{statusData.drawDate}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-gray-400">Draw Time</p>
                  <p className="text-gray-200">{statusData.drawTimes?.join(", ")}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ALREADY CLAIMED */}
        {statusData?.status === "already_claimed" && (
          <div className="bg-yellow-900/20 border border-yellow-600/30 rounded-lg p-3 text-center">
            <p className="text-yellow-300 text-sm">
              Claimed on {statusData.claimedDate}
            </p>
          </div>
        )}

        {/* ACTION BUTTON */}
        <button
          onClick={onClose}
          className="w-full mt-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold py-3 rounded-lg transition"
        >
          {statusData?.status === "winner" ? "Claim & Continue" : "Close"}
        </button>

      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }
      `}</style>
    </div>
  );
}