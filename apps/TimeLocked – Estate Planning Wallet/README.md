# TimeLocked – Estate Planning Wallet

A Bitcoin inheritance vault application that manages pre-signed time-locked (nLockTime) transactions for estate planning. Built with React and TypeScript, designed to be embedded in any website including WordPress.

## What It Does

TimeLocked lets you store raw signed Bitcoin transactions that are time-locked — meaning they can only be broadcast to the Bitcoin network after a specific date or block height. This enables estate planning scenarios where beneficiaries can access funds when conditions are met.

**Key Features:**
- Store pre-signed time-locked transactions from any Bitcoin wallet (Electrum, Bitcoin Core, hardware wallets)
- Support for both timestamp-based and block height-based locktimes
- Manual transaction broadcasting to Bitcoin mainnet via Blockstream/BlockCypher APIs
- Watch-only address monitoring with real-time balance fetching
- Estate planning instruction management
- Support for all Bitcoin address types: Legacy (1...), P2SH (3...), SegWit (bc1q...), and Taproot (bc1p...)
- Live Bitcoin block height display
- Backup and restore functionality (JSON export/import)

**Privacy & Security:**
- All data stored exclusively in your browser's localStorage — nothing is sent to any server
- No accounts, no sign-ups, no cloud storage
- You control your data completely

## Deployment

### Ready-to-Use Files

The `dist/public/` folder contains the production-ready files:
- `index.html` — the app entry point
- `assets/` — bundled JavaScript and CSS
- `.htaccess` — Apache configuration (compression, caching, security headers)

Upload these files to any web server or subfolder to run the app.

### WordPress Integration

To embed TimeLocked in a WordPress page, create a custom page template in your theme:

```php
<?php
/*
Template Name: TimeLocked Inheritance Vault
Template Post Type: page
*/
get_header();
?>

<div id="root"></div>

<link rel="stylesheet" crossorigin href="/bitcoin-timelocked/assets/index-uXp-y73M.css?v=2">
<script type="module" crossorigin src="/bitcoin-timelocked/assets/index-DtjRoie1.js?v=2"></script>

<main class="ct-container">
  <?php the_content(); ?>
</main>

<?php get_footer(); ?>
```

Then upload the `dist/public/assets/` folder to `/bitcoin-timelocked/assets/` on your server.

## Development

### Prerequisites

- Node.js 20+
- npm

### Setup

```bash
npm install
npm run dev
```

The app runs on `http://localhost:5000` in development mode.

### Project Structure

```
client/                     # Frontend source code
├── src/
│   ├── App.tsx             # Main app component
│   ├── main.tsx            # Entry point
│   ├── index.css           # Global styles and theme
│   ├── pages/
│   │   └── wallet.tsx      # Main wallet page
│   ├── components/
│   │   ├── header-info.tsx              # Header with block height display
│   │   ├── wallet-overview.tsx          # Balance overview section
│   │   ├── watch-addresses.tsx          # Watch-only address management
│   │   ├── time-locked-transactions.tsx # Time-locked transaction cards
│   │   ├── estate-instructions.tsx      # Estate planning instructions
│   │   ├── add-timelock-modal-simplified.tsx  # Add transaction form
│   │   ├── add-watch-address-modal.tsx  # Add address form
│   │   └── add-instruction-modal.tsx    # Add instruction form
│   └── lib/
│       ├── bitcoin.ts      # Bitcoin address validation & API calls
│       ├── localStorage.ts # Client-side data persistence
│       └── queryClient.ts  # API client configuration
shared/
│   └── schema.ts           # Shared TypeScript types and Zod schemas
dist/public/                # Production build (ready to deploy)
```

### Building for Production

```bash
npx vite build --base=/bitcoin-timelocked/
```

Change `/bitcoin-timelocked/` to match your deployment subfolder. The built files will be in `dist/public/`.

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Make your changes
4. Test locally with `npm run dev`
5. Build and verify with `npx vite build --base=/bitcoin-timelocked/`
6. Submit a pull request

## License

MIT

## Disclaimer

This software is provided as-is for educational and estate planning purposes. Always verify transactions independently before broadcasting. The developers are not responsible for any loss of funds. Use at your own risk.
