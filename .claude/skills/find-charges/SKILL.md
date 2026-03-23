---
name: find-charges
description: Search for charges from a specific merchant or keyword. Shows total spent, transaction count, and frequency. Use when the user asks "how much did I spend at X?" or "find my Amazon charges" or "search for Uber".
---

Search for charges matching the user's query.

The user will provide a merchant name or keyword as an argument (e.g., `/find-charges Amazon`). If no argument is given, ask the user what merchant or keyword to search for.

Call these MCP tools:

1. `search_transactions` with the user's query and `limit` set to 100
2. If helpful for context, also call `get_transactions` with a broader search to catch variations in merchant naming

## Transfer and Loan Payment Handling

Call `get_accounts` first to know what accounts are connected.

- **LOAN_PAYMENTS**: Always real spending. If results include loan payments (mortgage, credit card, auto, student), present them as real charges, never as transfers
- **TRANSFER_IN / TRANSFER_OUT**: Check if the search query or merchant matches a connected institution. If yes, label those as "Internal transfers." If no matching connected account, treat as real charges
- Show all transactions either way, but label them appropriately

Present the results as:

**Summary**
- Total spent at this merchant (sum of positive amounts, excluding transfers)
- Total received/refunded (sum of negative amounts, if any)
- Number of transactions
- Date range: earliest to most recent transaction
- Average transaction amount
- Most common category
- If transfers were found: note how many were inter-account transfers vs actual charges

**All Transactions**
Table with columns: Date, Amount, Description, Account, Transfer?. Sorted by date, most recent first. Mark any transaction that is a transfer between connected accounts. If there are more than 20, show the 20 most recent and note how many more exist.

**Pattern**
If the charges appear regularly, note the frequency (weekly, monthly, etc.) and the estimated annual cost. If these are transfers, describe the transfer pattern instead.

Format as clean markdown. Use currency formatting.
