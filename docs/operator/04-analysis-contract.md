# Analysis response contract

The workbench exposes `POST /api/analyze`. Its expected structured brief contains:

```json
{
  "headline": "Summary of observed pattern",
  "severity": "warn",
  "confidence": 0.7,
  "hypotheses": [],
  "actions": []
}
```

This is an illustrative shape, **not** a guaranteed valid request body or a full schema. The implementation validates model responses server-side and falls back to deterministic behavior when output cannot be accepted.

## Client integration guidance
- Treat the response as advisory information rather than a command.
- Render unavailable or malformed fields defensively.
- Do not infer that a model-backed answer was generated merely because a response was returned.
- Avoid logging user-supplied telemetry or keys unless operationally necessary.
