import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { DollarSign, CreditCard, TrendingUp, Wallet } from 'lucide-react';

interface Summary {
  totalCash: number;
  totalCreditUsed: number;
  totalCreditLimit: number;
  totalInvestment: number;
  totalLoan: number;
  netWorth: number;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

const cardConfig = [
  {
    label: 'Cash',
    key: 'totalCash' as const,
    icon: Wallet,
    gradient: 'from-emerald-500/10 to-emerald-500/5',
    iconBg: 'bg-emerald-500/15',
    iconColor: 'text-emerald-400',
    valueColor: 'text-emerald-300',
  },
  {
    label: 'Credit Used',
    key: 'totalCreditUsed' as const,
    icon: CreditCard,
    gradient: 'from-amber-500/10 to-amber-500/5',
    iconBg: 'bg-amber-500/15',
    iconColor: 'text-amber-400',
    valueColor: 'text-amber-300',
  },
  {
    label: 'Investments',
    key: 'totalInvestment' as const,
    icon: TrendingUp,
    gradient: 'from-blue-500/10 to-blue-500/5',
    iconBg: 'bg-blue-500/15',
    iconColor: 'text-blue-400',
    valueColor: 'text-blue-300',
  },
  {
    label: 'Net Worth',
    key: 'netWorth' as const,
    icon: DollarSign,
    gradient: 'from-primary/10 to-primary/5',
    iconBg: 'bg-primary/15',
    iconColor: 'text-primary',
    valueColor: 'text-foreground',
  },
];

export function BalanceCards() {
  const [summary, setSummary] = useState<Summary | null>(null);

  useEffect(() => {
    api.getBalances().then((data) => setSummary(data.summary)).catch(console.error);
  }, []);

  if (!summary) {
    return (
      <div className="grid grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-[106px] glass-card animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-4 gap-4">
      {cardConfig.map(({ label, key, icon: Icon, gradient, iconBg, iconColor, valueColor }) => (
        <div key={label} className={`glass-card p-4 bg-gradient-to-br ${gradient}`}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
            <div className={`h-7 w-7 rounded-lg ${iconBg} flex items-center justify-center`}>
              <Icon className={`h-3.5 w-3.5 ${iconColor}`} strokeWidth={2} />
            </div>
          </div>
          <p className={`text-2xl font-semibold tracking-tight mono ${valueColor}`}>
            {formatCurrency(summary[key])}
          </p>
        </div>
      ))}
    </div>
  );
}
