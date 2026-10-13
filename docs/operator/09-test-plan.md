# Manual regression test plan

Run these checks after changing the dashboard, anomaly logic, or analysis endpoint.

| Test | Procedure | Expected behavior |
|---|---|---|
| Initial load | Open homepage | All four channel views render |
| Brush | Drag each handle | Selected time range changes predictably |
| Brush body | Drag selection | Window moves without unintentionally resizing |
| Registry filter | Toggle severity chips | Relevant anomalies appear or disappear |
| Chart hover | Hover over samples | Time and channel-specific values are displayed |
| Analysis fallback | Remove server API key and analyze | A structured brief renders without crashing |
| Data regeneration | Run `npm run data` | Generator completes; inspect resulting diff |

These are manual acceptance checks, not automated test results. Mark each run with date, commit, environment, and pass/fail evidence.
