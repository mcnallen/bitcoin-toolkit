# Bitcoin Calculator & Converter – BTC to USD/Sats (Real-Time, Static HTML)

A real-time Bitcoin to USD and Satoshis converter. Single static HTML file with no build step or server required. Designed for WordPress shared hosting and any static web server.

## Live Demo

[sats.network](https://sats.network)

## Features

- Real-time BTC price with 30-second auto-refresh
- Convert between Bitcoin (BTC), Satoshis (sats), and US Dollars (USD)
- 24-hour price change with percentage and dollar amount
- Manual refresh button for on-demand price updates
- Market statistics: Market Cap, 24h Volume, Circulating Supply, and BTC Dominance
- Quick example buttons (1 BTC, $1,000, 100M sats)
- Works on any static web hosting (no server needed)
- Mobile responsive design
- PWA-ready manifest

## Price API Sources

The calculator fetches price data from multiple APIs with automatic failover. It stops at the first successful response to minimize API requests:

1. **Coinbase** - Fast, reliable price data with good CORS support
2. **CoinGecko** - Price + 24h change + market cap + volume
3. **Kraken** - Price + 24h change + volume
4. **CoinCap** - Price + 24h change + market cap + volume + supply
5. **Blockchain.info** - Price only (last resort)

If direct API calls are blocked by CORS, the calculator automatically retries through public CORS proxy services (corsproxy.io, allorigins.win).

### Data Refresh Schedule

- **Price**: Every 30 seconds (stops at first successful API)
- **Market stats**: Once on page load, then every hour (all APIs queried in parallel)
- **Manual refresh**: Available via the refresh icon next to the 24h change

### Fallback Behavior

When APIs don't return certain data, the calculator uses smart fallbacks:

- **Market Cap**: Estimated from current price and calculated circulating supply
- **Circulating Supply**: Calculated from Bitcoin's block reward schedule (anchored to a known supply value, accurate for years without updates)
- **24h Change**: Cached from the initial stats fetch and reused across price refreshes
- **Volume**: Shows the last successfully fetched value during the session
- **Dominance**: Only shown when live data is available (no stale fallback)

## Installation

1. Upload `index.html` and `.htaccess` to your web server
2. That's it. No dependencies, no build step, no Node.js required

### WordPress / Shared Hosting

Upload both files to a directory on your server (e.g. `/bitcoin-calculator/`):

```
your-site.com/
  bitcoin-calculator/
    index.html
    .htaccess
```

The `.htaccess` file handles URL rewriting for clean URLs on Apache servers. If your hosting uses Nginx, you can skip that file.

### Using a Different Folder Name

The `.htaccess` file is configured for a folder called `/bitcoin-calculator/` by default. If you place the files in a differently named folder (or at the root of your domain), open `.htaccess` in a text editor and follow the instructions at the top of the file to update the folder path.

## Tech Stack

- Vanilla JavaScript (no framework)
- Inline CSS (no external dependencies)
- [Lucide Icons](https://lucide.dev/) via CDN

## License & Credits

Copyright (c) 2026 (https://github.com/mcnallen, https://sats.network)
Licensed under the MIT License — see [LICENSE](https://github.com/mcnallen/sats.network/blob/main/LICENSE) file.
