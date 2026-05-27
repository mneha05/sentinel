"use client";

import { useMemo, useState } from "react";
import type { Anomaly, ChannelKey, Dataset, Severity } from "@/lib/types";
import { detectAnomalies } from "@/lib/anomaly";
import Header from "./Header";
import MetricStrip from "./MetricStrip";
import ChannelChart from "./ChannelChart";
import Brush from "./Brush";
import AnomalyList from "./AnomalyList";
import AnalysisPanel from "./AnalysisPanel";

export default function Dashboard({ dataset }: { dataset: Dataset }) {
  const anomalies = useMemo(() => detectAnomalies(dataset), [dataset]);
  const N = dataset.rows.length;

  // Selection state
  const [rangeStart, setRangeStart] = useState(0);
  const [rangeEnd, setRangeEnd] = useState(N - 1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pickedChannel, setPickedChannel] = useState<ChannelKey | null>(null);
  const [severityFilter, setSeverityFilter] = useState<Record<"hot" | "warn" | "info", boolean>>({
    hot: true, warn: true, info: true,
  });

  // When an anomaly is selected, zoom range to a generous window around it.
  const onSelectAnomaly = (id: string) => {
    setSelectedId(id);
    const a = anomalies.find((x) => x.id === id);
    if (!a) return;
    const center = a.peakIdx;
    const halfWindow = Math.max(60, (a.endIdx - a.startIdx) * 3);
    setRangeStart(Math.max(0, center - halfWindow));
    setRangeEnd(Math.min(N - 1, center + halfWindow));
  };

  const worstSeverity: Severity = useMemo(() => {
    if (anomalies.some((a) => a.severity === "hot")) return "hot";
    if (anomalies.some((a) => a.severity === "warn")) return "warn";
    return "info";
  }, [anomalies]);

  // Anomalies inside the current viewing range (passed to AI)
  const inWindow = useMemo(
    () => anomalies.filter((a) => a.endIdx >= rangeStart && a.startIdx <= rangeEnd),
    [anomalies, rangeStart, rangeEnd],
  );

  const channelsOrdered = dataset.channels;

  return (
    <div className="min-h-screen flex flex-col">
      <Header dataset={dataset} worstSeverity={worstSeverity} />

      <MetricStrip
        channels={channelsOrdered}
        rows={dataset.rows}
        rangeStart={rangeStart}
        rangeEnd={rangeEnd}
        onPick={(k) => setPickedChannel(pickedChannel === k ? null : k)}
        picked={pickedChannel}
      />

      <div className="flex-1 grid grid-cols-[1fr_420px] min-h-0">
        {/* Left: chart stack + brush */}
        <div className="flex flex-col border-r border-line min-w-0">
          <div className="flex-1 overflow-auto">
            {channelsOrdered.map((ch) => (
              <ChannelChart
                key={ch.key}
                meta={ch}
                rows={dataset.rows}
                rangeStart={rangeStart}
                rangeEnd={rangeEnd}
                anomalies={anomalies}
                selectedAnomalyId={selectedId}
                onSelectAnomaly={onSelectAnomaly}
                highlight={pickedChannel === ch.key}
                isFocus={pickedChannel === null || pickedChannel === ch.key}
              />
            ))}
          </div>
          <Brush
            rows={dataset.rows}
            anomalies={anomalies}
            rangeStart={rangeStart}
            rangeEnd={rangeEnd}
            onChange={(s, e) => { setRangeStart(s); setRangeEnd(e); }}
          />
          <div className="flex items-center justify-between px-4 py-2 border-t border-line bg-bg/60">
            <div className="font-mono text-[10.5px] text-text-mute tnum">
              window: idx {rangeStart}–{rangeEnd} · {rangeEnd - rangeStart + 1} samples
            </div>
            <button
              onClick={() => { setRangeStart(0); setRangeEnd(N - 1); setSelectedId(null); }}
              className="font-mono text-[10.5px] tracking-[0.1em] uppercase text-text-dim hover:text-text"
            >
              reset window
            </button>
          </div>
        </div>

        {/* Right: anomaly registry + AI analysis */}
        <div className="grid grid-rows-[minmax(0,1fr)_minmax(0,1fr)] min-h-0">
          <div className="border-b border-line min-h-0">
            <AnomalyList
              anomalies={anomalies}
              rows={dataset.rows}
              channels={channelsOrdered}
              selectedId={selectedId}
              onSelect={onSelectAnomaly}
              severityFilter={severityFilter}
              setSeverityFilter={setSeverityFilter}
            />
          </div>
          <div className="min-h-0">
            <AnalysisPanel
              dataset={dataset}
              rows={dataset.rows}
              rangeStart={rangeStart}
              rangeEnd={rangeEnd}
              visibleAnomalies={inWindow}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
