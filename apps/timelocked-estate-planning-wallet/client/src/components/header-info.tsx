import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Bitcoin } from "lucide-react";

interface BitcoinPrice {
  bitcoin: {
    usd: number;
    usd_24h_change: number;
  };
}

export function HeaderInfo() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [bitcoinPrice, setBitcoinPrice] = useState<BitcoinPrice | null>(null);
  const [loading, setLoading] = useState(true);

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Fetch Bitcoin price
  useEffect(() => {
    const fetchBitcoinPrice = async () => {
      try {
        const response = await fetch(
          'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true'
        );
        const data = await response.json();
        setBitcoinPrice(data);
        setLoading(false);
      } catch (error) {
        console.error('Failed to fetch Bitcoin price:', error);
        setLoading(false);
      }
    };

    fetchBitcoinPrice();
    // Update price every 5 minutes
    const priceTimer = setInterval(fetchBitcoinPrice, 5 * 60 * 1000);

    return () => clearInterval(priceTimer);
  }, []);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  const formatTime = (date: Date) => {
    return date.toISOString().replace('T', ' ').slice(0, 19) + ' UTC';
  };

  const getPriceChangeColor = (change: number) => {
    if (change > 0) return "text-green-600 bg-green-50";
    if (change < 0) return "text-red-600 bg-red-50";
    return "text-gray-600 bg-gray-50";
  };

  return (
    <div className="flex items-center gap-1">
      <Bitcoin className="w-3 h-3 text-orange-500" />
      {loading ? (
        <span className="text-gray-400 text-xs">Loading...</span>
      ) : bitcoinPrice ? (
        <div className="flex items-center gap-1">
          <span className="font-mono text-gray-700 text-xs" data-testid="bitcoin-price">
            {formatPrice(bitcoinPrice.bitcoin.usd)}
          </span>
          <Badge 
            variant="secondary" 
            className={`text-xs px-1 py-0 ${getPriceChangeColor(bitcoinPrice.bitcoin.usd_24h_change)}`}
            data-testid="price-change"
          >
            {bitcoinPrice.bitcoin.usd_24h_change > 0 ? '+' : ''}
            {bitcoinPrice.bitcoin.usd_24h_change.toFixed(1)}%
          </Badge>
        </div>
      ) : (
        <span className="text-red-500 text-xs">Unavailable</span>
      )}
    </div>
  );
}