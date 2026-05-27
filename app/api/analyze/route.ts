import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import type { AnalysisRequest, AnalysisResponse, Severity } from "@/lib/types";

export const runtime = "nodejs";

const SYSTEM_PROMPT = `You are a rotating-equipment reliability analyst embedded in a sensor monitoring workbench. The user is inspecting a window of multi-channel telemetry from a single asset. You receive (1) asset metadata, (2) per-channel statistics for the window, (3) a list of statistically detected anomalies with timestamps, peak values, robust z-scores, durations, and a composite flag indicating cross-channel co-occurrence.

Your job is to produce a concise decision-support analysis for an on-call engineer.

Respond with STRICT JSON ONLY matching this schema:
{
  "headline": string,                 // <= 90 chars, no period at end
  "severity": "info" | "warn" | "hot",
  "confidence": number,                // 0.0 - 1.0
  "hypotheses": [                      // exactly 3, ordered by likelihood desc
    { "label": string, "likelihood": "low"|"medium"|"high", "rationale": string }
  ],
  "actions": string[]                  // 3-5 short imperative steps
}

Guidance:
- If composite anomalies span vibration AND temperature, prioritize bearing/lubrication hypotheses.
- If RPM shows oscillation without other channel involvement, prioritize control-loop / governor hypotheses.
- If temperature creeps monotonically without vibration, prioritize cooling-system or sensor-drift hypotheses.
- Rationales must reference specific numbers from the input (peak value, z-score, duration).
- Actions should be concrete and ordered by what an engineer should do FIRST.
- Never use markdown. Never wrap the JSON in code fences. Output a single JSON object.`;

function buildUserMessage(req: AnalysisRequest): string {
  const fmt = (ts: number) => new Date(ts).toISOString().slice(11, 16) + "Z";
  const lines: string[] = [];
  lines.push(`ASSET: ${req.asset.id} — ${req.asset.name} (site: ${req.asset.site})`);
  lines.push(`WINDOW: ${fmt(req.windowStart)} → ${fmt(req.windowEnd)}`);
  lines.push("");
  lines.push("CHANNEL STATISTICS (window):");
  for (const s of req.stats) {
    const ch = req.channels.find((c) => c.key === s.channel)!;
    lines.push(
      `  ${ch.label} [${ch.unit}]: mean=${s.mean.toFixed(2)} std=${s.std.toFixed(2)} min=${s.min.toFixed(2)} max=${s.max.toFixed(2)} (nominal ${ch.nominal.low}–${ch.nominal.high})`,
    );
  }
  lines.push("");
  if (req.anomalies.length === 0) {
    lines.push("ANOMALIES: none detected in window.");
  } else {
    lines.push(`ANOMALIES (${req.anomalies.length}):`);
    for (const a of req.anomalies) {
      const ch = req.channels.find((c) => c.key === a.channel)!;
      lines.push(
        `  - ${ch.label}: ${fmt(a.startTs)}–${fmt(a.endTs)} (${a.durationMin.toFixed(0)} min), peak=${a.peakValue.toFixed(2)} ${ch.unit} @ ${fmt(a.peakTs)}, z=${a.peakZ.toFixed(1)}, severity=${a.severity}${a.composite ? ", composite" : ""}`,
      );
    }
  }
  return lines.join("\n");
}

