import { useLiveQuery } from 'dexie-react-hooks';
import { dbOperations } from '../db/db';
import { useState, useEffect } from 'react';

type TimeRange = '24h' | '7d' | '30d';

const BACKEND_API_BASE = import.meta.env.VITE_API_BASE_URL ?? '';
const USE_BACKEND = import.meta.env.VITE_USE_BACKEND === 'true';

export function usePortfolioHistory(range: TimeRange) {
  const hours = range === '24h' ? 24 : range === '7d' ? 168 : 720; // 24h, 7d, 30d in hours
  const [backendHistory, setBackendHistory] = useState<any[]>([]);
  const [isLoadingBackend, setIsLoadingBackend] = useState(false);

  // Load from local database
  const localHistory = useLiveQuery(async () => {
    return await dbOperations.getRecentHistory(hours);
  }, [range]);

  const count = useLiveQuery(async () => {
    return await dbOperations.getHistoryCount();
  }, []);

  // Try to load from backend
  useEffect(() => {
    if (!USE_BACKEND || !BACKEND_API_BASE) {
      return;
    }

    setIsLoadingBackend(true);
    
    fetch(`${BACKEND_API_BASE}/portfolio/history?hours=${hours}`)
      .then(async (response) => {
        if (!response.ok) {
          throw new Error('Backend fetch failed');
        }
        const result = await response.json();
        if (result.success && result.data) {
          // Convert backend format to frontend format
          const converted = result.data.map((item: any) => ({
            id: item.id,
            timestamp: new Date(item.timestamp),
            totalValue: item.total_value,
            snapshotData: item.snapshot_data
          }));
          setBackendHistory(converted);
          console.log(`[usePortfolioHistory] Loaded ${converted.length} snapshots from backend`);
        }
      })
      .catch((error) => {
        console.warn('[usePortfolioHistory] Backend load failed, using local:', error);
      })
      .finally(() => {
        setIsLoadingBackend(false);
      });
  }, [range, hours]);

  // Use backend data if available and has more data points, otherwise use local
  const history = backendHistory.length > 0 ? backendHistory : (localHistory || []);

  return {
    history,
    count: count || 0,
    isLoading: localHistory === undefined || isLoadingBackend,
  };
}
