import { Hono } from 'hono';
import { plaidClient } from '../lib/plaid.js';
import { encrypt } from '../lib/crypto.js';
import { syncTransactions } from '../lib/sync.js';
import { db, schema } from '../db/index.js';
import { eq } from 'drizzle-orm';
import { v4 as uuid } from 'uuid';
import { CountryCode, Products } from 'plaid';

const plaid = new Hono();

plaid.post('/create-link-token', async (c) => {
  const response = await plaidClient.linkTokenCreate({
    user: {
      client_user_id: uuid(),
      ...(process.env.PLAID_ENV !== 'sandbox' ? {} : { phone_number: '+14155550010' }),
    },
    client_name: 'Fino',
    products: [Products.Transactions],
    country_codes: [CountryCode.Us],
    language: 'en',
    transactions: { days_requested: 730 },
  });

  return c.json({ link_token: response.data.link_token });
});

plaid.post('/exchange-token', async (c) => {
  const { public_token, metadata } = await c.req.json();

  // Exchange public token for access token
  const exchangeResponse = await plaidClient.itemPublicTokenExchange({
    public_token,
  });

  const accessToken = exchangeResponse.data.access_token;
  const plaidItemId = exchangeResponse.data.item_id;

  // Encrypt access token
  const { encrypted, iv } = encrypt(accessToken);

  // Store institution
  const institution = metadata?.institution;
  let institutionId: string | null = null;
  if (institution) {
    institutionId = uuid();
    await db.insert(schema.institutions).values({
      id: institutionId,
      plaidInstitutionId: institution.institution_id,
      name: institution.name,
    }).onConflictDoNothing();

    // If conflict, get existing id
    const [existing] = await db.select({ id: schema.institutions.id })
      .from(schema.institutions)
      .where(eq(schema.institutions.plaidInstitutionId, institution.institution_id));
    if (existing) institutionId = existing.id;
  }

  // Store item
  const itemId = uuid();
  await db.insert(schema.items).values({
    id: itemId,
    plaidItemId,
    institutionId,
    accessTokenEncrypted: encrypted,
    accessTokenIv: iv,
  });

  // Fetch and store accounts
  const accountsResponse = await plaidClient.accountsGet({ access_token: accessToken });
  const storedAccounts = [];

  for (const acct of accountsResponse.data.accounts) {
    const accountId = uuid();
    await db.insert(schema.accounts).values({
      id: accountId,
      plaidAccountId: acct.account_id,
      itemId,
      name: acct.name,
      officialName: acct.official_name || null,
      type: acct.type as 'depository' | 'credit' | 'investment' | 'loan' | 'other',
      subtype: acct.subtype || null,
      mask: acct.mask || null,
      currentBalance: acct.balances.current,
      availableBalance: acct.balances.available,
      creditLimit: acct.balances.limit,
      isoCurrencyCode: acct.balances.iso_currency_code || 'USD',
    });

    storedAccounts.push({
      id: accountId,
      name: acct.name,
      type: acct.type,
      subtype: acct.subtype,
      mask: acct.mask,
      currentBalance: acct.balances.current,
    });
  }

  // Initial transaction sync
  const syncResult = await syncTransactions(itemId);

  return c.json({
    success: true,
    itemId,
    accounts: storedAccounts,
    sync: syncResult,
  });
});

plaid.post('/sync', async (c) => {
  const { item_id } = await c.req.json().catch(() => ({}));

  if (item_id) {
    const result = await syncTransactions(item_id);
    return c.json({ results: [{ itemId: item_id, ...result }] });
  }

  // Sync all items
  const allItems = await db.select({ id: schema.items.id }).from(schema.items);
  const results = [];

  for (const item of allItems) {
    try {
      const result = await syncTransactions(item.id);
      results.push({ itemId: item.id, ...result, status: 'success' });
    } catch (error) {
      results.push({ itemId: item.id, status: 'error', error: String(error) });
    }
  }

  return c.json({ results });
});

plaid.delete('/items/:itemId', async (c) => {
  const itemId = c.req.param('itemId');

  // Delete transactions for accounts under this item
  const itemAccounts = await db.select({ id: schema.accounts.id })
    .from(schema.accounts)
    .where(eq(schema.accounts.itemId, itemId));

  for (const acct of itemAccounts) {
    await db.delete(schema.transactions)
      .where(eq(schema.transactions.accountId, acct.id));
  }

  await db.delete(schema.accounts).where(eq(schema.accounts.itemId, itemId));
  await db.delete(schema.syncLog).where(eq(schema.syncLog.itemId, itemId));
  await db.delete(schema.items).where(eq(schema.items.id, itemId));

  return c.json({ success: true });
});

export default plaid;
