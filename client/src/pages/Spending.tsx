import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { CategoryPieChart, MonthlyBarChart } from '../components/SpendingChart';

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

export function Spending() {
  const [categories, setCategories] = useState<any[]>([]);
  const [totalSpending, setTotalSpending] = useState(0);
  const [monthly, setMonthly] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.getSpendingByCategory(),
      api.getMonthlySpending(6),
    ]).then(([catData, monthData]) => {
      setCategories(catData.categories);
      setTotalSpending(catData.total);
      setMonthly(monthData);
    }).catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-56 bg-muted/50 rounded-lg animate-pulse" />
        <div className="grid grid-cols-2 gap-5">
          <div className="h-80 glass-card animate-pulse" />
          <div className="h-80 glass-card animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Spending</h2>
        <p className="text-sm text-muted-foreground mt-1">Analyze where your money goes</p>
      </div>

      <div className="grid grid-cols-2 gap-5">
        <div className="glass-card p-5">
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4">By Category</h3>
          <CategoryPieChart data={categories} />
        </div>
        <div className="glass-card p-5">
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4">Monthly Trends</h3>
          <MonthlyBarChart data={monthly} />
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="px-5 py-4 border-b border-border/40">
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Category Breakdown
          </h3>
          <p className="text-lg font-semibold mono mt-1">{formatCurrency(totalSpending)}</p>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/40">
              <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Category</th>
              <th className="text-right px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Amount</th>
              <th className="text-right px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Count</th>
              <th className="text-right px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Share</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((cat, i) => (
              <tr key={cat.category} className="border-t border-border/20 hover:bg-accent/20 transition-colors">
                <td className="px-5 py-3 capitalize text-[13px]">
                  <div className="flex items-center gap-2.5">
                    <div className="h-2 w-2 rounded-full" style={{ backgroundColor: ['#34d399', '#60a5fa', '#f472b6', '#fbbf24', '#a78bfa', '#fb923c', '#2dd4bf', '#e879f9', '#38bdf8', '#4ade80'][i % 10] }} />
                    {cat.category.replace(/_/g, ' ').toLowerCase()}
                  </div>
                </td>
                <td className="px-5 py-3 text-right mono text-[13px]">{formatCurrency(cat.total)}</td>
                <td className="px-5 py-3 text-right text-muted-foreground text-[13px]">{cat.count}</td>
                <td className="px-5 py-3 text-right text-muted-foreground text-[13px]">
                  <div className="flex items-center justify-end gap-2">
                    <div className="w-12 h-1.5 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full bg-primary/60" style={{ width: `${cat.percentage}%` }} />
                    </div>
                    <span className="mono w-8 text-right">{cat.percentage}%</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
