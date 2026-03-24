import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { BalanceCards } from '../components/BalanceCards';
import { TransactionTable } from '../components/TransactionTable';
import { MonthlyBarChart } from '../components/SpendingChart';
import { Activity } from 'lucide-react';

export function Dashboard() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [monthly, setMonthly] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.getTransactions({ limit: 10 }),
      api.getMonthlySpending(6),
    ]).then(([txnData, monthData]) => {
      setTransactions(txnData.transactions);
      setMonthly(monthData);
    }).catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-muted/50 rounded-lg animate-pulse" />
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-[106px] glass-card animate-pulse" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Dashboard</h2>
        <p className="text-sm text-muted-foreground mt-1">Your financial overview at a glance</p>
      </div>

      <BalanceCards />

      <div className="glass-card p-5">
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4">Income vs Spending</h3>
        <MonthlyBarChart data={monthly} />
      </div>

      <div>
        <div className="flex items-center gap-2 mb-4">
          <Activity className="h-4 w-4 text-muted-foreground" strokeWidth={1.8} />
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Recent Transactions</h3>
        </div>
        <TransactionTable transactions={transactions} compact />
      </div>
    </div>
  );
}
