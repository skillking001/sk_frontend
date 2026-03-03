"use client";
import React, { useState, useEffect } from "react";
import { Calendar, Clock, Grid3x3 } from "lucide-react";
import Navbar from "../../Components/Navbar/Navbar";
import axios from "axios";
import LoadingOverlay from "../../Components/LoadingOverlay/LoadingOverlay";

// ✔ IST Date helper
function getTodayIST() {
  const now = new Date();
  const istNow = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
  return istNow.toISOString().slice(0, 10);
}

// ✔ Sort time slots
function sortTimes(times) {
  return times.sort((a, b) => {
    const toMin = (t) => {
      let [time, period] = t.split(" ");
      let [h, m] = time.split(":").map(Number);
      if (period === "PM" && h !== 12) h += 12;
      if (period === "AM" && h === 12) h = 0;
      return h * 60 + m;
    };
    return toMin(a) - toMin(b);
  });
}

const Page = () => {
  const [tableData, setTableData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(getTodayIST());

  useEffect(() => {
    fetchResults();
  }, [selectedDate]);

  const fetchResults = async () => {
    try {
      setLoading(true);

      const res = await axios.get(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/get-3d-results?date=${selectedDate}`
      );

      const records = Array.isArray(res.data.results)
        ? res.data.results
        : [];

      // Extract draw times
      const allTimes = Array.from(
        new Set(records.map((rec) => rec.winningTime).filter(Boolean))
      );

      const sortedTimes = sortTimes(allTimes);

      const timeMap = {};
      records.forEach((rec) => {
        timeMap[rec.winningTime] = rec;
      });

      const formatted = sortedTimes.map((time) => {
        const data = timeMap[time] || {};

        return {
          winningTime: time,
          winningNumbers: Array.isArray(data.winningNumbers)
            ? data.winningNumbers
            : [],
          totalAmount: data.totalAmount || 0,
          totalPoints: data.totalPoints || 0,
        };
      });

      setTableData(formatted);
      setLoading(false);
    } catch (err) {
      console.error("Fetching 3D results error:", err);
      setTableData([]);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <LoadingOverlay visible={loading} />
      <div className="max-w-6xl mx-auto p-6 pt-8">

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
            3D Results Table
          </h1>
          <div className="w-24 h-1 bg-gray-800 mx-auto rounded-full"></div>
        </div>

        {/* Date Selector */}
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6 mb-8">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center">
              <Calendar className="w-5 h-5 mr-2 text-gray-700" />
              <label className="mr-3 font-medium text-gray-700">
                Select Date:
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg shadow-sm bg-white text-gray-900"
              />
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-6">
            <Grid3x3 className="w-5 h-5 text-gray-700" />
            <h2 className="text-xl font-semibold text-gray-900">
              3D Winning Results
            </h2>
          </div>

          <div className="overflow-auto rounded-lg shadow-sm border border-gray-200">
            <table className="w-full border-collapse bg-white rounded-lg">
              <thead>
                <tr className="bg-gray-900 text-gray-50">
                  <th className="py-4 px-4 text-left font-bold">
                    <Clock className="w-4 h-4 inline mr-2" />
                    Time Slot
                  </th>
                  <th className="py-4 px-4 text-center font-bold">
                    Winning Numbers
                  </th>
                  <th className="py-4 px-4 text-center font-bold">
                    Total Amount
                  </th>
                  <th className="py-4 px-4 text-center font-bold">
                    Total Points
                  </th>
                </tr>
              </thead>

              <tbody>
                {tableData.length === 0 && !loading && (
                  <tr>
                    <td
                      colSpan={4}
                      className="text-center py-8 text-gray-500"
                    >
                      No 3D results found.
                    </td>
                  </tr>
                )}

                {tableData.map((row) => (
                  <tr
                    key={row.winningTime}
                    className="border-t border-gray-200 hover:bg-gray-50"
                  >
                    <td className="py-4 px-4 font-bold text-gray-900">
                      {row.winningTime}
                    </td>

                    <td className="py-4 px-4 text-center">
                      <div className="flex justify-center gap-2 flex-wrap">
                        {row.winningNumbers.length > 0 ? (
                          row.winningNumbers.map((num, idx) => (
                            <div
                              key={idx}
                              className="px-4 py-2 bg-gray-900 text-white font-bold rounded-lg shadow"
                            >
                              {num}
                            </div>
                          ))
                        ) : (
                          "--"
                        )}
                      </div>
                    </td>

                    <td className="py-4 px-4 text-center font-bold text-green-600">
                      ₹ {row.totalAmount}
                    </td>

                    <td className="py-4 px-4 text-center font-bold text-blue-600">
                      {row.totalPoints}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="mt-6 text-sm text-gray-600">
            Showing 3D results for{" "}
            <span className="font-semibold text-gray-900">
              {selectedDate}
            </span>
          </div>
        </div>
      </div>

    </div>
  );
};

export default Page;