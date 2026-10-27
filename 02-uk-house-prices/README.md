# UK House Prices since 1953: Cycles, Crashes and Recoveries

How have UK house prices moved over seven decades, how deep were the downturns, and how long did recovery take?

**Data:** Nationwide House Price Index, UK average price, quarterly, Q1 1953 to Q2 2025 (290 quarters), open data via [datasets/house-prices-uk](https://github.com/datasets/house-prices-uk) (ODC-PDDL).
**Tools:** Python (pandas, matplotlib)
**Files:** [`analysis.ipynb`](analysis.ipynb) · [`results/summary.json`](results/summary.json)

![Long-run price](images/long_run_price.png)

## What I did

- Validated the data: recalculated year-on-year change from the prices and matched the published figures to within 0.1 percentage points; found zero placeholders in the Modern/Older series and dropped them.
- Wrote a small algorithm to find every downturn of more than 5%, its trough, and the date prices regained the previous peak.
- Measured growth by decade (compound annual growth rate) and the new-build price premium over time.

## Key findings

- **£1,891 → £272,751** (1953 to 2025): 144 times, 7.1% a year, nominal.
- Prices rose year on year in **86%** of quarters; median annual change **+6.7%**.
- Three downturns: **-20.2%** (1989 to 1993, 8.5 years to recover), **-18.7%** (2007 to 2009, 6.8 years), **-5.5%** (2022 to 2023, still 0.1% below the peak in Q2 2025).
- The 2008 fall took 6 quarters; the early-1990s fall took 14.
- Growth has slowed from 17.9% a year in the 1970s to 3.0% in the 2010s.

![Annual change](images/yoy_change.png)

## Limitations and next step

All figures are nominal. Next step: deflate by ONS CPI to show real price changes. Nationwide's method changed in 1960, 1974 and 1983, and the index only covers its own mortgage lending.
