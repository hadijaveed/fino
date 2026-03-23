import { Hono } from 'hono';
import { db, schema } from '../db/index.js';
import { eq, and, gte, lte, like, desc, sql } from 'drizzle-orm';

const transactions = new Hono();

transactions.get('/', async (c) => {
  const startDate = c.req.query('start_date');
  const endDate = c.req.query('end_date');
  const accountId = c.req.query('account_id');
  const category = c.req.query('category');
  const search = c.req.query('search');
  const limit = parseInt(c.req.query('limit') || '50');
  const offset = parseInt(c.req.query('offset') || '0');

  const conditions = [];
  if (startDate) conditions.push(gte(schema.transactions.date, startDate));
  if (endDate) conditions.push(lte(schema.transactions.date, endDate));
  if (accountId) conditions.push(eq(schema.transactions.accountId, accountId));
  if (category) conditions.push(eq(schema.transactions.categoryPrimary, category));
  if (search) conditions.push(like(schema.transactions.merchantName, `%${search}%`));

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const rows = await db.select({
    id: schema.transactions.id,
    amount: schema.transactions.amount,
    date: schema.transactions.date,
    name: schema.transactions.name,
    merchantName: schema.transactions.merchantName,
    merchantLogoUrl: schema.transactions.merchantLogoUrl,
    pending: schema.transactions.pending,
    categoryPrimary: schema.transactions.categoryPrimary,
    categoryDetailed: schema.transactions.categoryDetailed,
    categoryIcon: schema.transactions.categoryIcon,
    paymentChannel: schema.transactions.paymentChannel,
    accountName: schema.accounts.name,
    accountType: schema.accounts.type,
    accountMask: schema.accounts.mask,
  })
    .from(schema.transactions)
    .leftJoin(schema.accounts, eq(schema.transactions.accountId, schema.accounts.id))
    .where(where)
    .orderBy(desc(schema.transactions.date))
    .limit(limit)
    .offset(offset);

  const [total] = await db.select({ count: sql<number>`count(*)` })
    .from(schema.transactions)
    .where(where);

  return c.json({ transactions: rows, total: total?.count || 0 });
});

export default transactions;
