# E-commerce Marketplace: What Late Deliveries Cost in Customer Reviews

How often do marketplace orders arrive after the promised date, how much does that hurt review scores, and where and when does it happen?

**Data:** Olist public dataset: ~99,000 orders from Brazil's largest department-store marketplace, Sep 2016 to Oct 2018. Tables: orders, reviews, customers. Licence CC BY-NC-SA 4.0.
**Tools:** SQL (SQLite: joins, window functions, CTEs), Python (pandas, matplotlib)
**Files:** [`analysis.ipynb`](analysis.ipynb) · [`queries.sql`](queries.sql) · [`results/summary.json`](results/summary.json)

![Review by lateness](images/review_by_lateness.png)

## What I did

- Joined three tables in SQL, keeping each order's latest review with `ROW_NUMBER()`.
- Measured how late each order was against its promised date.
- Compared review scores by lateness band, month and customer state.

## Key findings

- **6.8%** of delivered orders arrived late, even though the median order arrived **12 days early**.
- Average review: **4.29** on time vs **2.27** late; 8+ days late averages **1.70**.
- Late orders are 6.8% of deliveries but **36.7%** of one-star reviews.
- Late rate hit **12.4%** in Black Friday month (Nov 2017) and **19.0%** in March 2018.
- Worst states: Maranhão **17.4%**, Ceará **13.8%**; Rio de Janeiro **12.1%** on 12,350 orders.

![Late by month](images/late_by_month.png)
![Late by state](images/late_by_state.png)
