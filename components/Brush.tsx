"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Anomaly, SampleRow } from "@/lib/types";

const HEIGHT = 56;
const PAD_L = 56;
const PAD_R = 12;

export default function Brush({
  rows,
  anomalies,
  rangeStart,
  rangeEnd,
  onChange,
}: {
  rows: SampleRow[];
  anomalies: Anomaly[];
  rangeStart: number;
  rangeEnd: number;
  onChange: (start: number, end: number) => void;
}) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(800);
  const N = rows.length;

  // Resize
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) setWidth(e.contentRect.width);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const innerW = Math.max(40, width - PAD_L - PAD_R);
  const xToIdx = (x: number) => {
    const ratio = Math.max(0, Math.min(1, (x - PAD_L) / innerW));
    return Math.round(ratio * (N - 1));
  };
  const idxToX = (i: number) => PAD_L + (i / Math.max(1, N - 1)) * innerW;

  // Drag state — supports left handle, right handle, body drag
  type DragKind = "left" | "right" | "body";
  const dragRef = useRef<{ kind: DragKind; originX: number; originStart: number; originEnd: number } | null>(null);

  const onPointerDown = (kind: DragKind) => (e: React.PointerEvent<SVGElement>) => {
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    dragRef.current = { kind, originX: e.clientX, originStart: rangeStart, originEnd: rangeEnd };
  };
  const onPointerMove = (e: React.PointerEvent<SVGElement>) => {
    if (!dragRef.current || !wrapRef.current) return;
    const rect = wrapRef.current.getBoundingClientRect();
    const dx = e.clientX - dragRef.current.originX;
    const idxDelta = Math.round((dx / innerW) * (N - 1));
    const { kind, originStart, originEnd } = dragRef.current;
    let s = originStart;
    let en = originEnd;
    if (kind === "left") s = Math.min(originEnd - 5, Math.max(0, originStart + idxDelta));
    else if (kind === "right") en = Math.max(originStart + 5, Math.min(N - 1, originEnd + idxDelta));
    else if (kind === "body") {
      const len = originEnd - originStart;
      s = Math.max(0, Math.min(N - 1 - len, originStart + idxDelta));
      en = s + len;
    }
    onChange(s, en);
    // suppress unused-warning
    void rect;
  };
  const onPointerUp = () => { dragRef.current = null; };

  // Mini line overview (use vib_x as the primary trace)
  const vals = rows.map((r) => r.vib_x);
  const yMin = Math.min(...vals);
  const yMax = Math.max(...vals);
  const yScale = (v: number) => 8 + (1 - (v - yMin) / (yMax - yMin || 1)) * (HEIGHT - 16);
  const linePath = vals.map((v, i) => `${i === 0 ? "M" : "L"}${idxToX(i).toFixed(2)},${yScale(v).toFixed(2)}`).join(" ");

  const xStart = idxToX(rangeStart);
  const xEnd = idxToX(rangeEnd);

  // Click to recenter
  const onSvgClick = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (dragRef.current) return;
    const rect = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
    const x = e.clientX - rect.left;
    const idx = xToIdx(x);
    const len = rangeEnd - rangeStart;
    const s = Math.max(0, Math.min(N - 1 - len, idx - Math.floor(len / 2)));
    onChange(s, s + len);
  }, [rangeStart, rangeEnd, N, innerW, onChange]); // eslint-disable-line

  return (
    <div ref={wrapRef} className="relative border-b border-line bg-panel/30">
      <div className="absolute left-3 top-2 section-label">Range · 24h</div>
      <svg
        width={width}
        height={HEIGHT}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onClick={onSvgClick}
        style={{ display: "block", cursor: dragRef.current ? "grabbing" : "default" }}
      >
        {/* Anomaly ticks across full 24h */}
        {anomalies.map((a) => {
          const x = idxToX(a.peakIdx);
          const color =
            a.severity === "hot" ? "var(--hot)" :
            a.severity === "warn" ? "var(--amber)" : "var(--cyan)";
          return (
            <line
              key={`tick-${a.id}`}
              x1={x} x2={x}
              y1={HEIGHT - 14} y2={HEIGHT - 6}
              stroke={color}
              strokeWidth="1"
              opacity="0.8"
            />
          );
        })}

        {/* Overview line */}
        <path d={linePath} fill="none" stroke="var(--text-mute)" strokeWidth="0.8" opacity="0.65" />

        {/* Selected window highlight */}
        <rect
          x={xStart} y={4}
          width={Math.max(2, xEnd - xStart)} height={HEIGHT - 8}
          fill="rgba(251,191,36,0.07)"
          stroke="var(--amber)"
          strokeWidth="1"
          onPointerDown={onPointerDown("body")}
          style={{ cursor: "grab" }}
        />

        {/* Handles */}
        <rect
          x={xStart - 4} y={4}
          width="8" height={HEIGHT - 8}
          fill="var(--amber)" opacity="0.5"
          onPointerDown={onPointerDown("left")}
          style={{ cursor: "ew-resize" }}
        />
        <rect
          x={xEnd - 4} y={4}
          width="8" height={HEIGHT - 8}
          fill="var(--amber)" opacity="0.5"
          onPointerDown={onPointerDown("right")}
          style={{ cursor: "ew-resize" }}
        />

        {/* Axis frame */}
        <line x1={PAD_L} x2={width - PAD_R} y1={HEIGHT - 4} y2={HEIGHT - 4} stroke="var(--line-2)" strokeWidth="1" />
      </svg>
    </div>
  );
}
