"use client";

import React from "react";

const LoadingOverlay = ({ visible = false }) => {
  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950 backdrop-blur-sm"
      role="status"
      aria-live="polite"
    >
      {/* GOOGLE FONT IMPORT */}
      <style jsx>{`
        @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,200..800&family=Edu+NSW+ACT+Cursive:wght@400..700&family=Zalando+Sans:ital,wght@0,200..900;1,200..900&display=swap');
      `}</style>

      <div className="flex flex-col items-center gap-6">
        <h1
          className="skillking-loader text-6xl sm:text-7xl md:text-8xl tracking-tight"
          style={{
            fontFamily: "'Edu NSW ACT Cursive', cursive",
            fontWeight: 700,
          }}
        >
          SkillKing
        </h1>
      </div>

      <style jsx>{`
        .skillking-loader {
          position: relative;
          display: inline-block;
          color: transparent;
          overflow: visible;

          /* Prevent text cut */
          line-height: 1.2;
          padding: 0.3em 0;

          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;

          /* Shimmer Effect */
          background: linear-gradient(
            90deg,
            rgba(255, 255, 255, 0.05) 0%,
            rgba(255, 255, 255, 0.25) 30%,
            rgba(255, 255, 255, 0.95) 50%,
            rgba(255, 255, 255, 0.25) 70%,
            rgba(255, 255, 255, 0.05) 100%
          );

          background-size: 200% 100%;
          -webkit-background-clip: text;
          background-clip: text;

          animation: skillkingShine 1.8s linear infinite;
        }

        @keyframes skillkingShine {
          0% {
            background-position: -120% 0;
          }
          100% {
            background-position: 120% 0;
          }
        }
      `}</style>
    </div>
  );
};

export default LoadingOverlay;
