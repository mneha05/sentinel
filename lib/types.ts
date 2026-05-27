export type ChannelKey = "vib_x" | "vib_y" | "temp" | "rpm";

export interface ChannelMeta {
  key: ChannelKey;
  label: string;
  unit: string;
  nominal: { low: number; high: number };
}

export interface SampleRow {
  ts: number;
  vib_x: number;
  vib_y: number;
  temp: number;
  rpm: number;
}

export interface Dataset {
  asset: {
    id: string;
    name: string;
    site: string;
    commissioned: string;
  };
  window: {
    start: number;
    end: number;
    samples: number;
    resolution_ms: number;
  };
  channels: ChannelMeta[];
  rows: SampleRow[];
}

export type Severity = "info" | "warn" | "hot";

export interface Anomaly {
  id: string;
  channel: ChannelKey;
  startIdx: number;
  endIdx: number;
  peakIdx: number;
  peakValue: number;
  peakZ: number;
  durationMin: number;
  severity: Severity;
  // Optional cross-channel co-occurrence flag
  composite?: boolean;
}

export interface AnalysisRequest {
  asset: Dataset["asset"];
  channels: ChannelMeta[];
  windowStart: number;
  windowEnd: number;
  // Compact summary of the window the user is inspecting
  stats: Array<{
    channel: ChannelKey;
    mean: number;
    std: number;
    min: number;
    max: number;
    nominal: { low: number; high: number };
  }>;
  anomalies: Array<{
    channel: ChannelKey;
    startTs: number;
    endTs: number;
    peakTs: number;
    peakValue: number;
    peakZ: number;
    durationMin: number;
    severity: Severity;
    composite?: boolean;
  }>;
}

export interface AnalysisResponse {
  headline: string;
  severity: Severity;
  confidence: number; // 0–1
  hypotheses: Array<{
    label: string;
    likelihood: "low" | "medium" | "high";
    rationale: string;
  }>;
  actions: string[];
  source: "model" | "mock";
}
