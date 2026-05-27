// scripts/generate-data.mjs
// Synthesizes 24 hours of 4-channel turbine telemetry at 1-minute resolution.
// Injects four realistic fault scenarios for the anomaly engine to find.
//
// Run: node scripts/generate-data.mjs
// Outputs: public/data/turbine-24h.json

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, "../public/data/turbine-24h.json");

// Deterministic pseudo-RNG so the demo data is stable across runs.
function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20260524);
const noise = (sd) => (rand() * 2 - 1) * sd;

const MINUTES = 24 * 60;
const t0 = new Date("2026-05-25T00:00:00Z").getTime();

const series = {
  vib_x: { unit: "mm/s", base: 2.4, drift: 0.05, sd: 0.18, label: "Vibration X" },
  vib_y: { unit: "mm/s", base: 2.1, drift: 0.04, sd: 0.16, label: "Vibration Y" },
  temp:  { unit: "°C",   base: 68.0, drift: 0.20, sd: 0.45, label: "Bearing Temp" },
  rpm:   { unit: "rpm",  base: 3585, drift: 0,    sd: 6.0,  label: "Shaft RPM" },
};

const rows = [];
for (let i = 0; i < MINUTES; i++) {
  const ts = t0 + i * 60_000;
  // Slow diurnal drift on temperature; mild correlated noise on vibration.
  const tDiurnal = Math.sin((i / MINUTES) * Math.PI * 2) * 1.6;
  const vibShared = noise(0.05);
  rows.push({
    ts,
    vib_x: +(series.vib_x.base + vibShared + noise(series.vib_x.sd)).toFixed(3),
    vib_y: +(series.vib_y.base + vibShared * 0.8 + noise(series.vib_y.sd)).toFixed(3),
    temp:  +(series.temp.base + tDiurnal + noise(series.temp.sd)).toFixed(2),
    rpm:   Math.round(series.rpm.base + noise(series.rpm.sd)),
  });
}

// ---- Inject faults ----------------------------------------------------------

// 1) Hour 4 — bearing wear: gradual vibration ramp peaking ~hr 4:25
const f1Start = 4 * 60, f1Peak = 4 * 60 + 25, f1End = 5 * 60;
for (let i = f1Start; i < f1End; i++) {
  const phase = i < f1Peak
    ? (i - f1Start) / (f1Peak - f1Start)
    : 1 - (i - f1Peak) / (f1End - f1Peak);
  const bump = 1.4 * Math.max(0, phase);
  rows[i].vib_x = +(rows[i].vib_x + bump).toFixed(3);
  rows[i].vib_y = +(rows[i].vib_y + bump * 0.9).toFixed(3);
}

// 2) Hour 11 — cooling degradation: slow temperature creep, no recovery
const f2Start = 11 * 60;
for (let i = f2Start; i < MINUTES; i++) {
  const elapsed = (i - f2Start) / 60; // hours since onset
  // Logistic creep: +6°C asymptote over ~6 hours
  const creep = 6.0 / (1 + Math.exp(-(elapsed - 2.5)));
  rows[i].temp = +(rows[i].temp + creep).toFixed(2);
}

// 3) Hour 17 — control-loop oscillation: RPM hunts ±35 around setpoint for ~25 min
const f3Start = 17 * 60, f3End = 17 * 60 + 25;
for (let i = f3Start; i < f3End; i++) {
  const t = (i - f3Start);
  rows[i].rpm = Math.round(rows[i].rpm + 35 * Math.sin(t * 0.9));
}

// 4) Hour 22 — composite event: vibration step + temp spike (severe)
const f4Start = 22 * 60, f4End = 22 * 60 + 18;
for (let i = f4Start; i < f4End; i++) {
  rows[i].vib_x = +(rows[i].vib_x + 2.6).toFixed(3);
  rows[i].vib_y = +(rows[i].vib_y + 2.3).toFixed(3);
  rows[i].temp  = +(rows[i].temp + 3.4).toFixed(2);
}

const out = {
  asset: {
    id: "TBN-04",
    name: "Turbine 04 — North Array",
    site: "Livermore Test Stand",
    commissioned: "2023-09-14",
  },
  window: {
    start: rows[0].ts,
    end:   rows[rows.length - 1].ts,
    samples: rows.length,
    resolution_ms: 60_000,
  },
  channels: [
    { key: "vib_x", label: series.vib_x.label, unit: series.vib_x.unit, nominal: { low: 1.5, high: 3.5 } },
    { key: "vib_y", label: series.vib_y.label, unit: series.vib_y.unit, nominal: { low: 1.5, high: 3.5 } },
    { key: "temp",  label: series.temp.label,  unit: series.temp.unit,  nominal: { low: 60,  high: 78  } },
    { key: "rpm",   label: series.rpm.label,   unit: series.rpm.unit,   nominal: { low: 3550, high: 3620 } },
  ],
  rows,
};

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(out));
console.log(`Wrote ${rows.length} rows -> ${OUT}`);
