"use client";
import React, { useState, useEffect } from "react";
import { Calendar, Clock, Grid3x3 } from "lucide-react";
import Navbar from "../../Components/Navbar/Navbar";
import axios from "axios";

const columnRanges = [
  { label: "10-19", start: 10, end: 19 },
  { label: "30-39", start: 30, end: 39 },
  { label: "50-59", start: 50, end: 59 },
];

// ✔ IST Date helper
function getTodayIST() {
  const now = new Date();
  const istNow = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
  return istNow.toISOString().slice(0, 10); // YYYY-MM-DD
}

// ✔ Sort time slots: "09:45 PM" < "10:00 PM" < "10:15 PM"
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

function getColumns(start, end) {
  const arr = [];
  for (let i = start; i <= end; i++) arr.push(i);
  return arr;
}

// ✔ Filter + sort inside column
function filterNumbersByColumn(numbers, colStart, colEnd) {
  return numbers
    .filter((numObj) => {
      const nStr = String(numObj.number);
      const prefix = Number(nStr.slice(0, 2));
      return prefix >= colStart && prefix <= colEnd;
    })
    .sort((a, b) => Number(a.number) - Number(b.number)); // sort by number
}

const Page = () => {
  const [selectedCol, setSelectedCol] = useState(0);
  const [tableData, setTableData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(getTodayIST());

  const columns = getColumns(
    columnRanges[selectedCol].start,
    columnRanges[selectedCol].end
  );

  // -------------------------------------------
  // 🔥 Fetch winning slots for selected date
  // -------------------------------------------
  useEffect(() => {
    setLoading(true);

    axios
      .get(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/get-winning-slots?date=${selectedDate}`
      )
      .then((res) => {
        const records = Array.isArray(res.data.results)
          ? res.data.results
          : [];

        // extract and clean drawTimes
        const allDrawTimes = Array.from(
          new Set(
            records
              .map((rec) => {
                if (typeof rec.DrawTime === "string") {
                  return rec.DrawTime.replace(/['"]+/g, "").trim();
                }
                return rec.DrawTime;
              })
              .filter(Boolean)
          )
        );

        // sort times in ascending order
        const sortedTimes = sortTimes(allDrawTimes);

        const timeToNumbers = {};
        records.forEach((rec) => {
          let nums = rec.winningNumbers;

          // If stored as string JSON
          if (typeof nums === "string") {
            try {
              nums = JSON.parse(nums);
            } catch {
              nums = [];
            }
          }

          let t = rec.DrawTime;
          if (typeof t === "string") t = t.replace(/['"]+/g, "").trim();

          timeToNumbers[t] = nums;
        });

        // Prepare UI display rows
        const newTableData = sortedTimes.map((drawTime) => {
          const slotNumbers = timeToNumbers[drawTime] || [];

          const filtered = filterNumbersByColumn(
            slotNumbers,
            columnRanges[selectedCol].start,
            columnRanges[selectedCol].end
          );

          return {
            drawTime,
            numbersByCol: columns.map((col, i) =>
              filtered[i] ? filtered[i].number : "--"
            ),
          };
        });

        setTableData(newTableData);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Fetching error:", err);
        setTableData([]);
        setLoading(false);
      });
  }, [selectedCol, selectedDate]);

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto p-6 pt-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
            Game Results Table
          </h1>
          <div className="w-24 h-1 bg-gray-800 mx-auto rounded-full"></div>
        </div>

        {/* Date & Range Selector */}
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6 mb-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            
            {/* Date Selector */}
            <div className="flex items-center">
              <label className="mr-3 font-medium text-gray-700">Select Date:</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg shadow-sm bg-white text-gray-900"
              />
            </div>

            {/* Range Buttons */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Grid3x3 className="w-5 h-5 text-gray-700" />
                <span className="text-gray-700 font-medium">Number Range:</span>
              </div>

              <div className="flex gap-2">
                {columnRanges.map((col, idx) => (
                  <button
                    key={col.label}
                    onClick={() => setSelectedCol(idx)}
                    className={`px-6 py-3 rounded-lg font-bold text-sm border transition-all duration-200 ${
                      selectedCol === idx
                        ? "bg-gray-800 text-white border-gray-900"
                        : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    {col.label}
                  </button>
                ))}
              </div>
            </div>

          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-gray-700" />
              <h2 className="text-xl font-semibold text-gray-900">
                Live Results - Range {columnRanges[selectedCol].label}
              </h2>
            </div>
          </div>

          {/* Grid Table */}
          <div className="overflow-auto rounded-lg shadow-sm border border-gray-200">
            <table className="w-full min-w-[900px] border-collapse bg-white rounded-lg">
              <thead>
                <tr className="bg-gray-900">
                  <th className="py-4 px-4 text-sm font-bold text-left text-gray-50 sticky left-0 bg-gray-900 z-10">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4" /> Time Slot
                    </div>
                  </th>
                  {columns.map((col) => (
                    <th key={col} className="py-3 px-4">
                      <span className="font-bold text-gray-50">{col}</span>
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {tableData.length === 0 && !loading && (
                  <tr>
                    <td
                      colSpan={columns.length + 1}
                      className="text-center py-8 text-gray-500"
                    >
                      No data found.
                    </td>
                  </tr>
                )}

                {tableData.map((row) => (
                  <tr
                    key={row.drawTime}
                    className="border-t border-gray-200 hover:bg-gray-50"
                  >
                    <td className="font-bold py-4 px-4 text-left sticky left-0 bg-gray-900 text-white">
                      {row.drawTime}
                    </td>

                    {columns.map((col, colIdx) => (
                      <td key={colIdx} className="py-2 px-2">
                        <div
                          className="py-3 px-4 text-center font-bold text-lg rounded border bg-white shadow-sm"
                          style={{ minWidth: "90px" }}
                        >
                          {loading ? (
                            <span className="animate-pulse text-gray-400">...</span>
                          ) : (
                            row.numbersByCol[colIdx] || "--"
                          )}
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="mt-6 text-sm text-gray-600">
            Showing results for{" "}
            <span className="font-semibold text-gray-900">{selectedDate}</span> • Range{" "}
            <span className="font-semibold text-gray-900">
              {columnRanges[selectedCol].label}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Page;
