# Simulated experiment results

**SYNTHETIC ONLY. No Ravelry users or events.**

## Assumed Effect

24,000 candidates; 2,343 ineligible; 21,657 assigned and 21,657 mature. SRM p=0.8973.
Control: 1,405/10,838 (12.96%); treatment: 1,590/10,819 (14.70%).
Absolute effect: 1.73 percentage points (95% CI 0.81 to 2.65); relative lift 13.4%; p=0.0002213.
Abandonment difference: -0.31 points (95% CI -1.50 to 0.87); harm margin +1 point.
Decision: **meets illustrative criteria**. This concerns illustrative criteria, not a launch decision for Ravelry.

## Null

24,000 candidates; 2,343 ineligible; 21,657 assigned and 21,657 mature. SRM p=0.8973.
Control: 1,405/10,838 (12.96%); treatment: 1,423/10,819 (13.15%).
Absolute effect: 0.19 percentage points (95% CI -0.71 to 1.09); relative lift 1.5%; p=0.6796.
Abandonment difference: 0.01 points (95% CI -1.18 to 1.20); harm margin +1 point.
Decision: **does not meet illustrative criteria**. This concerns illustrative criteria, not a launch decision for Ravelry.

Planning: assumed 12% baseline, +1.5-point effect, 80% power and two-sided 5% alpha require 15,512 total accounts. Approximate MDE at 10,800 per arm: 1.27 points.

Null calibration: 500 fixed-seed independent A/A repetitions; rejection fraction 4.4%, CI coverage 95.6%, Monte Carlo SE at nominal 5% = 0.010. A single null run may be significant by chance.

All values derive from results.json. Binary outcomes are cross-checked against events; absence of missing telemetry is an assumption of the generator, not evidence about real instrumentation.
