-- SQL used in analysis.ipynb (SQLite).
-- Table `sales` holds cleaned product sales lines:
--   invoice_no, stock_code, description, quantity, invoice_date, unit_price,
--   customer_id (NULL for guest orders), country, revenue, month
-- Each query starts with a "-- name:" line so the notebook can run it by name.

-- name: monthly_revenue
-- Revenue, orders and active customers per calendar month.
SELECT month,
       ROUND(SUM(revenue), 2)          AS revenue,
       COUNT(DISTINCT invoice_no)      AS orders,
       COUNT(DISTINCT customer_id)     AS customers
FROM sales
GROUP BY month
ORDER BY month;

-- name: top_countries_outside_uk
-- Largest export markets by revenue.
SELECT country,
       ROUND(SUM(revenue), 2)          AS revenue,
       COUNT(DISTINCT customer_id)     AS customers,
       COUNT(DISTINCT invoice_no)      AS orders
FROM sales
WHERE country <> 'United Kingdom'
GROUP BY country
ORDER BY revenue DESC
LIMIT 10;

-- name: repeat_customer_rate
-- Share of identified customers who placed more than one order.
WITH orders_per_customer AS (
    SELECT customer_id, COUNT(DISTINCT invoice_no) AS n_orders
    FROM sales
    WHERE customer_id IS NOT NULL
    GROUP BY customer_id
)
SELECT COUNT(*)                                            AS customers,
       SUM(CASE WHEN n_orders > 1 THEN 1 ELSE 0 END)       AS repeat_customers,
       ROUND(100.0 * SUM(CASE WHEN n_orders > 1 THEN 1 ELSE 0 END) / COUNT(*), 1) AS repeat_rate_pct
FROM orders_per_customer;

-- name: average_order_value_by_customer_type
-- Average order value for identified customers versus guest checkouts.
WITH orders AS (
    SELECT invoice_no,
           CASE WHEN customer_id IS NULL THEN 'Guest' ELSE 'Identified' END AS customer_type,
           SUM(revenue) AS order_value
    FROM sales
    GROUP BY invoice_no, customer_type
)
SELECT customer_type,
       COUNT(*)                    AS orders,
       ROUND(AVG(order_value), 2)  AS avg_order_value
FROM orders
GROUP BY customer_type;
