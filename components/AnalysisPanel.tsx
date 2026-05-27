"use client";

import { useState } from "react";
import type { AnalysisRequest, AnalysisResponse, Anomaly, Dataset, SampleRow } from "@/lib/types";
import { windowStats } from "@/lib/anomaly";
import { fmtNum } from "@/lib/format";

const SEV_CHIP: Record<AnalysisResponse["severity"], string> = {
  hot: "chip chip-hot",
  warn: "chip chip-warn",
  info: "chip chip-info",
};
const SEV_LABEL: Record<AnalysisResponse["severity"], string> = {
  hot: "CRITICAL",
  warn: "ELEVATED",
  info: "NOMINAL",
};
const LIKELIHOOD_COLOR: Record<"low" | "medium" | "high", string> = {
  high: "var(--hot)",
  medium: "var(--amber)",
  low: "var(--text-dim)",
};

export default function AnalysisPanel({
  dataset,
  rows,
  rangeStart,
  rangeEnd,
  visibleAnomalies,
}: {
  dataset: Dataset;
  rows: SampleRow[];
  rangeStart: number;
  rangeEnd: number;
  visibleAnomalies: Anomaly[];
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResponse | null>(null);

  const runAnalysis = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    const ws = windowStats(rows, rangeStart, rangeEnd);
    const stats: AnalysisRequest["stats"] = dataset.channels.map((c) => ({
      channel: c.key,
      mean: ws[c.key].mean,
      std: ws[c.key].std,
      min: ws[c.key].min,
      max: ws[c.key].max,
      nominal: c.nominal,
    }));

    const payload: AnalysisRequest = {
      asset: dataset.asset,
      channels: dataset.channels,
      windowStart: rows[rangeStart].ts,
      windowEnd: rows[rangeEnd].ts,
      stats,
      anomalies: visibleAnomalies.map((a) => ({
        channel: a.channel,
        startTs: rows[a.startIdx].ts,
        endTs: rows[a.endIdx].ts,
        peakTs: rows[a.peakIdx].ts,
        peakValue: a.peakValue,
        peakZ: a.peakZ,
        durationMin: a.durationMin,
        severity: a.severity,
        composite: a.composite,
      })),
    };

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as AnalysisResponse;
      setResult(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Analysis failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-line">
        <div className="flex items-baseline gap-3">
          <span className="section-label">Decision Support</span>
          {result && (
            <span className="font-mono text-[10px] text-text-mute tracking-wider uppercase">
              src · {result.source === "model" ? "model" : "mock"}
            </span>
          )}
        </div>
        <button
          onClick={runAnalysis}
          disabled={loading}
          className="font-mono text-[10.5px] tracking-[0.12em] uppercase px-3 py-1 border border-line-2 text-text hover:bg-panel disabled:opacity-50"
        >
          {loading ? (
            <span className="inline-flex items-center gap-1">
              analyzing<span className="dot">.</span><span className="dot">.</span><span className="dot">.</span>
            </span>
          ) : (
            "run analysis"
          )}
        </button>
      </div>

      <div className="flex-1 overflow-auto">
        {!result && !loading && !error && (
          <Empty count={visibleAnomalies.length} />
        )}

        {error && (
          <div className="m-4 border border-[var(--hot)]/30 bg-[var(--hot)]/5 px-3 py-2 text-[12px] font-mono text-[var(--hot)]">
            error: {error}
          </div>
        )}

        {result && (
          <div className="px-4 py-4 space-y-5">
            {/* Headline */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className={SEV_CHIP[result.severity]}>{SEV_LABEL[result.severity]}</span>
                <span className="font-mono text-[10.5px] text-text-mute tnum">
                  conf {Math.round(result.confidence * 100)}%
                </span>
              </div>
              <p className="font-serif italic text-[15px] text-text leading-snug">
                {result.headline}
              </p>
            </div>

            {/* Hypotheses */}
            <div>
              <div className="section-label mb-2">Hypotheses</div>
              <ul className="space-y-3">
                {result.hypotheses.map((h, i) => (
                  <li key={i} className="border-l-2 pl-3" style={{ borderColor: LIKELIHOOD_COLOR[h.likelihood] }}>
                    <div className="flex items-baseline justify-between gap-3 mb-1">
                      <div className="text-[13px] text-text">{h.label}</div>
                      <span
                        className="font-mono text-[10px] tracking-[0.12em] uppercase shrink-0"
                        style={{ color: LIKELIHOOD_COLOR[h.likelihood] }}
                      >
                        {h.likelihood}
                      </span>
                    </div>
                    <div className="text-[12px] text-text-dim leading-relaxed">{h.rationale}</div>
                  </li>
                ))}
              </ul>
            </div>

            {/* Actions */}
            <div>
              <div className="section-label mb-2">Recommended Actions</div>
              <ol className="space-y-1.5">
                {result.actions.map((a, i) => (
                  <li key={i} className="flex gap-2 text-[12.5px] text-text leading-snug">
                    <span className="font-mono text-text-mute shrink-0 tnum">{String(i + 1).padStart(2, "0")}</span>
                    <span>{a}</span>
                  </li>
                ))}
              </ol>
            </div>

            {/* Footnote when mocked */}
            {result.source === "mock" && (
              <div className="border-t border-line pt-3 text-[11px] font-mono text-text-mute leading-relaxed">
                running without <span className="text-text-dim">ANTHROPIC_API_KEY</span> · deterministic fallback in use
              </div>
            )}
          </div>
        )}

        {loading && <LoadingSkeleton />}
      </div>
    </div>
  );
}

function Empty({ count }: { count: number }) {
  return (
    <div className="px-4 py-8 text-[12.5px] text-text-dim space-y-3">
      <div className="font-mono text-[10.5px] tracking-[0.1em] uppercase text-text-mute">
        ready · {count} anomal{count === 1 ? "y" : "ies"} in current window
      </div>
      <p className="text-text-dim leading-relaxed">
        Run analysis to generate a structured decision-support brief from the current window&apos;s statistics and detected anomalies.
      </p>
      <p className="text-text-mute leading-relaxed text-[11.5px]">
        Output: top-line severity assessment, three ranked hypotheses with rationale grounded in the input data, and an ordered list of recommended on-call actions.
      </p>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="px-4 py-4 space-y-4 animate-pulse">
      <div className="h-3 w-1/3 bg-line" />
      <div className="h-5 w-4/5 bg-line" />
      <div className="space-y-2">
        <div className="h-3 w-full bg-line" />
        <div className="h-3 w-11/12 bg-line" />
        <div className="h-3 w-3/4 bg-line" />
      </div>
      <div className="h-3 w-2/5 bg-line mt-6" />
      <div className="space-y-2">
        <div className="h-3 w-5/6 bg-line" />
        <div className="h-3 w-3/4 bg-line" />
      </div>
    </div>
  );
}
