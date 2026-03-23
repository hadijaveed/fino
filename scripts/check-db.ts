import 'dotenv/config';
import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import * as schema from '../server/db/schema.js';

const client = createClient({ url: 'file:./data/finance.db' });
const db = drizzle(client, { schema });

async function main() {
  const items = await db.select().from(schema.items);
  console.log('Items:', items.length);
  for (const item of items) {
    console.log('  Item:', item.id.slice(0, 8), 'cursor:', item.transactionCursor ? 'has cursor' : 'no cursor', 'lastSynced:', item.lastSyncedAt);
  }

  const accounts = await db.select().from(schema.accounts);
  console.log('Accounts:', accounts.length);
  for (const a of accounts) {
    console.log('  ', a.name, a.type, a.subtype, 'balance:', a.currentBalance);
  }

  const txns = await db.select().from(schema.transactions);
  console.log('Transactions:', txns.length);
  if (txns.length > 0) {
    console.log('  First:', txns[0].date, txns[0].name, txns[0].amount);
    console.log('  Last:', txns[txns.length - 1].date, txns[txns.length - 1].name, txns[txns.length - 1].amount);
  }

  const logs = await db.select().from(schema.syncLog);
  console.log('Sync logs:', logs.length);
  for (const l of logs) {
    console.log('  ', l.status, 'added:', l.addedCount, 'modified:', l.modifiedCount, 'removed:', l.removedCount, l.errorMessage || '');
  }
}

main().catch(console.error);