// ─── Mock fallback ──────────────────────────────────────────────────────────
// Deterministic so the live demo is impressive even without an API key.
function mockAnalysis(req: AnalysisRequest): AnalysisResponse {
  const hasVib = req.anomalies.some((a) => a.channel === "vib_x" || a.channel === "vib_y");
  const hasTemp = req.anomalies.some((a) => a.channel === "temp");
  const hasRpm = req.anomalies.some((a) => a.channel === "rpm");
  const composite = req.anomalies.some((a) => a.composite);
  const maxSev: Severity = req.anomalies.reduce<Severity>(
    (acc, a) => (a.severity === "hot" ? "hot" : a.severity === "warn" && acc !== "hot" ? "warn" : acc),
    "info",
  );

  if (req.anomalies.length === 0) {
    return {
      source: "mock",
      headline: "All channels nominal in selected window",
      severity: "info",
      confidence: 0.92,
      hypotheses: [
        { label: "Steady-state operation", likelihood: "high", rationale: "No channel crossed the robust z-threshold of 3.2 and all values remained within nominal envelopes." },
        { label: "Sensor calibration drift (latent)", likelihood: "low", rationale: "Cannot be ruled out from window alone; recommend cross-check at next maintenance cycle." },
        { label: "Sub-threshold incipient fault", likelihood: "low", rationale: "Vibration band is quiet; no resonance signature visible at current resolution." },
      ],
      actions: [
        "Continue baseline monitoring at 1-min cadence",
        "Re-evaluate after next scheduled load change",
      ],
    };
  }

  if (composite && hasVib && hasTemp) {
    const v = req.anomalies.find((a) => a.channel === "vib_x" || a.channel === "vib_y")!;
    const t = req.anomalies.find((a) => a.channel === "temp")!;
    return {
      source: "mock",
      headline: `Composite vibration + thermal event — possible bearing degradation`,
      severity: maxSev,
      confidence: 0.81,
      hypotheses: [
        { label: "Bearing wear / inadequate lubrication", likelihood: "high",
          rationale: `Vibration peak ${v.peakValue.toFixed(2)} (z=${v.peakZ.toFixed(1)}) co-occurs with thermal rise to ${t.peakValue.toFixed(1)}°C over ${t.durationMin.toFixed(0)} min — classic friction-heat coupling.` },
        { label: "Misalignment after thermal expansion", likelihood: "medium",
          rationale: `Cross-channel persistence suggests structural rather than transient origin.` },
        { label: "Foundation looseness or coupling fault", likelihood: "low",
          rationale: `Possible but typically presents with stronger 2× harmonics; resolution insufficient to confirm.` },
      ],
      actions: [
        "Reduce load by 20% and observe whether thermal trend reverses",
        "Schedule vibration spectrum capture with FFT analyzer at next opportunity",
        "Verify lubricant level and condition; sample for oil analysis",
        "Inspect coupling and foundation bolts during next downtime",
      ],
    };
  }

  if (hasRpm && !hasVib && !hasTemp) {
    const r = req.anomalies.find((a) => a.channel === "rpm")!;
    return {
      source: "mock",
      headline: "Shaft RPM oscillation — likely control-loop instability",
      severity: maxSev,
      confidence: 0.74,
      hypotheses: [
        { label: "Governor / control-loop hunting", likelihood: "high",
          rationale: `RPM deviation z=${r.peakZ.toFixed(1)} over ${r.durationMin.toFixed(0)} min without mechanical channel involvement points to actuator/PID tuning.` },
        { label: "Upstream load fluctuation", likelihood: "medium",
          rationale: `External demand transients can manifest as governor chasing the setpoint.` },
        { label: "Tachometer signal noise", likelihood: "low",
          rationale: `Possible if amplitude is exactly periodic; verify against backup encoder if available.` },
      ],
      actions: [
        "Capture governor command vs. measured RPM trace for the affected window",
        "Review PID gains; consider reducing proportional gain if recently tuned",
        "Confirm tachometer signal integrity and grounding",
      ],
    };
  }

  if (hasTemp && !hasVib) {
    const t = req.anomalies.find((a) => a.channel === "temp")!;
    return {
      source: "mock",
      headline: "Bearing temperature creep — cooling system underperformance suspected",
      severity: maxSev,
      confidence: 0.78,
      hypotheses: [
        { label: "Reduced cooling flow", likelihood: "high",
          rationale: `Monotonic rise to ${t.peakValue.toFixed(1)}°C over ${t.durationMin.toFixed(0)} min with no mechanical signature indicates heat-rejection limited.` },
        { label: "Ambient temperature drift", likelihood: "medium",
          rationale: `Long-window thermal creep can track environmental load.` },
        { label: "Thermocouple drift", likelihood: "low",
          rationale: `Sensor-side fault possible but cooling-side causes are more common at this magnitude.` },
      ],
      actions: [
        "Verify coolant flow rate and inlet temperature",
        "Check filter ΔP across heat exchanger",
        "Compare against redundant temperature sensor if instrumented",
        "Schedule cooler service if creep persists beyond 4 hours",
      ],
    };
  }

  // Default: lone vibration spike
  const v = req.anomalies.find((a) => a.channel === "vib_x" || a.channel === "vib_y");
  return {
    source: "mock",
    headline: "Transient vibration excursion on rotating element",
    severity: maxSev,
    confidence: 0.66,
    hypotheses: [
      { label: "Imbalance or short-lived foreign-object pass", likelihood: "high",
        rationale: v
          ? `Isolated vibration peak ${v.peakValue.toFixed(2)} mm/s (z=${v.peakZ.toFixed(1)}) without thermal coupling suggests transient mechanical event.`
          : `Isolated mechanical signature.` },
      { label: "Resonance excitation at operating speed", likelihood: "medium",
        rationale: `Possible if event recurs near same RPM; insufficient evidence in window.` },
      { label: "Sensor mounting artifact", likelihood: "low",
        rationale: `Cannot fully exclude without redundant accelerometer comparison.` },
    ],
    actions: [
      "Tag event in CMMS and continue monitoring",
      "If recurrence within 24h, schedule on-condition inspection",
      "Verify accelerometer mounting torque at next walkdown",
    ],
  };
}

// ─── Strict response validator ──────────────────────────────────────────────
function isValidResponse(x: unknown): x is AnalysisResponse {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  if (typeof o.headline !== "string") return false;
  if (!["info", "warn", "hot"].includes(o.severity as string)) return false;
  if (typeof o.confidence !== "number") return false;
  if (!Array.isArray(o.hypotheses) || o.hypotheses.length === 0) return false;
  if (!Array.isArray(o.actions) || o.actions.length === 0) return false;
  return true;
}

export async function POST(req: NextRequest) {
  let body: AnalysisRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    return NextResponse.json(mockAnalysis(body));
  }

  try {
    const client = new Anthropic({ apiKey: key });
    const userText = buildUserMessage(body);

    const msg = await client.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userText }],
    });

    const textBlock = msg.content.find((b) => b.type === "text") as
      | { type: "text"; text: string }
      | undefined;
    if (!textBlock) throw new Error("No text in model response");

    // Strip code fences defensively even though prompt forbids them
    const raw = textBlock.text.trim().replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
    const parsed = JSON.parse(raw);
    if (!isValidResponse(parsed)) throw new Error("Response failed schema validation");

    return NextResponse.json({ ...parsed, source: "model" } as AnalysisResponse);
  } catch (err) {
    // Always degrade gracefully — the workbench must keep working.
    console.error("[/api/analyze] model error, falling back to mock:", err);
    return NextResponse.json(mockAnalysis(body));
  }
}
