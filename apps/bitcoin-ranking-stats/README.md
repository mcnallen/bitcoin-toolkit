# Bitcoin Ranking Stats

A self-contained Bitcoin portfolio ranking calculator that shows users where they stand among global Bitcoin holders. Runs on any web server with no build step required.

**Live Sites:**
- [sats.network/bitcoin-ranking/](https://sats.network/bitcoin-portfolio-ranking/)
- [ranking.sats.network](https://ranking.sats.network/)

## Features

- **Live BTC Price** — Real-time price fetched from multiple API sources (Coinbase, mempool.space, blockchain.info, CoinGecko) with automatic fallbacks
- **Portfolio Value** — Calculates USD value of any Bitcoin amount
- **Supply Percentage** — Shows what percentage of Bitcoin's 21M fixed supply you own
- **Global Population Ranking** — Your position relative to all 8.3 billion people on Earth
- **Holder Ranking** — Where you rank among the estimated 130 million Bitcoin holders worldwide
- **Estimated Global Rank** — Your approximate numerical position among all holders
- **DCA Projections** — "Skip your coffee" projections showing how $5/day stacking changes your ranking over time
- **Stacking Goals** — Personalized milestones with adjustable daily DCA amount and estimated timelines
- **Market Context** — Bitcoin's position among global currencies/companies, historical 4-year cycle returns, debt crisis context, and housing price comparisons in BTC vs USD

## File Structure

```
bitcoin-ranking/
├── index.html                      # Entry point (loads the JS module)
├── assets/
│   └── index-BXjzWueZ.js          # Self-contained app logic (ES module)
├── static/
│   ├── style.css                   # Custom styling (stat cards, header, theme)
│   └── bitcoin-icon.svg           # Header Bitcoin icon
├── .htaccess                       # Apache config (optional, for Apache/SiteGround hosting)
└── README.md
```

## Tech Stack

- **Vanilla JavaScript** (ES6+) — No frameworks, no build step
- **Bootstrap 5.3** — Loaded via CDN for responsive layout
- **Font Awesome 6.4** — Icons loaded via CDN
- **Custom CSS** — Bitcoin-themed stat cards (orange, dark, slate variants), white header, responsive design

## Price API Fallback Chain

The app fetches live Bitcoin prices with multiple fallbacks to ensure reliability:

1. **Coinbase** (`api.coinbase.com`) — Primary source
2. **mempool.space** (`mempool.space/api`) — Bitcoin-focused fallback
3. **Blockchain.info** (`blockchain.info/ticker`) — Long-standing Bitcoin API
4. **CoinGecko** (`api.coingecko.com`) — Additional fallback
5. **Hardcoded $67,000** — Emergency fallback if all APIs fail

## Deployment

No build step required. Upload the files directly to any web server.

### Running from root (standalone site or subdomain)

If you're deploying to the root of a domain (e.g., `yourdomain.com` or `ranking.yourdomain.com`), you need to update the asset path in the JS file. Open `assets/index-BXjzWueZ.js` and find this line in the `renderApp()` function:

```html
<img src="/bitcoin-ranking/static/bitcoin-icon.svg"
```

Change `/bitcoin-ranking/static/` to `/static/`:

```html
<img src="/static/bitcoin-icon.svg"
```

That's the only change needed. Then upload all files to your web root:

```
your-web-root/
├── index.html
├── assets/
│   └── index-BXjzWueZ.js
├── static/
│   ├── style.css
│   └── bitcoin-icon.svg
└── .htaccess (optional)
```

### Running from a subfolder (e.g., WordPress site)

Upload the files to a subfolder like `/bitcoin-ranking/` on your site. The default paths already point to `/bitcoin-ranking/static/`, so no changes are needed. If you wish to put it in a WordPress page you can load it via iframe or reference the JS module directly from a WordPress page using `<div id="root"></div>`.

### Hosting

Tested on SiteGround shared hosting with Apache. The included `.htaccess` handles caching and MIME types. Works on any standard web server (Apache, Nginx, etc.).

## How It Works

The calculator uses a statistical distribution model based on publicly available Bitcoin holder data:

- **Holder Distribution** — Interpolates your position using known thresholds (e.g., 50% of holders own less than 0.001 BTC, 99.4% own less than 1 BTC)
- **Global Ranking** — Compares your holdings against the entire world population of 8.3 billion
- **DCA Projections** — Projects future holdings and ranking changes based on daily dollar-cost averaging at current prices

## Editing

All files are plain text — edit directly in any text editor and re-upload. No compilation or build tools needed.

## License

MIT
