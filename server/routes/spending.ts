import { Hono } from 'hono';
import { db, schema } from '../db/index.js';
import { and, gte, lte, gt, sql, desc, eq } from 'drizzle-orm';

const spending = new Hono();

// Spending by category for a date range
spending.get('/by-category', async (c) => {
  const startDate = c.req.query('start_date');
  const endDate = c.req.query('end_date');

  const conditions = [gt(schema.transactions.amount, 0)]; // Only outflows
  if (startDate) conditions.push(gte(schema.transactions.date, startDate));
  if (endDate) conditions.push(lte(schema.transactions.date, endDate));

  const rows = await db.select({
    category: schema.transactions.categoryPrimary,
    total: sql<number>`sum(${schema.transactions.amount})`.as('total'),
    count: sql<number>`count(*)`.as('count'),
  })
    .from(schema.transactions)
    .where(and(...conditions))
    .groupBy(schema.transactions.categoryPrimary)
    .orderBy(desc(sql`total`));

  const grandTotal = rows.reduce((sum, r) => sum + (r.total || 0), 0);
  const withPercentage = rows.map((r) => ({
    ...r,
    category: r.category || 'Uncategorized',
    percentage: grandTotal > 0 ? Math.round(((r.total || 0) / grandTotal) * 100) : 0,
  }));

  return c.json({ categories: withPercentage, total: grandTotal });
});

// Monthly comparison (income vs spending)
spending.get('/monthly', async (c) => {
  const months = parseInt(c.req.query('months') || '6');
  const now = new Date();
  const startDate = new Date(now.getFullYear(), now.getMonth() - months + 1, 1)
    .toISOString().split('T')[0];

  const rows = await db.select({
    month: sql<string>`strftime('%Y-%m', ${schema.transactions.date})`.as('month'),
    totalSpending: sql<number>`sum(case when ${schema.transactions.amount} > 0 then ${schema.transactions.amount} else 0 end)`.as('total_spending'),
    totalIncome: sql<number>`sum(case when ${schema.transactions.amount} < 0 then abs(${schema.transactions.amount}) else 0 end)`.as('total_income'),
  })
    .from(schema.transactions)
    .where(gte(schema.transactions.date, startDate))
    .groupBy(sql`strftime('%Y-%m', ${schema.transactions.date})`)
    .orderBy(sql`month`);

  const result = rows.map((r) => ({
    month: r.month,
    spending: Math.round((r.totalSpending || 0) * 100) / 100,
    income: Math.round((r.totalIncome || 0) * 100) / 100,
    net: Math.round(((r.totalIncome || 0) - (r.totalSpending || 0)) * 100) / 100,
  }));

  return c.json(result);
});

// Balances summary
spending.get('/balances', async (c) => {
  const rows = await db.select({
    id: schema.accounts.id,
    name: schema.accounts.name,
    type: schema.accounts.type,
    subtype: schema.accounts.subtype,
    currentBalance: schema.accounts.currentBalance,
    availableBalance: schema.accounts.availableBalance,
    creditLimit: schema.accounts.creditLimit,
  })
    .from(schema.accounts);

  let totalCash = 0;
  let totalCredit = 0;
  let totalCreditLimit = 0;
  let totalInvestment = 0;
  let totalLoan = 0;

  for (const acct of rows) {
    const balance = acct.currentBalance || 0;
    switch (acct.type) {
      case 'depository':
        totalCash += balance;
        break;
      case 'credit':
        totalCredit += balance;
        totalCreditLimit += acct.creditLimit || 0;
        break;
      case 'investment':
        totalInvestment += balance;
        break;
      case 'loan':
        totalLoan += balance;
        break;
    }
  }

  return c.json({
    accounts: rows,
    summary: {
      totalCash: Math.round(totalCash * 100) / 100,
      totalCreditUsed: Math.round(totalCredit * 100) / 100,
      totalCreditLimit: Math.round(totalCreditLimit * 100) / 100,
      totalInvestment: Math.round(totalInvestment * 100) / 100,
      totalLoan: Math.round(totalLoan * 100) / 100,
      netWorth: Math.round((totalCash + totalInvestment - totalCredit - totalLoan) * 100) / 100,
    },
  });
});

export default spending;
