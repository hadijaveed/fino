import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { TransactionTable } from '../components/TransactionTable';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';

export function Transactions() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const limit = 25;

  useEffect(() => {
    setLoading(true);
    api.getTransactions({
      limit,
      offset: page * limit,
      search: search || undefined,
      start_date: startDate || undefined,
      end_date: endDate || undefined,
    }).then((data) => {
      setTransactions(data.transactions);
      setTotal(data.total);
    }).catch(console.error)
      .finally(() => setLoading(false));
  }, [page, search, startDate, endDate]);

  const totalPages = Math.ceil(total / limit);

  const inputClass = "px-3 py-2.5 glass-card text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/40 transition-all";

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Transactions</h2>
        <p className="text-sm text-muted-foreground mt-1">Browse and search your transaction history</p>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" strokeWidth={1.8} />
          <input
            type="text"
            placeholder="Search merchants..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            className={`w-full pl-9 pr-3 ${inputClass}`}
          />
        </div>
        <input
          type="date"
          value={startDate}
          onChange={(e) => { setStartDate(e.target.value); setPage(0); }}
          className={inputClass}
        />
        <input
          type="date"
          value={endDate}
          onChange={(e) => { setEndDate(e.target.value); setPage(0); }}
          className={inputClass}
        />
        <span className="text-xs font-medium text-muted-foreground mono">{total} results</span>
      </div>

      {loading ? (
        <div className="glass-card h-64 animate-pulse" />
      ) : (
        <>
          <TransactionTable transactions={transactions} />
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => setPage(Math.max(0, page - 1))}
                disabled={page === 0}
                className="p-2 glass-card-hover disabled:opacity-30"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-sm text-muted-foreground mono">
                {page + 1} / {totalPages}
              </span>
              <button
                onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                disabled={page >= totalPages - 1}
                className="p-2 glass-card-hover disabled:opacity-30"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
