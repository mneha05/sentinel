# Operator quickstart

Sentinel is a demonstration workbench for synthetic rotating-equipment telemetry. Its displayed signals are not live equipment readings and should not be treated as safety alarms.

## First run
1. Install Node 20, then run `npm install`.
2. Run `npm run dev` and open http://localhost:3000.
3. Inspect the four channels: vibration X, vibration Y, bearing temperature, and shaft RPM.
4. Use the bottom brush to choose a time window, and select an anomaly in the registry.
5. Run analysis to request a structured decision brief. Without an API key, the server uses a deterministic mock.

## Before sharing a finding
Record the selected time range, channels involved, displayed severity, and whether the brief came from model-backed analysis or mock fallback. Corroborate observations outside this demo before acting.
