# A/B Test: Should a Mobile Game Move Its First Paywall Gate?

The puzzle game *Cookie Cats* tested moving its first gate (wait or pay to continue) from level 30 to level 40. Did it change how many players came back?

**Data:** 90,189 players randomly assigned to `gate_30` or `gate_40`, with rounds played and 1-day / 7-day retention. Cookie Cats test data (Tactile Entertainment, published by DataCamp).
**Tools:** Python (pandas, NumPy, SciPy, matplotlib)
**Files:** [`analysis.ipynb`](analysis.ipynb) · [`results/summary.json`](results/summary.json)

![Retention by group](images/retention_by_group.png)

## What I did

- Checked data quality and found a 49,854-round outlier and 3,994 players who never played.
- Ran a **sample ratio check** (chi-square) on group sizes.
- Compared retention with 95% confidence intervals and a two-proportion z-test.
- Simulated the experiment 5,000 times (parametric bootstrap) to estimate the probability each version is better.

## Key findings

- 7-day retention fell from **19.02% to 18.20%** with the gate at level 40 (−0.82 pp, p = 0.002; 99.9% probability level 30 is better).
- 1-day retention fell 0.59 pp, but not conclusively (p = 0.074).
- The groups were split 49.56 / 50.44 (chi-square p = 0.009): a **sample ratio mismatch** to investigate before acting.
- **Recommendation:** keep the gate at level 30.

![Bootstrap](images/bootstrap_difference.png)
