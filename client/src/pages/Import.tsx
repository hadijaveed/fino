import { useState, useCallback, useRef } from 'react';
import { api } from '../lib/api';
import { Upload, FileUp, CheckCircle2, AlertCircle, Plus, ArrowUpRight, ArrowDownLeft } from 'lucide-react';

interface ParsedTransaction {
  date: string;
  amount: number;
  name: string;
  merchantName: string | null;
  categoryPrimary: string | null;
}

interface ManualAccount {
  id: string;
  name: string;
  type: string;
  subtype: string | null;
}

interface UploadResult {
  format: string;
  count: number;
  transactions: ParsedTransaction[];
  dateRange: { from: string; to: string };
}

function formatCurrency(amount: number): string {
  const absAmount = Math.abs(amount);
  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(absAmount);
  return amount < 0 ? `+${formatted}` : formatted;
}

export function Import() {
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<ManualAccount[]>([]);
  const [allAccounts, setAllAccounts] = useState<ManualAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [showNewAccount, setShowNewAccount] = useState(false);
  const [newAccountName, setNewAccountName] = useState('');
  const [newAccountType, setNewAccountType] = useState<string>('credit');
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ added: number; skipped: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadAccounts = useCallback(async () => {
    try {
      const [manual, all] = await Promise.all([
        api.getManualAccounts(),
        api.getAccounts(),
      ]);
      setAccounts(manual);
      setAllAccounts([...manual, ...all.map((a) => ({ id: a.id, name: a.name, type: a.type, subtype: a.subtype, source: 'plaid' }))]);
    } catch {}
  }, []);

  useState(() => { loadAccounts(); });

  const handleFile = async (file: File) => {
    setError(null);
    setUploadResult(null);
    setImportResult(null);
    setUploading(true);

    try {
      const result = await api.uploadFile(file);
      setUploadResult(result);
    } catch (err) {
      setError(String(err instanceof Error ? err.message : err));
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleConfirm = async () => {
    if (!uploadResult || !selectedAccountId) return;
    setImporting(true);
    setError(null);

    try {
      const result = await api.confirmImport(selectedAccountId, uploadResult.transactions);
      setImportResult(result);
      setUploadResult(null);
    } catch (err) {
      setError(String(err instanceof Error ? err.message : err));
    } finally {
      setImporting(false);
    }
  };

  const handleCreateAccount = async () => {
    if (!newAccountName.trim()) return;
    try {
      const account = await api.createManualAccount(newAccountName.trim(), newAccountType);
      setSelectedAccountId(account.id);
      setShowNewAccount(false);
      setNewAccountName('');
      loadAccounts();
    } catch (err) {
      setError(String(err instanceof Error ? err.message : err));
    }
  };

  const inputClass = "px-3 py-2.5 glass-card text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/40 transition-all w-full";

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Import</h2>
        <p className="text-sm text-muted-foreground mt-1">Import transactions from CSV or OFX files (Apple Card, bank exports, etc.)</p>
      </div>

      {/* Success message */}
      {importResult && (
        <div className="glass-card p-5 border-emerald-500/30 bg-emerald-500/5">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-500/15 flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <p className="font-medium">Import complete</p>
              <p className="text-sm text-muted-foreground">
                {importResult.added} transactions added, {importResult.skipped} duplicates skipped
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="glass-card p-5 border-destructive/30 bg-destructive/5">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
            <p className="text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Upload area */}
      {!uploadResult && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`glass-card p-12 text-center cursor-pointer transition-all duration-200 ${
            dragOver ? 'border-primary/60 bg-primary/5' : 'hover:border-border hover:bg-accent/30'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.ofx,.qfx"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
              e.target.value = '';
            }}
          />
          <div className="h-14 w-14 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-5">
            {uploading ? (
              <FileUp className="h-7 w-7 text-primary animate-pulse" strokeWidth={1.5} />
            ) : (
              <Upload className="h-7 w-7 text-muted-foreground" strokeWidth={1.5} />
            )}
          </div>
          <p className="font-medium mb-1">
            {uploading ? 'Parsing file...' : 'Drop a file here or click to browse'}
          </p>
          <p className="text-sm text-muted-foreground">
            Supports CSV (Apple Card, bank exports) and OFX/QFX files
          </p>
        </div>
      )}

      {/* Preview */}
      {uploadResult && !importResult && (
        <div className="space-y-5">
          <div className="glass-card p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="font-medium">Parsed {uploadResult.count} transactions</p>
                <p className="text-sm text-muted-foreground">
                  Format: {uploadResult.format} &middot; {uploadResult.dateRange.from} to {uploadResult.dateRange.to}
                </p>
              </div>
              <button
                onClick={() => { setUploadResult(null); setError(null); }}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Cancel
              </button>
            </div>

            {/* Account selection */}
            <div className="mb-4">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-2">
                Import to account
              </label>
              <div className="flex items-center gap-2">
                <select
                  value={selectedAccountId}
                  onChange={(e) => {
                    if (e.target.value === '__new__') {
                      setShowNewAccount(true);
                      setSelectedAccountId('');
                    } else {
                      setSelectedAccountId(e.target.value);
                      setShowNewAccount(false);
                    }
                  }}
                  className={inputClass}
                >
                  <option value="">Select an account...</option>
                  {allAccounts.map((a) => (
                    <option key={a.id} value={a.id}>{a.name} ({a.type})</option>
                  ))}
                  <option value="__new__">+ Create new account</option>
                </select>
              </div>
            </div>

            {/* New account form */}
            {showNewAccount && (
              <div className="p-4 rounded-lg bg-accent/30 mb-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">Account name</label>
                    <input
                      type="text"
                      placeholder="e.g. Apple Card"
                      value={newAccountName}
                      onChange={(e) => setNewAccountName(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">Type</label>
                    <select
                      value={newAccountType}
                      onChange={(e) => setNewAccountType(e.target.value)}
                      className={inputClass}
                    >
                      <option value="credit">Credit Card</option>
                      <option value="depository">Checking / Savings</option>
                      <option value="investment">Investment</option>
                      <option value="loan">Loan</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>
                <button
                  onClick={handleCreateAccount}
                  disabled={!newAccountName.trim()}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
                >
                  <Plus className="h-4 w-4" />
                  Create Account
                </button>
              </div>
            )}

            {/* Confirm button */}
            <button
              onClick={handleConfirm}
              disabled={!selectedAccountId || importing}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {importing ? 'Importing...' : `Import ${uploadResult.count} Transactions`}
            </button>
          </div>

          {/* Transaction preview table */}
          <div className="glass-card overflow-hidden">
            <div className="px-5 py-3 border-b border-border/40">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Preview</p>
            </div>
            <div className="max-h-96 overflow-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/40 sticky top-0 bg-card">
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">Date</th>
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">Description</th>
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">Category</th>
                    <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {uploadResult.transactions.slice(0, 50).map((txn, i) => (
                    <tr key={i} className="border-t border-border/20">
                      <td className="px-4 py-2.5 text-muted-foreground text-[13px]">{txn.date}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className={`h-6 w-6 rounded-md flex items-center justify-center shrink-0 ${
                            txn.amount < 0 ? 'bg-emerald-500/10' : 'bg-rose-500/10'
                          }`}>
                            {txn.amount < 0
                              ? <ArrowDownLeft className="h-3 w-3 text-emerald-400" />
                              : <ArrowUpRight className="h-3 w-3 text-rose-400" />
                            }
                          </div>
                          <span className="text-[13px]">{txn.merchantName || txn.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground capitalize text-[13px]">
                        {txn.categoryPrimary?.replace(/_/g, ' ').toLowerCase() || ''}
                      </td>
                      <td className={`px-4 py-2.5 text-right mono text-[13px] ${
                        txn.amount < 0 ? 'text-emerald-400' : 'text-foreground'
                      }`}>
                        {formatCurrency(txn.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {uploadResult.transactions.length > 50 && (
                <div className="px-4 py-3 text-center text-xs text-muted-foreground border-t border-border/20">
                  Showing 50 of {uploadResult.transactions.length} transactions
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
