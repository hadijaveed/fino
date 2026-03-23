---
name: cash-flow
description: Analyze income vs expenses over 6 months, calculate savings rate, identify negative months, and project future balances. Use when the user asks about cash flow, savings rate, burn rate, or "am I saving money?"
---

Analyze cash flow trends over the last 6 months and project forward.

Call these MCP tools:

1. `get_monthly_comparison` with `months` set to 6 (transfers are excluded by default)
2. `get_balances` for current account balances

## Transfer and Loan Payment Handling

Always call `get_accounts` first to know what accounts are connected.

**LOAN_PAYMENTS (always count as spending):**
The `get_monthly_comparison` tool excludes TRANSFER_IN/TRANSFER_OUT but keeps LOAN_PAYMENTS. Loan payments (mortgage, credit card, auto, student, BNPL) are real expenses and should always be counted in spending. If the spending numbers look off, call `get_transactions` for that month and verify LOAN_PAYMENTS are included. Credit card payments show on both sides; only count the outflow (positive amount) as spending.

**TRANSFER_IN / TRANSFER_OUT (conditional):**
The MCP tool excludes all transfers by default, but some may be real spending (money leaving to non-connected accounts). If income or spending numbers look suspiciously low:
- Call `get_transactions` for that month and check excluded transfers
- For each transfer, check if the counterparty matches a connected institution
- Transfers to/from non-connected accounts should be added back as real spending or income
- If you spot adjustments needed, note them and show corrected numbers

From the results, calculate and present:

**Monthly Trend**
Table with columns: Month, Income, Spending, Net, Savings Rate (%). Show all 6 months. Highlight any months where net is negative (spent more than earned).

**Averages**
- Average monthly income
- Average monthly spending
- Average monthly net savings
- Overall savings rate (total net / total income as percentage)

**Cash Position**
- Current total cash (from balances)
- Current total credit used
- Net liquid position (cash minus credit)

**Projection**
At the current average monthly net rate:
- Projected cash balance in 3 months
- Projected cash balance in 6 months
- If net is negative: how many months until cash runs out at this rate

**Observations**
Note any trends: is income growing or shrinking? Is spending accelerating? Are there seasonal patterns? Which direction is the savings rate moving?

Format as clean markdown with tables. Use currency formatting. Keep observations concise and actionable.
