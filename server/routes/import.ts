import { Hono } from 'hono';
import { createHash } from 'crypto';
import { db, schema } from '../db/index.js';
import { eq, and } from 'drizzle-orm';
import { v4 as uuid } from 'uuid';
import { parseCsv, type ParsedTransaction } from '../lib/parsers/csv.js';
import { parseOfx } from '../lib/parsers/ofx.js';

const importRoutes = new Hono();

function generateImportHash(date: string, amount: number, name: string): string {
  return createHash('sha256').update(`${date}|${amount}|${name}`).digest('hex');
}

// Parse uploaded file and return preview
importRoutes.post('/upload', async (c) => {
  try {
    const body = await c.req.parseBody();
    const file = body['file'];

    if (!file || typeof file === 'string') {
      return c.json({ error: 'No file uploaded. Send a file with field name "file".' }, 400);
    }

    const content = await file.text();
    const filename = (file.name || 'upload.csv').toLowerCase();

  let result: { transactions: ParsedTransaction[]; detectedFormat: string };

  if (filename.endsWith('.ofx') || filename.endsWith('.qfx')) {
    result = parseOfx(content);
  } else if (filename.endsWith('.csv')) {
    result = parseCsv(content);
  } else {
    // Try to detect format from content
    if (content.includes('<OFX>') || content.includes('<ofx>') || content.includes('OFXHEADER')) {
      result = parseOfx(content);
    } else {
      result = parseCsv(content);
    }
  }

  if (result.transactions.length === 0) {
    return c.json({ error: 'No transactions found in file' }, 400);
  }

  return c.json({
    format: result.detectedFormat,
    count: result.transactions.length,
    transactions: result.transactions,
    dateRange: {
      from: result.transactions.reduce((min, t) => t.date < min ? t.date : min, result.transactions[0].date),
      to: result.transactions.reduce((max, t) => t.date > max ? t.date : max, result.transactions[0].date),
    },
  });
  } catch (err) {
    console.error('Import upload error:', err);
    return c.json({ error: String(err) }, 500);
  }
});

// Confirm import: save parsed transactions to database
importRoutes.post('/confirm', async (c) => {
  const { accountId, transactions } = await c.req.json() as {
    accountId: string;
    transactions: ParsedTransaction[];
  };

  // Verify account exists
  const [account] = await db.select({ id: schema.accounts.id })
    .from(schema.accounts)
    .where(eq(schema.accounts.id, accountId));

  if (!account) {
    return c.json({ error: 'Account not found' }, 404);
  }

  let added = 0;
  let skipped = 0;

  for (const txn of transactions) {
    const hash = generateImportHash(txn.date, txn.amount, txn.name);

    // Check for duplicate
    const [existing] = await db.select({ id: schema.transactions.id })
      .from(schema.transactions)
      .where(and(
        eq(schema.transactions.importHash, hash),
        eq(schema.transactions.accountId, accountId),
      ));

    if (existing) {
      skipped++;
      continue;
    }

    await db.insert(schema.transactions).values({
      id: uuid(),
      accountId,
      source: 'import',
      importHash: hash,
      amount: txn.amount,
      date: txn.date,
      name: txn.name,
      merchantName: txn.merchantName,
      categoryPrimary: txn.categoryPrimary,
      pending: false,
    });

    added++;
  }

  return c.json({ added, skipped, total: transactions.length });
});

// Create a manual account (not tied to Plaid)
importRoutes.post('/accounts', async (c) => {
  const { name, type, subtype } = await c.req.json() as {
    name: string;
    type: 'depository' | 'credit' | 'investment' | 'loan' | 'other';
    subtype?: string;
  };

  if (!name || !type) {
    return c.json({ error: 'name and type are required' }, 400);
  }

  const id = uuid();
  await db.insert(schema.accounts).values({
    id,
    source: 'manual',
    name,
    type,
    subtype: subtype || null,
  });

  return c.json({ id, name, type, subtype });
});

// List manual accounts
importRoutes.get('/accounts', async (c) => {
  const rows = await db.select({
    id: schema.accounts.id,
    name: schema.accounts.name,
    type: schema.accounts.type,
    subtype: schema.accounts.subtype,
    source: schema.accounts.source,
  })
    .from(schema.accounts)
    .where(eq(schema.accounts.source, 'manual'));

  return c.json(rows);
});

export default importRoutes;
