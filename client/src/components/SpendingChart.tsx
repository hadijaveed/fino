import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend, Tooltip } from 'recharts';

interface MonthlyData {
  month: string;
  spending: number;
  income: number;
  net: number;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

const tooltipStyle = {
  backgroundColor: 'hsl(220 13% 12%)',
  border: '1px solid hsl(220 10% 20%)',
  borderRadius: '10px',
  color: '#e5e7eb',
  fontSize: '12px',
  padding: '8px 12px',
  boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
};

export function MonthlyBarChart({ data }: { data: MonthlyData[] }) {
  if (data.length === 0) {
    return <div className="text-center py-8 text-muted-foreground">No monthly data</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} barGap={2}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 10% 16%)" vertical={false} />
        <XAxis
          dataKey="month"
          tick={{ fontSize: 11, fill: '#6b7280', fontFamily: 'DM Sans' }}
          axisLine={{ stroke: 'hsl(220 10% 16%)' }}
          tickLine={false}
        />
        <YAxis
          tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
          tick={{ fontSize: 11, fill: '#6b7280', fontFamily: 'JetBrains Mono' }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip formatter={(value: number) => formatCurrency(value)} contentStyle={tooltipStyle} cursor={{ fill: 'hsl(220 10% 14%)' }} />
        <Legend
          wrapperStyle={{ fontSize: '12px', fontFamily: 'DM Sans' }}
          formatter={(value) => <span style={{ color: '#9ca3af' }}>{value}</span>}
        />
        <Bar dataKey="income" name="Income" fill="#34d399" radius={[6, 6, 0, 0]} opacity={0.85} />
        <Bar dataKey="spending" name="Spending" fill="#f87171" radius={[6, 6, 0, 0]} opacity={0.85} />
      </BarChart>
    </ResponsiveContainer>
  );
}
