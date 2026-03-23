import { useCallback, useState } from 'react';
import { usePlaidLink } from 'react-plaid-link';
import { api } from '../lib/api';
import { Plus } from 'lucide-react';

interface PlaidLinkButtonProps {
  onSuccess?: () => void;
}

export function PlaidLinkButton({ onSuccess }: PlaidLinkButtonProps) {
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLinkToken = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { link_token } = await api.createLinkToken();
      setLinkToken(link_token);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess: async (publicToken, metadata) => {
      try {
        await api.exchangeToken(publicToken, metadata);
        onSuccess?.();
      } catch (err) {
        setError(String(err));
      }
    },
    onExit: () => {
      setLinkToken(null);
    },
  });

  const buttonClass = "inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors duration-150";

  if (!linkToken) {
    return (
      <div>
        <button onClick={fetchLinkToken} disabled={loading} className={buttonClass}>
          <Plus className="h-4 w-4" strokeWidth={2} />
          {loading ? 'Loading...' : 'Connect Account'}
        </button>
        {error && <p className="text-destructive text-xs mt-2">{error}</p>}
      </div>
    );
  }

  return (
    <div>
      <button onClick={() => open()} disabled={!ready} className={buttonClass}>
        <Plus className="h-4 w-4" strokeWidth={2} />
        {ready ? 'Open Plaid Link' : 'Loading...'}
      </button>
      {error && <p className="text-destructive text-xs mt-2">{error}</p>}
    </div>
  );
}
