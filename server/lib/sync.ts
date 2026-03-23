import { plaidClient } from './plaid.js';
import { decrypt } from './crypto.js';
import { db, schema } from '../db/index.js';
import { eq } from 'drizzle-orm';
import { v4 as uuid } from 'uuid';
import type { RemovedTransaction, Transaction } from 'plaid';

export async function syncTransactions(itemId: string) {
  const [item] = await db.select().from(schema.items).where(eq(schema.items.id, itemId));
  if (!item) throw new Error(`Item ${itemId} not found`);

  const accessToken = decrypt(item.accessTokenEncrypted, item.accessTokenIv);
  let cursor = item.transactionCursor || undefined;
  let added: Transaction[] = [];
  let modified: Transaction[] = [];
  let removed: RemovedTransaction[] = [];
  let hasMore = true;

  while (hasMore) {
    const response = await plaidClient.transactionsSync({
      access_token: accessToken,
      cursor,
      count: 500,
    });

    added = added.concat(response.data.added);
    modified = modified.concat(response.data.modified);
    removed = removed.concat(response.data.removed);
    hasMore = response.data.has_more;
    cursor = response.data.next_cursor;
  }

  // Process added transactions
  for (const txn of added) {
    const accountId = await getAccountId(txn.account_id);
    await db.insert(schema.transactions).values({
      id: uuid(),
      plaidTransactionId: txn.transaction_id,
      accountId,
      amount: txn.amount,
      date: txn.date,
      authorizedDate: txn.authorized_date || null,
      name: txn.name,
      merchantName: txn.merchant_name || null,
      merchantLogoUrl: txn.logo_url || null,
      pending: txn.pending,
      paymentChannel: txn.payment_channel as 'online' | 'in store' | 'other',
      categoryPrimary: txn.personal_finance_category?.primary || null,
      categoryDetailed: txn.personal_finance_category?.detailed || null,
      categoryIcon: txn.personal_finance_category_icon_url || null,
    }).onConflictDoNothing();
  }

  // Process modified transactions
  for (const txn of modified) {
    await db.update(schema.transactions)
      .set({
        amount: txn.amount,
        date: txn.date,
        name: txn.name,
        merchantName: txn.merchant_name || null,
        pending: txn.pending,
        categoryPrimary: txn.personal_finance_category?.primary || null,
        categoryDetailed: txn.personal_finance_category?.detailed || null,
        updatedAt: new Date(),
      })
      .where(eq(schema.transactions.plaidTransactionId, txn.transaction_id));
  }

  // Process removed transactions
  for (const txn of removed) {
    if (txn.transaction_id) {
      await db.delete(schema.transactions)
        .where(eq(schema.transactions.plaidTransactionId, txn.transaction_id));
    }
  }

  // Update cursor and last synced time
  await db.update(schema.items)
    .set({
      transactionCursor: cursor,
      lastSyncedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(schema.items.id, itemId));

  // Update account balances
  const accountsResponse = await plaidClient.accountsGet({ access_token: accessToken });
  for (const acct of accountsResponse.data.accounts) {
    await db.update(schema.accounts)
      .set({
        currentBalance: acct.balances.current,
        availableBalance: acct.balances.available,
        creditLimit: acct.balances.limit,
        updatedAt: new Date(),
      })
      .where(eq(schema.accounts.plaidAccountId, acct.account_id));
  }

  // Log sync
  await db.insert(schema.syncLog).values({
    id: uuid(),
    itemId,
    addedCount: added.length,
    modifiedCount: modified.length,
    removedCount: removed.length,
    status: 'success',
  });

  return { added: added.length, modified: modified.length, removed: removed.length };
}

async function getAccountId(plaidAccountId: string): Promise<string> {
  const [account] = await db.select({ id: schema.accounts.id })
    .from(schema.accounts)
    .where(eq(schema.accounts.plaidAccountId, plaidAccountId));
  if (!account) throw new Error(`Account ${plaidAccountId} not found`);
  return account.id;
}
