# Anomaly-detection notes

The client calculates a sliding-window median and median absolute deviation (MAD). Scaling MAD by 1.4826 produces a robust estimate of standard deviation under a Gaussian baseline. A threshold of 3.2 robust standard deviations is used to flag excursions.

This approach is deliberately resistant to individual spikes, but it is not infallible:
- A nearly constant signal may have very small MAD, making tiny deviations look large.
- Persistent regime changes can eventually become part of the rolling baseline.
- Threshold crossings alone cannot identify the physical root cause.
- Composite event linking highlights overlapping channels; it does not prove they share a mechanism.

For investigations, save the window, affected channels, and raw values alongside any AI-generated explanation.
