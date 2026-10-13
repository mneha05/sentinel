# MAD edge cases

Regression-review checklist for Sentinel's synthetic sensor telemetry demonstration.

Check constant signals, very small MAD, missing timestamps, and single-sample spikes. Verify thresholds don't divide by zero and don't produce non-finite z-scores. Inspect behavior when noise dominates the moving window.

## Capture evidence
- Commit SHA, browser, and viewport
- Reproduction steps and sample range
- Expected behavior versus observed result
- Screenshots or test logs and remediation owner
