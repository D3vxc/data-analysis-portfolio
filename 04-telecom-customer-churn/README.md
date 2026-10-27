# Telecom Customer Churn: Who Is Leaving, and Who to Call First

Subscription businesses lose customers every month. Which customers are likely to leave, why, how much revenue is at stake, and who should a retention team call first?

**Data:** IBM Telco Customer Churn sample: 7,043 customers of a fictional US telecom provider, 21 columns (services, contract, billing, churn). Charges in US dollars.
**Tools:** Python (pandas, scikit-learn, matplotlib)
**Files:** [`analysis.ipynb`](analysis.ipynb) · [`results/summary.json`](results/summary.json)

![Churn by contract and tenure](images/churn_by_contract_tenure.png)

## What I did

- Checked data quality: 11 blank `TotalCharges` were all first-month customers not yet billed, so set to 0.
- Measured churn and the monthly revenue it takes with it.
- Broke churn down by contract, tenure, internet service, payment method and support.
- Found the highest-risk customer profile.
- Built an interpretable logistic regression to rank customers by risk, and tested how well the ranking would focus a retention campaign.

## Key findings

- **26.5%** of customers left, taking **30.5%** of monthly revenue ($139k a month, $1.67m a year).
- Month-to-month churn **42.7%** vs two-year **2.8%**; month-to-month customers are 86.9% of revenue lost.
- **52.9%** churn in the first six months vs **9.5%** after four years.
- Month-to-month fibre customers in their first year: **13%** of customers, **34%** of churners.
- The riskiest 20% by model score contains **49.9%** of actual churners (ROC AUC 0.844).

![Risk deciles](images/risk_deciles.png)

## Limitations

Fictional sample, one snapshot: associations, not causes. Coefficients are affected by overlapping service columns, so the breakdowns are the better guide to why customers leave.
