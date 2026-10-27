# UK Online Retailer: Sales and Customer Analysis

Where does revenue come from, how seasonal is it, and which customers keep coming back?

**Data:** [Online Retail](https://archive.ics.uci.edu/dataset/352/online+retail) (UCI Machine Learning Repository; Chen, Sain & Guo, 2012). All 541,909 invoice lines from a UK-based online gift retailer, 1 Dec 2010 to 9 Dec 2011.
**Tools:** Python (pandas, matplotlib), SQL (SQLite)
**Files:** [`analysis.ipynb`](analysis.ipynb) · [`queries.sql`](queries.sql) · [`results/summary.json`](results/summary.json)

![Monthly revenue](images/monthly_revenue.png)

## What I did

- Profiled the raw data and logged each cleaning step with row counts (duplicates, cancellations, postage and fee lines, zero or negative prices): 541,909 → 522,537 lines.
- Loaded the cleaned data into SQLite and answered core questions in SQL: monthly revenue, export markets, repeat-customer rate, order value by customer type.
- Analysed seasonality, trading hours, export markets and product concentration.
- Segmented 4,293 customers with RFM scoring.
- Built monthly cohort retention tables.

## Key findings (Dec 2010 to Nov 2011)

- **£9.63m revenue** from 18,957 orders; 84.6% from the UK.
- **Strongly seasonal:** September to November brought in 37.2% of the year's revenue.
- **Weekday trade only:** no Saturday revenue at all; the busiest hours are 10:00 to 16:00, Tuesday to Thursday.
- **Champions** (14.1% of customers) generate **45.3%** of revenue.
- **602 at-risk customers** worth £625k last year have not ordered for about 140 days: a clear win-back target.
- **833 of 3,904 products** (21.3%) make 80% of revenue.
- Only **19.7%** of a new cohort orders again the next month on average.

![RFM segments](images/rfm_segments.png)
![Cohort retention](images/cohort_retention.png)

## Run it

```bash
pip install -r ../requirements.txt
jupyter notebook analysis.ipynb   # downloads the data on first run
```

## Limitations

One year from one retailer; revenue is order value, not profit (no cost data); the December 2010 cohort includes customers who were buying before the data starts.
