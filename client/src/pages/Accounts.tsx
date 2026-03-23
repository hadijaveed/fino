import { useEffect, useState, useCallback } from 'react';
import { api } from '../lib/api';
import { PlaidLinkButton } from '../components/PlaidLinkButton';
import { RefreshCw, Trash2, Building2, CheckCircle2, AlertCircle } from 'lucide-react';

interface Account {
  id: string;
  name: string;
  officialName: string | null;
  type: string;
  subtype: string | null;
  mask: string | null;
  currentBalance: number | null;
  itemId: string;
  institutionName: string | null;
  connectionStatus: string | null;
  lastSyncedAt: string | null;
}

function formatCurrency(amount: number | null): string {
  if (amount === null) return '--';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

function typeLabel(type: string, subtype: string | null) {
  const parts = [type];
  if (subtype) parts.push(subtype);
  return parts.join(' / ');
}

export function Accounts() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadAccounts = useCallback(() => {
    setLoading(true);
    api.getAccounts()
      .then(setAccounts)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadAccounts(); }, [loadAccounts]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      await api.syncAll();
      loadAccounts();
    } catch (err) {
      console.error(err);
    } finally {
      setSyncing(false);
    }
  };

  const handleDelete = async (itemId: string) => {
    if (!confirm('Disconnect this institution and remove all its data?')) return;
    await api.deleteItem(itemId);
    loadAccounts();
  };

  const grouped = accounts.reduce<Record<string, { institutionName: string; itemId: string; connectionStatus: string | null; accounts: Account[] }>>((acc, acct) => {
    const key = acct.itemId;
    if (!acc[key]) {
      acc[key] = { institutionName: acct.institutionName || 'CSV Import', itemId: acct.itemId, connectionStatus: acct.connectionStatus, accounts: [] };
    }
    acc[key].accounts.push(acct);
    return acc;
  }, {});

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Accounts</h2>
          <p className="text-sm text-muted-foreground mt-1">Manage your connected bank accounts</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleSync}
            disabled={syncing}
            className="inline-flex items-center gap-2 px-4 py-2.5 glass-card-hover text-sm font-medium disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} strokeWidth={1.8} />
            {syncing ? 'Syncing...' : 'Sync All'}
          </button>
          <PlaidLinkButton onSuccess={loadAccounts} />
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => <div key={i} className="h-32 glass-card animate-pulse" />)}
        </div>
      ) : Object.keys(grouped).length === 0 ? (
        <div className="text-center py-16 glass-card">
          <div className="h-14 w-14 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-5">
            <Building2 className="h-7 w-7 text-muted-foreground" strokeWidth={1.5} />
          </div>
          <p className="text-muted-foreground mb-5">No bank accounts connected yet</p>
          <PlaidLinkButton onSuccess={loadAccounts} />
        </div>
      ) : (
        <div className="space-y-4">
          {Object.values(grouped).map(({ institutionName, itemId, connectionStatus, accounts: accts }) => (
            <div key={itemId} className="glass-card overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-border/40">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-accent flex items-center justify-center">
                    <Building2 className="h-4 w-4 text-muted-foreground" strokeWidth={1.8} />
                  </div>
                  <div>
                    <span className="font-medium text-sm">{institutionName}</span>
                    <div className="flex items-center gap-1 mt-0.5">
                      {connectionStatus === 'good' ? (
                        <><CheckCircle2 className="h-3 w-3 text-emerald-400" /><span className="text-[11px] text-emerald-400/80">Connected</span></>
                      ) : (
                        <><AlertCircle className="h-3 w-3 text-amber-400" /><span className="text-[11px] text-amber-400/80">{connectionStatus}</span></>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(itemId)}
                  className="text-muted-foreground/40 hover:text-destructive p-2 rounded-lg hover:bg-destructive/10 transition-colors"
                  title="Disconnect"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <div className="divide-y divide-border/30">
                {accts.map((acct) => (
                  <div key={acct.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-accent/20 transition-colors">
                    <div>
                      <div className="font-medium text-sm">{acct.name}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {typeLabel(acct.type, acct.subtype)} {acct.mask ? `...${acct.mask}` : ''}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium mono text-sm">{formatCurrency(acct.currentBalance)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
