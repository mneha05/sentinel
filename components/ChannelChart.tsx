"use client";

import { useMemo, useRef, useState, useCallback } from "react";
import type { Anomaly, ChannelKey, ChannelMeta, SampleRow } from "@/lib/types";
import { fmtClock, fmtInt, fmtNum } from "@/lib/format";

const COLORS: Record<ChannelKey, string> = {
  vib_x: "var(--cyan)",
  vib_y: "var(--violet)",
  temp:  "var(--amber)",
  rpm:   "var(--mint)",
};

const HEIGHT = 132;
const PAD_L = 56;
const PAD_R = 12;
const PAD_T = 14;
const PAD_B = 22;

export default function ChannelChart({
  meta,
  rows,
  rangeStart,
  rangeEnd,
  anomalies,
  selectedAnomalyId,
  onSelectAnomaly,
  highlight,
  isFocus,
}: {
  meta: ChannelMeta;
  rows: SampleRow[];
  rangeStart: number;
  rangeEnd: number;
  anomalies: Anomaly[];
  selectedAnomalyId: string | null;
  onSelectAnomaly: (id: string) => void;
  highlight: boolean;
  isFocus: boolean;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(800);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  // Resize observer
  const setRef = useCallback((el: HTMLDivElement | null) => {
    containerRef.current = el;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) setWidth(e.contentRect.width);
    });
    ro.observe(el);
  }, []);

  const slice = useMemo(() => rows.slice(rangeStart, rangeEnd + 1), [rows, rangeStart, rangeEnd]);
  const N = slice.length;
  const vals = slice.map((r) => r[meta.key] as number);

  const { yMin, yMax } = useMemo(() => {
    let mn = Math.min(...vals, meta.nominal.low);
    let mx = Math.max(...vals, meta.nominal.high);
    const pad = (mx - mn) * 0.08 || 0.5;
    return { yMin: mn - pad, yMax: mx + pad };
  }, [vals, meta]);

  const innerW = Math.max(40, width - PAD_L - PAD_R);
  const innerH = HEIGHT - PAD_T - PAD_B;
  const xScale = (i: number) => PAD_L + (i / Math.max(1, N - 1)) * innerW;
  const yScale = (v: number) => PAD_T + (1 - (v - yMin) / (yMax - yMin || 1)) * innerH;

  // Build path
  const linePath = useMemo(() => {
    return vals.map((v, i) => `${i === 0 ? "M" : "L"}${xScale(i).toFixed(2)},${yScale(v).toFixed(2)}`).join(" ");
  }, [vals, width, yMin, yMax]); // eslint-disable-line react-hooks/exhaustive-deps

  // y-axis ticks (4)
  const yTicks = useMemo(() => {
    const ticks = [];
    for (let i = 0; i <= 3; i++) {
      const v = yMin + ((yMax - yMin) * i) / 3;
      ticks.push(v);
    }
    return ticks;
  }, [yMin, yMax]);

  // x-axis ticks (every 4 hours)
  const xTicks = useMemo(() => {
    const ticks: Array<{ i: number; ts: number }> = [];
    const stepMs = 4 * 60 * 60 * 1000;
    if (slice.length === 0) return ticks;
    const start = slice[0].ts;
    const end = slice[slice.length - 1].ts;
    const firstTick = Math.ceil(start / stepMs) * stepMs;
    for (let ts = firstTick; ts <= end; ts += stepMs) {
      const ratio = (ts - start) / Math.max(1, end - start);
      const i = Math.round(ratio * (N - 1));
      ticks.push({ i, ts });
    }
    return ticks;
  }, [slice, N]);

  // Anomalies for this channel intersecting the current range
  const chanAnomalies = anomalies.filter(
    (a) => a.channel === meta.key && a.endIdx >= rangeStart && a.startIdx <= rangeEnd,
  );

  const handleMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
    const x = e.clientX - rect.left;
    if (x < PAD_L || x > PAD_L + innerW) { setHoverIdx(null); return; }
    const ratio = (x - PAD_L) / innerW;
    setHoverIdx(Math.max(0, Math.min(N - 1, Math.round(ratio * (N - 1)))));
  };

  const color = COLORS[meta.key];
  const breach = (v: number) => v < meta.nominal.low || v > meta.nominal.high;
  const curVal = hoverIdx != null ? vals[hoverIdx] : null;
  const curTs = hoverIdx != null ? slice[hoverIdx].ts : null;

  return (
    <div
      ref={setRef}
      className={`relative border-b border-line ${highlight ? "bg-panel/40" : ""} ${
        isFocus ? "" : "opacity-95"
      }`}
      onMouseLeave={() => setHoverIdx(null)}
    >
      {/* Channel label overlay */}
      <div className="absolute left-3 top-2 z-10 pointer-events-none flex items-center gap-2">
        <span className="inline-block h-1.5 w-1.5" style={{ background: color }} />
        <span className="section-label" style={{ color: "var(--text-dim)" }}>{meta.label}</span>
        <span className="font-mono text-[10.5px] text-text-mute">{meta.unit}</span>
      </div>

      {/* Current readout (top-right) */}
      {curVal != null && curTs != null && (
        <div className="absolute right-3 top-2 z-10 pointer-events-none flex items-center gap-3">
          <span className="font-mono text-[10.5px] text-text-mute tnum">{fmtClock(curTs)}Z</span>
          <span
            className={`font-mono text-[14px] tnum ${breach(curVal) ? "text-[var(--hot)]" : "text-text"}`}
          >
            {meta.key === "rpm" ? fmtInt(curVal) : fmtNum(curVal, 2)}
          </span>
        </div>
      )}

      <svg
        width={width}
        height={HEIGHT}
        onMouseMove={handleMove}
        style={{ display: "block" }}
      >
        {/* Nominal band */}
        {meta.nominal.low > yMin && meta.nominal.high < yMax && (
          <rect
            x={PAD_L}
            y={yScale(meta.nominal.high)}
            width={innerW}
            height={Math.max(0, yScale(meta.nominal.low) - yScale(meta.nominal.high))}
            fill="rgba(255,255,255,0.018)"
          />
        )}

        {/* Y grid + labels */}
        {yTicks.map((v, idx) => (
          <g key={`y${idx}`}>
            <line
              x1={PAD_L}
              x2={PAD_L + innerW}
              y1={yScale(v)}
              y2={yScale(v)}
              stroke="var(--line)"
              strokeWidth="1"
              strokeDasharray="2 4"
              opacity="0.55"
            />
            <text
              x={PAD_L - 8}
              y={yScale(v) + 3.5}
              textAnchor="end"
              fontFamily="var(--font-mono)"
              fontSize="10"
              fill="var(--text-mute)"
            >
              {meta.key === "rpm" ? Math.round(v).toLocaleString() : v.toFixed(meta.key === "temp" ? 1 : 2)}
            </text>
          </g>
        ))}

        {/* X grid */}
        {xTicks.map((t, idx) => (
          <g key={`x${idx}`}>
            <line
              x1={xScale(t.i)}
              x2={xScale(t.i)}
              y1={PAD_T}
              y2={PAD_T + innerH}
              stroke="var(--line)"
              strokeWidth="1"
              opacity="0.35"
            />
            <text
              x={xScale(t.i)}
              y={HEIGHT - 6}
              textAnchor="middle"
              fontFamily="var(--font-mono)"
              fontSize="10"
              fill="var(--text-mute)"
            >
              {fmtClock(t.ts)}
            </text>
          </g>
        ))}

        {/* Anomaly bands */}
        {chanAnomalies.map((a) => {
          const sLocal = Math.max(0, a.startIdx - rangeStart);
          const eLocal = Math.min(N - 1, a.endIdx - rangeStart);
          const x = xScale(sLocal);
          const w = Math.max(2, xScale(eLocal) - xScale(sLocal));
          const isSel = a.id === selectedAnomalyId;
          const fill = a.severity === "hot"
            ? "rgba(255,92,92,0.13)"
            : a.severity === "warn"
            ? "rgba(251,191,36,0.10)"
            : "rgba(125,211,252,0.08)";
          const stroke = a.severity === "hot"
            ? "var(--hot)"
            : a.severity === "warn"
            ? "var(--amber)"
            : "var(--cyan)";
          return (
            <g key={a.id} style={{ cursor: "pointer" }} onClick={() => onSelectAnomaly(a.id)}>
              <rect
                x={x}
                y={PAD_T}
                width={w}
                height={innerH}
                fill={fill}
                stroke={stroke}
                strokeWidth={isSel ? 1.2 : 0.6}
                strokeDasharray={isSel ? "0" : "3 3"}
                opacity={isSel ? 1 : 0.85}
              />
            </g>
          );
        })}

        {/* Data line */}
        <path d={linePath} fill="none" stroke={color} strokeWidth="1.25" strokeLinejoin="round" />

        {/* Hover crosshair */}
        {hoverIdx != null && (
          <g pointerEvents="none">
            <line
              x1={xScale(hoverIdx)}
              x2={xScale(hoverIdx)}
              y1={PAD_T}
              y2={PAD_T + innerH}
              stroke="var(--text-dim)"
              strokeWidth="0.8"
              strokeDasharray="2 2"
              opacity="0.7"
            />
            <circle
              cx={xScale(hoverIdx)}
              cy={yScale(vals[hoverIdx])}
              r={2.5}
              fill={color}
              stroke="var(--bg)"
              strokeWidth="1"
            />
          </g>
        )}
      </svg>
    </div>
  );
}
