import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';

const COLORS = [
  '#34d399', '#60a5fa', '#f472b6', '#fbbf24', '#a78bfa',
  '#fb923c', '#2dd4bf', '#e879f9', '#38bdf8', '#4ade80',
];

interface CategoryData {
  category: string;
  total: number;
  count: number;
  percentage: number;
}

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

export function CategoryPieChart({ data }: { data: CategoryData[] }) {
  if (data.length === 0) {
    return <div className="text-center py-8 text-muted-foreground">No spending data</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie
          data={data}
          dataKey="total"
          nameKey="category"
          cx="50%"
          cy="50%"
          innerRadius={65}
          outerRadius={105}
          paddingAngle={3}
          strokeWidth={0}
          label={({ category, percentage, x, y }) => (
            percentage > 5 ? (
              <text x={x} y={y} fill="#9ca3af" fontSize={11} fontFamily="DM Sans" textAnchor="middle">
                {`${category.replace(/_/g, ' ')} ${percentage}%`}
              </text>
            ) : null
          )}
          labelLine={false}
        >
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} opacity={0.85} />
          ))}
        </Pie>
        <Tooltip
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const d = payload[0].payload as CategoryData;
            return (
              <div style={tooltipStyle}>
                <p style={{ fontWeight: 600, marginBottom: 2, textTransform: 'capitalize' }}>
                  {d.category.replace(/_/g, ' ').toLowerCase()}
                </p>
                <p style={{ color: '#9ca3af', fontSize: 11 }}>
                  {formatCurrency(d.total)} &middot; {d.count} transactions &middot; {d.percentage}%
                </p>
              </div>
            );
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

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
