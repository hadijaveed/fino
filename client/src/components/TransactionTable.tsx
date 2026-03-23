import { formatDistanceToNow } from 'date-fns';
import { ArrowDownLeft, ArrowUpRight } from 'lucide-react';

interface Transaction {
  id: string;
  amount: number;
  date: string;
  name: string;
  merchantName: string | null;
  pending: boolean;
  categoryPrimary: string | null;
  accountName: string | null;
  accountMask: string | null;
}

interface TransactionTableProps {
  transactions: Transaction[];
  compact?: boolean;
}

function formatCurrency(amount: number): string {
  const absAmount = Math.abs(amount);
  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(absAmount);
  return amount < 0 ? `+${formatted}` : formatted;
}

export function TransactionTable({ transactions, compact }: TransactionTableProps) {
  if (transactions.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No transactions found. Connect a bank account to get started.
      </div>
    );
  }

  return (
    <div className="glass-card overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border/60">
            <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Date</th>
            <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Description</th>
            {!compact && <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Category</th>}
            {!compact && <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Account</th>}
            <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Amount</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((txn) => (
            <tr key={txn.id} className="border-t border-border/30 hover:bg-accent/30 transition-colors duration-100">
              <td className="px-4 py-3 text-muted-foreground whitespace-nowrap text-[13px]">
                {compact
                  ? formatDistanceToNow(new Date(txn.date + 'T00:00:00'), { addSuffix: true })
                  : txn.date}
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2.5">
                  <div className={`h-7 w-7 rounded-lg flex items-center justify-center shrink-0 ${
                    txn.amount < 0 ? 'bg-emerald-500/10' : 'bg-rose-500/10'
                  }`}>
                    {txn.amount < 0
                      ? <ArrowDownLeft className="h-3.5 w-3.5 text-emerald-400" strokeWidth={2} />
                      : <ArrowUpRight className="h-3.5 w-3.5 text-rose-400" strokeWidth={2} />
                    }
                  </div>
                  <div>
                    <div className="font-medium text-[13px]">{txn.merchantName || txn.name}</div>
                    {txn.pending && (
                      <span className="text-[10px] font-medium text-amber-400/80 bg-amber-500/10 px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                        Pending
                      </span>
                    )}
                  </div>
                </div>
              </td>
              {!compact && (
                <td className="px-4 py-3 text-muted-foreground capitalize text-[13px]">
                  {txn.categoryPrimary?.replace(/_/g, ' ').toLowerCase() || ''}
                </td>
              )}
              {!compact && (
                <td className="px-4 py-3 text-muted-foreground text-[13px]">
                  {txn.accountName}{txn.accountMask ? ` ...${txn.accountMask}` : ''}
                </td>
              )}
              <td className={`px-4 py-3 text-right font-medium whitespace-nowrap mono text-[13px] ${
                txn.amount < 0 ? 'text-emerald-400' : 'text-foreground'
              }`}>
                {formatCurrency(txn.amount)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
