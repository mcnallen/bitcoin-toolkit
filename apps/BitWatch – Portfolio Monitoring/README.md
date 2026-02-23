# BitWatch – Portfolio Monitoring

A watch-only Bitcoin address portfolio tracker for monitoring balances, transactions, and receiving activity alerts. Built with vanilla HTML, CSS, and JavaScript — no build step, no dependencies, no frameworks.

## Features

- **Real-time Bitcoin price** with 5-minute auto-refresh
- **Multi-address tracking** — add, edit, remove, and categorize Bitcoin addresses
- **Transaction history** with links to block explorers
- **Transaction monitoring** with browser notifications (checks every 5 minutes while page is open)
- **Alerts system** with dismiss and clear functionality
- **Backup & restore** via JSON file export/import
- **Comprehensive address validation** — supports all Bitcoin address types:
  - Legacy (P2PKH) — addresses starting with `1`
  - P2SH — addresses starting with `3`
  - Bech32 (P2WPKH/P2WSH) — addresses starting with `bc1q`
  - Taproot (P2TR) — addresses starting with `bc1p`
- **Category system** — Savings, Inheritance, Cold Storage, Hot Wallet, Other
- **Responsive design** for mobile and desktop
- **Satoshi display toggle** — view amounts in BTC or satoshis

## 4-Source Fallback API System

BitWatch uses a cascading fallback system to ensure reliability — if one API is down, it automatically tries the next.

**Bitcoin Price:**
1. CoinGecko
2. CoinDesk
3. Binance
4. Blockchain.info

**Address Balance:**
1. Blockstream
2. Mempool.space
3. Blockchain.info
4. BlockCypher

**Transaction History:**
1. Blockstream
2. Mempool.space
3. BlockCypher

## Files

| File | Description |
|------|-------------|
| `index.html` | HTML structure and layout |
| `styles.css` | All styling |
| `app.js` | Application logic and API integrations |
| `.htaccess` | WordPress compatibility |

## Deployment

Upload all files to any web server — no Node.js, no build step required.

For example, upload to a `/bitcoin-bitwatch/` subfolder on your hosting and access it directly at `yourdomain.com/bitcoin-bitwatch/`.

## Data Storage

All data is stored in the browser's localStorage — nothing is sent to any server. Your data stays on your device.

- `bitwatch_addresses` — Monitored Bitcoin addresses
- `bitwatch_alerts` — Transaction alerts (max 25)
- `bitwatch_settings` — User preferences

## Security

- **Watch-only** — No private keys, read-only address monitoring only
- **Local data** — All data stored in browser localStorage
- **No backend required** — All API calls made directly from the browser
- **No tracking** — No analytics, no cookies, no third-party scripts

## License

MIT
