"use client";

import { useEffect, useState } from "react";
import type { Dataset, Severity } from "@/lib/types";
import { fmtDateTime } from "@/lib/format";

const SEV_TEXT: Record<Severity, string> = {
  info: "NOMINAL",
  warn: "ELEVATED",
  hot:  "CRITICAL",
};

export default function Header({
  dataset,
  worstSeverity,
}: {
  dataset: Dataset;
  worstSeverity: Severity;
}) {
  const [now, setNow] = useState<number>(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <header className="border-b border-line bg-bg/80 backdrop-blur">
      <div className="px-6 py-3 flex items-center gap-6">
        {/* Wordmark */}
        <div className="flex items-baseline gap-2.5">
          <Mark />
          <div className="font-mono text-[15px] tracking-[0.28em] font-medium">
            SENTINEL
          </div>
          <div className="text-text-mute text-[11px] font-mono tracking-[0.18em] uppercase">
            v0.4.1
          </div>
        </div>

        <div className="h-5 w-px bg-line" />

        {/* Asset identity */}
        <div className="flex items-baseline gap-3">
          <span className="section-label">Asset</span>
          <span className="font-mono text-[13px] text-text">{dataset.asset.id}</span>
          <span className="text-text-dim text-[13px]">·</span>
          <span className="text-[13px] text-text">{dataset.asset.name}</span>
          <span className="text-text-mute text-[12px]">· {dataset.asset.site}</span>
        </div>

        <div className="flex-1" />

        {/* Status pill */}
        <div className={`chip ${worstSeverity === "hot" ? "chip-hot pulse-hot" : worstSeverity === "warn" ? "chip-warn" : "chip-info"}`}>
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-current" />
          <span>{SEV_TEXT[worstSeverity]}</span>
        </div>

        <div className="h-5 w-px bg-line" />

        {/* Live clock */}
        <div className="font-mono text-[12px] text-text-dim tnum">
          {fmtDateTime(now)}
        </div>
      </div>
    </header>
  );
}

function Mark() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
      <path
        d="M 1 8 L 4 8 L 5 4 L 7 11 L 9 6 L 10 8 L 13 8"
        fill="none"
        stroke="var(--amber)"
        strokeWidth="1.4"
        strokeLinecap="square"
        strokeLinejoin="miter"
      />
    </svg>
  );
}
