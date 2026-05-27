"use client";

import type { Anomaly, ChannelKey, ChannelMeta, SampleRow } from "@/lib/types";
import { fmtClock, fmtDuration, fmtInt, fmtNum } from "@/lib/format";

const SEV_CHIP: Record<Anomaly["severity"], string> = {
  hot: "chip chip-hot",
  warn: "chip chip-warn",
  info: "chip chip-info",
};
const SEV_LABEL: Record<Anomaly["severity"], string> = {
  hot: "CRIT",
  warn: "WARN",
  info: "INFO",
};

export default function AnomalyList({
  anomalies,
  rows,
  channels,
  selectedId,
  onSelect,
  severityFilter,
  setSeverityFilter,
}: {
  anomalies: Anomaly[];
  rows: SampleRow[];
  channels: ChannelMeta[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  severityFilter: Record<"hot" | "warn" | "info", boolean>;
  setSeverityFilter: (f: Record<"hot" | "warn" | "info", boolean>) => void;
}) {
  const visible = anomalies.filter((a) => severityFilter[a.severity]);
  const counts = {
    hot: anomalies.filter((a) => a.severity === "hot").length,
    warn: anomalies.filter((a) => a.severity === "warn").length,
    info: anomalies.filter((a) => a.severity === "info").length,
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-line">
        <div className="flex items-baseline gap-3">
          <span className="section-label">Anomaly Registry</span>
          <span className="font-mono text-[11px] text-text-dim tnum">
            {visible.length}<span className="text-text-mute">/{anomalies.length}</span>
          </span>
        </div>
        <div className="flex gap-1.5">
          {(["hot", "warn", "info"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setSeverityFilter({ ...severityFilter, [s]: !severityFilter[s] })}
              className={`font-mono text-[10px] px-1.5 py-0.5 border tracking-[0.1em] ${
                severityFilter[s]
                  ? s === "hot" ? "text-[var(--hot)] border-[var(--hot)]/40 bg-[var(--hot)]/8"
                  : s === "warn" ? "text-[var(--amber)] border-[var(--amber)]/40 bg-[var(--amber)]/8"
                  : "text-[var(--cyan)] border-[var(--cyan)]/40 bg-[var(--cyan)]/5"
                  : "text-text-mute border-line"
              }`}
              title={`${counts[s]} ${SEV_LABEL[s]}`}
            >
              {SEV_LABEL[s]} {counts[s]}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-auto">
        {visible.length === 0 ? (
          <div className="px-4 py-10 text-center text-text-mute text-[12px] font-mono">
            no anomalies in current filter
          </div>
        ) : (
          <ul>
            {visible.map((a) => {
              const ch = channels.find((c) => c.key === a.channel)!;
              const isSel = a.id === selectedId;
              return (
                <li key={a.id}>
                  <button
                    onClick={() => onSelect(a.id)}
                    className={`w-full text-left px-4 py-3 border-b border-line/60 transition-colors ${
                      isSel ? "bg-panel" : "hover:bg-panel/50"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className={SEV_CHIP[a.severity]}>{SEV_LABEL[a.severity]}</span>
                        {a.composite && (
                          <span className="chip" style={{ color: "var(--violet)", borderColor: "rgba(196,181,253,0.35)" }}>
                            COMPOSITE
                          </span>
                        )}
                      </div>
                      <span className="font-mono text-[10.5px] text-text-mute tnum">
                        {fmtClock(rows[a.peakIdx].ts)}Z
                      </span>
                    </div>
                    <div className="flex items-baseline justify-between">
                      <div>
                        <div className="text-[12.5px] text-text">{ch.label}</div>
                        <div className="font-mono text-[10.5px] text-text-mute mt-0.5">
                          peak <span className="text-text-dim">{a.channel === "rpm" ? fmtInt(a.peakValue) : fmtNum(a.peakValue, 2)}</span> {ch.unit} · z=<span className="text-text-dim">{fmtNum(a.peakZ, 1)}</span> · {fmtDuration(a.durationMin)}
                        </div>
                      </div>
                      {isSel && <span className="font-mono text-[10px] text-amber">›</span>}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
