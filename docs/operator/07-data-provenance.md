# Synthetic dataset provenance

The bundled example is located at `public/data/turbine-24h.json`. It represents a 24-hour, one-minute-resolution scenario with four channels and intentionally injected anomalies. The dataset is generated locally by `scripts/generate-data.mjs`.

## Reproduction
1. Preserve a copy or checksum of the current JSON if comparing results.
2. Run `npm run data` to regenerate from the generator.
3. Compare the generated data with the preserved baseline before claiming reproducibility.
4. Record any changed generator parameters in the experiment notes.

## Limitations
Injected faults make demonstrations interpretable but do not establish field accuracy, false-positive rates, or generalization to industrial sensors. Results on this dataset should be labeled synthetic.
