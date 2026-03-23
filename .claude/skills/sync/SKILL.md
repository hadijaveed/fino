---
name: sync
description: Force sync all connected bank accounts with Plaid to get the latest transactions and balances. Use when the user says "sync", "refresh", "update my data", or "get latest transactions".
---

Force sync all connected bank accounts with Plaid.

Call the `sync_transactions` MCP tool with no arguments (syncs all items).

Report the results:
- For each institution: how many transactions were added, modified, and removed
- If any syncs failed, report the error
- If no items are connected, tell the user to connect a bank account through the web dashboard first

After syncing, briefly confirm what the current data freshness is (e.g., "All accounts synced as of just now").
