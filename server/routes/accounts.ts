import { Hono } from 'hono';
import { db, schema } from '../db/index.js';
import { eq } from 'drizzle-orm';

const accounts = new Hono();

accounts.get('/', async (c) => {
  const rows = await db.select({
    id: schema.accounts.id,
    name: schema.accounts.name,
    officialName: schema.accounts.officialName,
    type: schema.accounts.type,
    subtype: schema.accounts.subtype,
    mask: schema.accounts.mask,
    currentBalance: schema.accounts.currentBalance,
    availableBalance: schema.accounts.availableBalance,
    creditLimit: schema.accounts.creditLimit,
    isoCurrencyCode: schema.accounts.isoCurrencyCode,
    itemId: schema.accounts.itemId,
    institutionName: schema.institutions.name,
    institutionLogo: schema.institutions.logoUrl,
    connectionStatus: schema.items.connectionStatus,
    lastSyncedAt: schema.items.lastSyncedAt,
  })
    .from(schema.accounts)
    .leftJoin(schema.items, eq(schema.accounts.itemId, schema.items.id))
    .leftJoin(schema.institutions, eq(schema.items.institutionId, schema.institutions.id));

  return c.json(rows);
});

export default accounts;
