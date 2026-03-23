export interface ParsedTransaction {
  date: string;       // YYYY-MM-DD
  amount: number;     // positive = money out, negative = money in (Plaid convention)
  name: string;
  merchantName: string | null;
  categoryPrimary: string | null;
}

// Common header name patterns for auto-detection
const DATE_HEADERS = ['transaction date', 'date', 'trans date', 'posting date', 'post date', 'trans. date'];
const AMOUNT_HEADERS = ['amount', 'transaction amount', 'debit', 'amount (usd)'];
const NAME_HEADERS = ['description', 'name', 'memo', 'transaction description', 'trans. description'];
const MERCHANT_HEADERS = ['merchant', 'payee', 'vendor'];
const CATEGORY_HEADERS = ['category', 'type', 'transaction type'];
const CREDIT_HEADERS = ['credit', 'credit amount'];
const DEBIT_HEADERS = ['debit', 'debit amount'];

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase().replace(/['"]/g, '');
}

function findColumn(headers: string[], patterns: string[]): number {
  for (const pattern of patterns) {
    const idx = headers.findIndex((h) => normalizeHeader(h) === pattern);
    if (idx !== -1) return idx;
  }
  return -1;
}

function parseDate(value: string): string {
  const trimmed = value.trim();

  // YYYY-MM-DD already
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;

  // MM/DD/YYYY or M/D/YYYY
  const slashMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashMatch) {
    return `${slashMatch[3]}-${slashMatch[1].padStart(2, '0')}-${slashMatch[2].padStart(2, '0')}`;
  }

  // MM-DD-YYYY
  const dashMatch = trimmed.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (dashMatch) {
    return `${dashMatch[3]}-${dashMatch[1].padStart(2, '0')}-${dashMatch[2].padStart(2, '0')}`;
  }

  // Try native Date parse as fallback
  const d = new Date(trimmed);
  if (!isNaN(d.getTime())) {
    return d.toISOString().split('T')[0];
  }

  return trimmed;
}

function parseAmount(value: string): number {
  // Remove currency symbols, spaces, and handle parentheses for negative
  let cleaned = value.trim().replace(/[$€£\s]/g, '');
  if (cleaned.startsWith('(') && cleaned.endsWith(')')) {
    cleaned = '-' + cleaned.slice(1, -1);
  }
  return parseFloat(cleaned) || 0;
}

function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      fields.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  fields.push(current);
  return fields;
}

function isAppleCardFormat(headers: string[]): boolean {
  const normalized = headers.map(normalizeHeader);
  return normalized.includes('transaction date') &&
    normalized.includes('clearing date') &&
    normalized.includes('description') &&
    normalized.includes('merchant') &&
    normalized.includes('amount');
}

export function parseCsv(content: string): { transactions: ParsedTransaction[]; detectedFormat: string } {
  const lines = content.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return { transactions: [], detectedFormat: 'empty' };

  const headers = parseCsvLine(lines[0]);

  if (isAppleCardFormat(headers)) {
    return parseAppleCardCsv(headers, lines.slice(1));
  }

  return parseGenericCsv(headers, lines.slice(1));
}

function parseAppleCardCsv(headers: string[], dataLines: string[]): { transactions: ParsedTransaction[]; detectedFormat: string } {
  const normalized = headers.map(normalizeHeader);
  const dateIdx = normalized.indexOf('transaction date');
  const descIdx = normalized.indexOf('description');
  const merchantIdx = normalized.indexOf('merchant');
  const categoryIdx = normalized.indexOf('category');
  const amountIdx = normalized.indexOf('amount');

  const transactions: ParsedTransaction[] = [];

  for (const line of dataLines) {
    const fields = parseCsvLine(line);
    if (fields.length <= Math.max(dateIdx, amountIdx)) continue;

    const rawAmount = parseAmount(fields[amountIdx]);
    // Apple Card: negative = purchase (money out), positive = credit/payment (money in)
    // Convert to Plaid convention: positive = money out, negative = money in
    const amount = -rawAmount;

    transactions.push({
      date: parseDate(fields[dateIdx]),
      amount,
      name: fields[descIdx]?.trim() || fields[merchantIdx]?.trim() || 'Unknown',
      merchantName: fields[merchantIdx]?.trim() || null,
      categoryPrimary: fields[categoryIdx]?.trim() || null,
    });
  }

  return { transactions, detectedFormat: 'Apple Card' };
}

function parseGenericCsv(headers: string[], dataLines: string[]): { transactions: ParsedTransaction[]; detectedFormat: string } {
  const normalized = headers.map(normalizeHeader);

  const dateIdx = findColumn(normalized, DATE_HEADERS);
  const amountIdx = findColumn(normalized, AMOUNT_HEADERS);
  const nameIdx = findColumn(normalized, NAME_HEADERS);
  const merchantIdx = findColumn(normalized, MERCHANT_HEADERS);
  const categoryIdx = findColumn(normalized, CATEGORY_HEADERS);
  const creditIdx = findColumn(normalized, CREDIT_HEADERS);
  const debitIdx = findColumn(normalized, DEBIT_HEADERS);

  if (dateIdx === -1) throw new Error('Could not detect a date column. Expected headers like: Date, Transaction Date, Posting Date');
  if (amountIdx === -1 && creditIdx === -1 && debitIdx === -1) {
    throw new Error('Could not detect an amount column. Expected headers like: Amount, Debit, Credit');
  }

  const transactions: ParsedTransaction[] = [];

  for (const line of dataLines) {
    const fields = parseCsvLine(line);
    if (fields.length <= dateIdx) continue;

    let amount: number;
    if (amountIdx !== -1) {
      amount = parseAmount(fields[amountIdx]);
    } else {
      // Separate debit/credit columns
      const debit = debitIdx !== -1 ? parseAmount(fields[debitIdx] || '0') : 0;
      const credit = creditIdx !== -1 ? parseAmount(fields[creditIdx] || '0') : 0;
      amount = debit > 0 ? debit : -credit;
    }

    const name = nameIdx !== -1 ? fields[nameIdx]?.trim() : (fields[1]?.trim() || 'Unknown');
    if (!name) continue;

    transactions.push({
      date: parseDate(fields[dateIdx]),
      amount,
      name,
      merchantName: merchantIdx !== -1 ? fields[merchantIdx]?.trim() || null : null,
      categoryPrimary: categoryIdx !== -1 ? fields[categoryIdx]?.trim() || null : null,
    });
  }

  return { transactions, detectedFormat: 'Generic CSV' };
}
