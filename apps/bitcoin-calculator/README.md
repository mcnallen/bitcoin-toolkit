# Bitcoin Calculator

A real-time Bitcoin to USD and Satoshis converter. Single static HTML file with no build step or server required.

## Live Demo

[sats.network](https://sats.network)

## Features

- Real-time BTC price with 30-second auto-refresh
- Convert between Bitcoin (BTC), Satoshis (sats), and US Dollars (USD)
- 24-hour price change indicator
- Quick example buttons (1 BTC, $1,000, 100M sats)
- Works on any static web hosting (no server needed)
- Mobile responsive design
- PWA-ready manifest

## Price API Fallbacks

The calculator uses multiple price APIs with automatic failover:

1. **CoinGecko** - Primary source with 24h change data
2. **CoinCap** - Secondary source with 24h change data
3. **Blockchain.info** - Tertiary source (price only)

If direct API calls are blocked by CORS, the calculator automatically retries through public CORS proxy services (corsproxy.io, allorigins.win). Up to 9 total attempts before showing an error.

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
