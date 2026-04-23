import { formatINR } from './constants';

const CORS_PROXY = 'https://corsproxy.io/?url=';

// CoinGecko API for Bitcoin
const fetchBitcoin = async () => {
    try {
        const res = await fetch("https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=inr&days=30");
        const data = await res.json();
        return data.prices.map(p => p[1]);
    } catch (err) {
        console.error("CoinGecko Error:", err);
        return [];
    }
}

// Yahoo Finance API for Nifty50 and Gold
// ^NSEI for Nifty50, GC=F for Gold
const fetchYahooFinance = async (symbol) => {
    try {
        const targetUrl = encodeURIComponent(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1mo`);
        const res = await fetch(`${CORS_PROXY}${targetUrl}`);
        const data = await res.json();
        const prices = data.chart.result[0].indicators.quote[0].close;
        return prices.filter(p => p !== null); // remove any empty market days
    } catch (err) {
        console.error(`Yahoo Finance Error for ${symbol}:`, err);
        return [];
    }
}

export const fetchMarketData = async () => {
    const USD_TO_INR = 83.5; // Fixed conversion rate
    
    console.log("[MarketDataFetcher] Fetching real-time APIs...");
    const [btc, nifty, gold] = await Promise.all([
        fetchBitcoin(),
        fetchYahooFinance('^NSEI'),
        fetchYahooFinance('GC=F') // Gold is usually priced in USD per troy ounce
    ]);

    // 1 Troy Ounce = 31.103 grams. We want Price per 10g in INR.
    const formatGold = gold.map(p => (p / 31.103) * 10 * USD_TO_INR);
    
    // Fallback logic if external APIs fail due to network / CORS issues
    const generateFallback = (startPrice, points) => {
        console.warn(`[MarketDataFetcher] Using fallback data generation for asset (starts at ${startPrice})`);
        let current = startPrice;
        let arr = [];
        for(let i=0; i<points; i++) {
            // Random walk between -1.5% and +1.5% daily
            current = current * (1 + (Math.random() * 0.03 - 0.015));
            arr.push(current);
        }
        return arr;
    }

    return {
        Bitcoin: btc.length > 5 ? btc : generateFallback(5500000, 30),
        Nifty50: nifty.length > 5 ? nifty : generateFallback(22500, 30),
        Gold: formatGold.length > 5 ? formatGold : generateFallback(72000, 30) // ~72k INR / 10g
    }
};

export const extractMarketStats = (priceArray) => {
    if (!priceArray || priceArray.length === 0) return { currentPrice: 0, changePercent: 0 };
    
    const currentPrice = priceArray[priceArray.length - 1];
    // 24hr change uses the previous day point. For ~30 days, we'll use priceArray length - 2
    const yesterdayPrice = priceArray.length > 1 ? priceArray[priceArray.length - 2] : currentPrice;
    
    const changePercent = ((currentPrice - yesterdayPrice) / yesterdayPrice) * 100;
    
    return {
        currentPrice,
        changePercent
    };
};
