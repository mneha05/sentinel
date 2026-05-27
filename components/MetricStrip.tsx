"use client";

import type { ChannelKey, ChannelMeta, SampleRow } from "@/lib/types";
import { fmtInt, fmtNum } from "@/lib/format";

const CHANNEL_COLOR: Record<ChannelKey, string> = {
  vib_x: "var(--cyan)",
  vib_y: "var(--violet)",
  temp:  "var(--amber)",
  rpm:   "var(--mint)",
};

export default function MetricStrip({
  channels,
  rows,
  rangeStart,
  rangeEnd,
  onPick,
  picked,
}: {
  channels: ChannelMeta[];
  rows: SampleRow[];
  rangeStart: number;
  rangeEnd: number;
  onPick: (k: ChannelKey) => void;
  picked: ChannelKey | null;
}) {
  const slice = rows.slice(rangeStart, rangeEnd + 1);
  return (
    <div className="grid grid-cols-4 gap-0 border-b border-line">
      {channels.map((ch) => {
        const values = slice.map((r) => r[ch.key] as number);
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        const min = Math.min(...values);
        const max = Math.max(...values);
        const last = values[values.length - 1];
        const breach = last < ch.nominal.low || last > ch.nominal.high;
        const isPicked = picked === ch.key;
        return (
          <button
            key={ch.key}
            onClick={() => onPick(ch.key)}
            className={`relative text-left px-5 py-3.5 border-r border-line last:border-r-0 transition-colors ${
              isPicked ? "bg-panel" : "hover:bg-panel/60"
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <span
                  className="inline-block h-2 w-2"
                  style={{ background: CHANNEL_COLOR[ch.key] }}
                />
                <span className="section-label">{ch.label}</span>
              </div>
              <span className="font-mono text-[10.5px] text-text-mute tracking-[0.1em] uppercase">
                {ch.unit}
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span
                className={`font-mono text-[26px] font-light tnum ${
                  breach ? "text-[var(--hot)]" : "text-text"
                }`}
              >
                {ch.key === "rpm" ? fmtInt(last) : fmtNum(last, 2)}
              </span>
              <span className="font-mono text-[11px] text-text-mute tnum">
                μ {ch.key === "rpm" ? fmtInt(mean) : fmtNum(mean, 2)}
              </span>
            </div>
            <div className="mt-2 flex items-center justify-between">
              <div className="font-mono text-[10.5px] text-text-mute tnum tracking-wider">
                {ch.key === "rpm" ? fmtInt(min) : fmtNum(min, 2)}
                <span className="mx-1 text-text-mute/60">—</span>
                {ch.key === "rpm" ? fmtInt(max) : fmtNum(max, 2)}
              </div>
              <Sparkline
                values={values}
                color={CHANNEL_COLOR[ch.key]}
              />
            </div>
            {isPicked && (
              <span className="absolute left-0 top-0 h-full w-[2px]" style={{ background: CHANNEL_COLOR[ch.key] }} />
            )}
          </button>
        );
      })}
    </div>
  );
}

function Sparkline({ values, color }: { values: number[]; color: string }) {
  const W = 80, H = 22;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const step = values.length > 1 ? W / (values.length - 1) : 0;
  const d = values
    .map((v, i) => `${i === 0 ? "M" : "L"}${(i * step).toFixed(2)},${(H - ((v - min) / span) * H).toFixed(2)}`)
    .join(" ");
  return (
    <svg width={W} height={H} className="overflow-visible">
      <path d={d} fill="none" stroke={color} strokeWidth="1" strokeLinejoin="miter" opacity="0.85" />
    </svg>
  );
}
