export interface PricePoint {
  date: string;
  close: number;
}

export interface StockFundamentals {
  prices: PricePoint[];
  marketPrices: PricePoint[];
  latestFcf: number;
  sharesOutstanding: number;
  source?: string;
}

export const fetchStockFundamentals = async (
  ticker: string,
  apiKey?: string,
): Promise<StockFundamentals> => {
  const code = ticker.trim().toUpperCase();
  const env = (import.meta as ImportMeta & { env?: Record<string, string> }).env;
  const apiBase =
    env?.VITE_API_BASE_URL ||
    (typeof window !== 'undefined' && window.location.hostname !== 'localhost'
      ? window.location.origin
      : 'http://localhost:8000');
  const query = apiKey?.trim() ? `?av_key=${encodeURIComponent(apiKey.trim())}` : '';

  try {
    const response = await fetch(`${apiBase}/api/stock/${code}${query}`);
    
    if (!response.ok) {
      if (response.status === 422 || response.status === 400) {
        throw new Error('INVALID_TICKER');
      }
      const errorData = await response.json().catch(() => null);
      throw new Error(errorData?.detail || `NETWORK_ERROR`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Data fetch failed, error:', error);
    throw error;
  }
};
