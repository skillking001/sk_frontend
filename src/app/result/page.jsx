"use client";
import React, { useState, useEffect } from "react";
import { Calendar, Clock, Grid3x3, Home } from "lucide-react";
import Link from "next/link";
import Navbar from "../../Components/Navbar/Navbar";
import axios from "axios";

const columnRanges = [
  { label: "10-19", start: 10, end: 19 },
  { label: "30-39", start: 30, end: 39 },
  { label: "50-59", start: 50, end: 59 },
];

function getColumns(start, end) {
  const arr = [];
  for (let i = start; i <= end; i++) arr.push(i);
  return arr;
}

function filterNumbersByColumn(numbers, colStart, colEnd) {
  return numbers.filter((numObj) => {
    const nStr = String(numObj.number);
    const prefix = Number(nStr.slice(0, 2));
    return prefix >= colStart && prefix <= colEnd;
  });
}

const Page = () => {
  const [selectedCol, setSelectedCol] = useState(0);
  const [tableData, setTableData] = useState([]);
  const [rowLabels, setRowLabels] = useState([]);
  const [loading, setLoading] = useState(false);

  const columns = getColumns(
    columnRanges[selectedCol].start,
    columnRanges[selectedCol].end
  );

  const todayDate = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    setLoading(true);

    axios
      .get(`${process.env.NEXT_PUBLIC_API_BASE_URL}/get-winning-slots`)
      .then((res) => {
        const records = Array.isArray(res.data.results)
          ? res.data.results
          : [];

        // Filter results for today
        const filteredRecords = records.filter(
          (rec) => rec.drawDate === todayDate
        );

        // Collect all unique draw times
        const allDrawTimes = Array.from(
          new Set(
            filteredRecords
              .map((rec) =>
                typeof rec.DrawTime === "string"
                  ? rec.DrawTime.replace(/['"]+/g, "").trim()
                  : rec.DrawTime
              )
              .filter(Boolean)
          )
        );

        setRowLabels(allDrawTimes);

        // Group numbers by draw time
        const timeToNumbers = {};
        filteredRecords.forEach((rec) => {
          let numbers = rec.winningNumbers;
          if (typeof numbers === "string") {
            try {
              numbers = JSON.parse(numbers);
            } catch {
              numbers = [];
            }
          }
          let t = rec.DrawTime;
          if (typeof t === "string") {
            t = t.replace(/['"]+/g, "").trim();
          }
          timeToNumbers[t] = numbers;
        });

        // Prepare final table data
        const newTableData = allDrawTimes.map((drawTime) => {
          const slotNumbers = timeToNumbers[drawTime] || [];
          const filtered = filterNumbersByColumn(
            slotNumbers,
            columnRanges[selectedCol].start,
            columnRanges[selectedCol].end
          );
          return {
            drawTime,
            numbersByCol: columns.map((col, i) =>
              filtered[i] ? String(filtered[i].number) : "--"
            ),
          };
        });

        setTableData(newTableData);
        setLoading(false);
      })
      .catch(() => {
        setTableData([]);
        setRowLabels([]);
        setLoading(false);
      });
  }, [selectedCol]);

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

        {/* Range Selector */}
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6 mb-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
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
                      ? "bg-gray-800 text-white shadow-sm border-gray-900"
                      : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400"
                  }`}
                >
                  {col.label}
                </button>
              ))}
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

          <div className="overflow-auto rounded-lg shadow-sm border border-gray-200">
            <table className="w-full min-w-[900px] border-collapse bg-white rounded-lg">
              <thead>
                <tr className="bg-gray-900">
                  <th className="py-4 px-4 text-sm font-bold text-left text-gray-50 sticky left-0 bg-gray-900 z-10 border-b border-gray-300">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-gray-700" />
                      Time Slot
                    </div>
                  </th>
                  {columns.map((col) => (
                    <th key={col} className="py-3 px-4 border-b border-gray-300">
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
                    className="border-t border-gray-200 hover:bg-gray-50 transition-colors duration-150"
                  >
                    <td className="font-bold py-4 px-4 text-left text-gray-50 sticky left-0 bg-gray-900 z-10 border-r border-gray-200">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-gray-600 rounded-full"></div>
                        {row.drawTime}
                      </div>
                    </td>
                    {columns.map((col, colIdx) => (
                      <td key={colIdx} className="py-2 px-2">
                        <div
                          className={`flex-1 py-3 px-4 text-center font-bold text-lg rounded border border-gray-300 bg-white shadow-sm transition-all duration-200`}
                          style={{ minWidth: "90px" }}
                        >
                          <span className="text-xl font-bold tracking-wide text-gray-900">
                            {loading ? (
                              <span className="animate-pulse text-gray-400">...</span>
                            ) : (
                              row.numbersByCol[colIdx] ?? "--"
                            )}
                          </span>
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6 flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="text-sm text-gray-600">
              Showing results for{" "}
              <span className="font-semibold text-gray-900">{todayDate}</span>{" "}
              • Range{" "}
              <span className="font-semibold text-gray-900">
                {columnRanges[selectedCol].label}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Page;