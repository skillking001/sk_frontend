"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function HowToPlay({ isOpen, onClose }) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          {/* Modal content with animation */}
          <motion.div
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="bg-white/10 backdrop-blur-xl border border-white/20 p-6 rounded-3xl shadow-2xl w-[90%] max-w-4xl relative"
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-3 right-3 text-gray-300 hover:text-white text-xl"
            >
              ✖
            </button>

            {/* Header */}
            <h3 className="text-3xl font-bold text-center mb-6 bg-gradient-to-r from-purple-300 to-pink-400 bg-clip-text text-transparent">
              3D Rule
            </h3>

            {/* Content */}
            <div className="overflow-x-auto rounded-xl border border-white/20">
              <table className="w-full text-sm text-white">
                <thead>
                  <tr className="bg-gradient-to-r from-purple-600 to-pink-600 text-white">
                    <th className="p-3 border border-white/20">DRAW</th>
                    <th className="p-3 border border-white/20">NO.</th>
                    <th className="p-3 border border-white/20">IF 3D GAME</th>
                    <th className="p-3 border border-white/20">RUPEES</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="bg-white/5 hover:bg-white/10 transition">
                    <td className="p-3 border border-white/20">Straight</td>
                    <td className="p-3 border border-white/20">1 2 3</td>
                    <td className="p-3 border border-white/20">Only Exact Match Wins</td>
                    <td className="p-3 border border-white/20">9000</td>
                  </tr>
                  <tr className="hover:bg-white/10 transition">
                    <td className="p-3 border border-white/20">Box (3-Way)</td>
                    <td className="p-3 border border-white/20">1 2 1</td>
                    <td className="p-3 border border-white/20">112, 121, 211</td>
                    <td className="p-3 border border-white/20">3000</td>
                  </tr>
                  <tr className="bg-white/5 hover:bg-white/10 transition">
                    <td className="p-3 border border-white/20">Box (6-Way)</td>
                    <td className="p-3 border border-white/20">1 2 3</td>
                    <td className="p-3 border border-white/20">123, 132, 213, 231, 312, 321</td>
                    <td className="p-3 border border-white/20">1500</td>
                  </tr>
                  <tr className="hover:bg-white/10 transition">
                    <td className="p-3 border border-white/20">Front Pair</td>
                    <td className="p-3 border border-white/20">1 2 X</td>
                    <td className="p-3 border border-white/20">12 + Any Number</td>
                    <td className="p-3 border border-white/20">900</td>
                  </tr>
                  <tr className="bg-white/5 hover:bg-white/10 transition">
                    <td className="p-3 border border-white/20">Back Pair</td>
                    <td className="p-3 border border-white/20">X 2 3</td>
                    <td className="p-3 border border-white/20">Any Number + 23</td>
                    <td className="p-3 border border-white/20">900</td>
                  </tr>
                  <tr className="hover:bg-white/10 transition">
                    <td className="p-3 border border-white/20">Split Pair</td>
                    <td className="p-3 border border-white/20">1 X 3</td>
                    <td className="p-3 border border-white/20">Any Number + 13</td>
                    <td className="p-3 border border-white/20">900</td>
                  </tr>
                  <tr className="bg-white/5 hover:bg-white/10 transition">
                    <td className="p-3 border border-white/20">Any Pair</td>
                    <td className="p-3 border border-white/20">X 2 3</td>
                    <td className="p-3 border border-white/20">Any Number + 23</td>
                    <td className="p-3 border border-white/20">300</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
