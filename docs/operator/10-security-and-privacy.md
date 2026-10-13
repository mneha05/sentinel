# Security and privacy considerations

Sentinel ships with synthetic telemetry, but integrations with real customer or equipment data would change its security obligations.

## Configuration
- Store provider API keys as server-side environment variables, not in tracked files.
- Never put secrets into client-exposed `NEXT_PUBLIC_` variables.
- Rotate exposed credentials and remove them from repository history if accidentally committed.

## Data handling
- Avoid sending confidential operational readings to third-party models without authorization.
- Document retention and access controls before accepting uploaded telemetry.
- Sanitize any untrusted strings before rendering or logging them.
- Avoid putting sensitive payloads, tokens, or full prompts into error messages.

## Reliability
Model output is decision support. Require human review before any physical-world action. Add rate limiting, request-size limits, authentication, and audit controls before exposing a production analysis API.
