import type { Anomaly, ChannelKey, ChannelMeta, Dataset, SampleRow, Severity } from "./types";

const CHANNELS: ChannelKey[] = ["vib_x", "vib_y", "temp", "rpm"];

// Median + MAD (more robust than mean + std).
function medianMAD(values: number[]): { med: number; mad: number } {
  const sorted = [...values].sort((a, b) => a - b);
  const med = sorted[Math.floor(sorted.length / 2)];
  const abs = sorted.map((v) => Math.abs(v - med)).sort((a, b) => a - b);
  // 1.4826 scales MAD to be a consistent estimator of std for Gaussian data
  const mad = abs[Math.floor(abs.length / 2)] * 1.4826 || 1e-9;
  return { med, mad };
}

interface Span {
  start: number;
  end: number;
  peakIdx: number;
  peakValue: number;
  peakZ: number;
}

function classify(peakZ: number, durationMin: number, nominalBreach: boolean): Severity {
  const z = Math.abs(peakZ);
  if (z >= 6 || (nominalBreach && durationMin >= 10)) return "hot";
  if (z >= 4 || nominalBreach) return "warn";
  return "info";
}

/**
 * Detect anomalous spans on a single channel using a centred sliding window for the
 * baseline (so a sustained level-shift is detected against pre-event normal, not
 * against itself). Spans are merged when separated by < `mergeGap` samples.
 */
function detectChannel(
  rows: SampleRow[],
  channel: ChannelKey,
  meta: ChannelMeta,
  opts: { window: number; zThresh: number; minLen: number; mergeGap: number },
): Span[] {
  const n = rows.length;
  const v = rows.map((r) => r[channel] as number);
  // Pre-event baseline: rolling window LOOKBACK only (more sensitive to onset)
  const W = opts.window;
  const z = new Float64Array(n);

  for (let i = 0; i < n; i++) {
    const lo = Math.max(0, i - W);
    if (i - lo < 30) { z[i] = 0; continue; }
    const slice = v.slice(lo, i);
    const { med, mad } = medianMAD(slice);
    z[i] = (v[i] - med) / mad;
  }

  // Find contiguous spans where |z| > thresh
  const spans: Span[] = [];
  let cur: { start: number; end: number; peakIdx: number; peakZ: number; peakValue: number } | null = null;

  for (let i = 0; i < n; i++) {
    const az = Math.abs(z[i]);
    if (az > opts.zThresh) {
      if (!cur) {
        cur = { start: i, end: i, peakIdx: i, peakZ: z[i], peakValue: v[i] };
      } else {
        cur.end = i;
        if (Math.abs(z[i]) > Math.abs(cur.peakZ)) {
          cur.peakZ = z[i];
          cur.peakIdx = i;
          cur.peakValue = v[i];
        }
      }
    } else if (cur) {
      // close span
      spans.push(cur);
      cur = null;
    }
  }
  if (cur) spans.push(cur);

  // Merge spans separated by small gaps
  const merged: Span[] = [];
  for (const s of spans) {
    const last = merged[merged.length - 1];
    if (last && s.start - last.end <= opts.mergeGap) {
      last.end = s.end;
      if (Math.abs(s.peakZ) > Math.abs(last.peakZ)) {
        last.peakZ = s.peakZ;
        last.peakIdx = s.peakIdx;
        last.peakValue = s.peakValue;
      }
    } else {
      merged.push({ ...s });
    }
  }

  // Drop spans shorter than minLen
  return merged.filter((s) => s.end - s.start + 1 >= opts.minLen);
}

export function detectAnomalies(ds: Dataset): Anomaly[] {
  const out: Anomaly[] = [];
  const resMin = ds.window.resolution_ms / 60_000;
  const metaByKey = new Map(ds.channels.map((c) => [c.key, c]));

  for (const key of CHANNELS) {
    const meta = metaByKey.get(key)!;
    const spans = detectChannel(ds.rows, key, meta, {
      window: 120,    // 2-hour lookback baseline
      zThresh: 3.2,   // robust z threshold
      minLen: 5,
      mergeGap: 8,
    });

    for (const s of spans) {
      const peakValue = s.peakValue;
      const nominalBreach =
        peakValue < meta.nominal.low || peakValue > meta.nominal.high;
      const durationMin = (s.end - s.start + 1) * resMin;
      const severity = classify(s.peakZ, durationMin, nominalBreach);
      out.push({
        id: `${key}-${s.start}-${s.end}`,
        channel: key,
        startIdx: s.start,
        endIdx: s.end,
        peakIdx: s.peakIdx,
        peakValue,
        peakZ: s.peakZ,
        durationMin,
        severity,
      });
    }
  }

  // Composite linking: any two anomalies on different channels whose windows overlap
  for (let i = 0; i < out.length; i++) {
    for (let j = i + 1; j < out.length; j++) {
      if (out[i].channel === out[j].channel) continue;
      const overlap = Math.min(out[i].endIdx, out[j].endIdx) - Math.max(out[i].startIdx, out[j].startIdx);
      if (overlap >= 3) {
        out[i].composite = true;
        out[j].composite = true;
        // bump severity if composite
        if (out[i].severity === "info") out[i].severity = "warn";
        if (out[j].severity === "info") out[j].severity = "warn";
      }
    }
  }

  out.sort((a, b) => a.startIdx - b.startIdx);
  return out;
}

// Stats over an arbitrary window — used by the AI summary
export function windowStats(rows: SampleRow[], startIdx: number, endIdx: number) {
  const stat = (vals: number[]) => {
    const n = vals.length;
    const mean = vals.reduce((a, b) => a + b, 0) / n;
    const variance = vals.reduce((a, b) => a + (b - mean) ** 2, 0) / n;
    return { mean, std: Math.sqrt(variance), min: Math.min(...vals), max: Math.max(...vals) };
  };
  const slice = rows.slice(startIdx, endIdx + 1);
  return {
    vib_x: stat(slice.map((r) => r.vib_x)),
    vib_y: stat(slice.map((r) => r.vib_y)),
    temp:  stat(slice.map((r) => r.temp)),
    rpm:   stat(slice.map((r) => r.rpm)),
  };
}
