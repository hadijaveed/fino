import type { ParsedTransaction } from './csv.js';

function parseOfxDate(dateStr: string): string {
  // OFX dates: YYYYMMDD or YYYYMMDDHHMMSS or YYYYMMDDHHMMSS.XXX[timezone]
  const cleaned = dateStr.trim().replace(/\[.*\]/, '');
  const match = cleaned.match(/^(\d{4})(\d{2})(\d{2})/);
  if (match) {
    return `${match[1]}-${match[2]}-${match[3]}`;
  }
  return dateStr;
}

function extractTag(content: string, tag: string): string | null {
  // OFX uses <TAG>value format (no closing tags for simple values in SGML mode)
  // Also handles XML-style <TAG>value</TAG>
  const patterns = [
    new RegExp(`<${tag}>([^<\\n]+)`, 'i'),
    new RegExp(`<${tag}>([^<]+)</${tag}>`, 'i'),
  ];
  for (const pattern of patterns) {
    const match = content.match(pattern);
    if (match) return match[1].trim();
  }
  return null;
}

export function parseOfx(content: string): { transactions: ParsedTransaction[]; detectedFormat: string } {
  const transactions: ParsedTransaction[] = [];

  // Split into individual transaction blocks
  const txnBlocks = content.split(/<STMTTRN>/i).slice(1);

  for (const block of txnBlocks) {
    const endIdx = block.search(/<\/STMTTRN>/i);
    const txnContent = endIdx !== -1 ? block.substring(0, endIdx) : block;

    const dateStr = extractTag(txnContent, 'DTPOSTED');
    const amountStr = extractTag(txnContent, 'TRNAMT');
    const name = extractTag(txnContent, 'NAME') || extractTag(txnContent, 'MEMO') || 'Unknown';
    const memo = extractTag(txnContent, 'MEMO');

    if (!dateStr || !amountStr) continue;

    const rawAmount = parseFloat(amountStr);
    // OFX: negative = money out, positive = money in
    // Convert to Plaid convention: positive = money out, negative = money in
    const amount = -rawAmount;

    transactions.push({
      date: parseOfxDate(dateStr),
      amount,
      name: name,
      merchantName: memo && memo !== name ? memo : null,
      categoryPrimary: null,
    });
  }

  return { transactions, detectedFormat: 'OFX' };
}
