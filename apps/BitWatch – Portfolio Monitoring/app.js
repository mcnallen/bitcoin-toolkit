    function generateId() {
      return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
    }
    function formatBTC(satoshis) {
      return (satoshis / 100000000).toFixed(8);
    }
    function satsToBTC(satoshis) {
      return satoshis / 100000000;
    }
    function formatUSD(amount) {
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
    }
    function formatPrice(price) {
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(price);
    }
    function truncateAddr(addr, len) {
      len = len || 10;
      if (addr.length <= len * 2) return addr;
      return addr.slice(0, len) + '...' + addr.slice(-len);
    }
    function relativeTime(ts) {
      var diff = Date.now() - ts;
      var mins = Math.floor(diff / 60000);
      var hrs = Math.floor(diff / 3600000);
      var days = Math.floor(diff / 86400000);
      if (mins < 1) return 'Just now';
      if (mins < 60) return mins + 'm ago';
      if (hrs < 24) return hrs + 'h ago';
      if (days < 7) return days + 'd ago';
      return new Date(ts).toLocaleDateString();
    }
    function escHtml(s) {
      var d = document.createElement('div');
      d.textContent = s;
      return d.innerHTML;
    }
    function validateBitcoinAddress(address) {
      var patterns = {
        P2PKH: /^[1][a-km-zA-HJ-NP-Z1-9]{25,34}$/,
        P2SH: /^[3][a-km-zA-HJ-NP-Z1-9]{25,34}$/,
        P2WPKH: /^bc1q[ac-hj-np-z02-9]{38}$/i,
        P2WSH: /^bc1q[ac-hj-np-z02-9]{58}$/i,
        P2TR: /^bc1p[ac-hj-np-z02-9]{58}$/i
      };
      for (var type in patterns) {
        if (patterns[type].test(address)) return { valid: true, type: type };
      }
      return { valid: false };
    }

    var KEYS = { ADDRESSES: 'bitwatch_addresses', ALERTS: 'bitwatch_alerts', SETTINGS: 'bitwatch_settings' };
    function getAddresses() { try { return JSON.parse(localStorage.getItem(KEYS.ADDRESSES)) || []; } catch(e) { return []; } }
    function saveAddresses(arr) { try { localStorage.setItem(KEYS.ADDRESSES, JSON.stringify(arr)); } catch(e) {} }
    function addAddressToStore(addr) { var arr = getAddresses(); arr.push(addr); saveAddresses(arr); }
    function updateAddress(id, updates) { var arr = getAddresses(); var idx = arr.findIndex(function(a) { return a.id === id; }); if (idx !== -1) { Object.assign(arr[idx], updates); saveAddresses(arr); } }
    function removeAddress(id) { saveAddresses(getAddresses().filter(function(a) { return a.id !== id; })); }
    function getAlerts() { try { return JSON.parse(localStorage.getItem(KEYS.ALERTS)) || []; } catch(e) { return []; } }
    function saveAlerts(arr) { try { localStorage.setItem(KEYS.ALERTS, JSON.stringify(arr)); } catch(e) {} }
    function addAlertItem(alert) { var arr = getAlerts(); arr.unshift(alert); if (arr.length > 25) arr.splice(25); saveAlerts(arr); }
    function dismissAlert(id) { var arr = getAlerts(); var a = arr.find(function(x) { return x.id === id; }); if (a) { a.dismissed = true; saveAlerts(arr); } }
    function getSettings() {
      try {
        var d = { currency: 'USD', refreshInterval: 300000, enableNotifications: true, enableSounds: false, showSatoshis: false };
        var s = JSON.parse(localStorage.getItem(KEYS.SETTINGS));
        return s ? Object.assign(d, s) : d;
      } catch(e) { return { currency: 'USD', refreshInterval: 300000, enableNotifications: true, enableSounds: false, showSatoshis: false }; }
    }
    function saveSettingsData(s) { try { localStorage.setItem(KEYS.SETTINGS, JSON.stringify(s)); } catch(e) {} }

    function tryFetch(url, timeoutMs) {
      timeoutMs = timeoutMs || 10000;
      var controller = new AbortController();
      var timer = setTimeout(function() { controller.abort(); }, timeoutMs);
      return fetch(url, { signal: controller.signal }).then(function(res) {
        clearTimeout(timer);
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res;
      }).catch(function(err) { clearTimeout(timer); throw err; });
    }

    function getBitcoinPrice() {
      var errors = [];
      return getPriceFromCoinGecko().catch(function(e) { errors.push('CoinGecko: ' + e.message); return getPriceFromCoinDesk(); })
        .catch(function(e) { errors.push('CoinDesk: ' + e.message); return getPriceFromBinance(); })
        .catch(function(e) { errors.push('Binance: ' + e.message); return getPriceFromBlockchainInfo(); })
        .catch(function(e) { errors.push('Blockchain.info: ' + e.message); throw new Error('All price APIs failed: ' + errors.join('; ')); });
    }
    function getPriceFromCoinGecko() {
      return tryFetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_last_updated_at=true')
        .then(function(r) { return r.json(); }).then(function(d) {
          if (!d || !d.bitcoin || typeof d.bitcoin.usd !== 'number') throw new Error('Invalid response');
          return { usd: d.bitcoin.usd, last_updated_at: d.bitcoin.last_updated_at ? d.bitcoin.last_updated_at * 1000 : Date.now() };
        });
    }
    function getPriceFromCoinDesk() {
      return tryFetch('https://api.coindesk.com/v1/bpi/currentprice.json')
        .then(function(r) { return r.json(); }).then(function(d) {
          if (!d || !d.bpi || !d.bpi.USD || !d.bpi.USD.rate) throw new Error('Invalid response');
          var price = parseFloat(d.bpi.USD.rate.replace(/,/g, ''));
          if (isNaN(price)) throw new Error('Invalid price');
          return { usd: price, last_updated_at: d.time && d.time.updatedISO ? new Date(d.time.updatedISO).getTime() : Date.now() };
        });
    }
    function getPriceFromBinance() {
      return tryFetch('https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT')
        .then(function(r) { return r.json(); }).then(function(d) {
          var price = parseFloat(d && d.price);
          if (isNaN(price)) throw new Error('Invalid response');
          return { usd: price, last_updated_at: Date.now() };
        });
    }
    function getPriceFromBlockchainInfo() {
      return tryFetch('https://blockchain.info/ticker')
        .then(function(r) { return r.json(); }).then(function(d) {
          if (!d || !d.USD || typeof d.USD.last !== 'number') throw new Error('Invalid response');
          return { usd: d.USD.last, last_updated_at: Date.now() };
        });
    }

    function getAddressInfo(address) {
      var errors = [];
      return getAddrBlockstream(address).catch(function(e) { errors.push('Blockstream: ' + e.message); return getAddrMempool(address); })
        .catch(function(e) { errors.push('Mempool: ' + e.message); return getAddrBlockchainInfo(address); })
        .catch(function(e) { errors.push('Blockchain.info: ' + e.message); return getAddrBlockcypher(address); })
        .catch(function(e) { errors.push('BlockCypher: ' + e.message); throw new Error('All address APIs failed: ' + errors.join('; ')); });
    }
    function parseEsploraAddr(raw, address) {
      var balance = ((raw.chain_stats && raw.chain_stats.funded_txo_sum) || 0) - ((raw.chain_stats && raw.chain_stats.spent_txo_sum) || 0);
      return { address: address, balance: balance, total_received: (raw.chain_stats && raw.chain_stats.funded_txo_sum) || 0, total_sent: (raw.chain_stats && raw.chain_stats.spent_txo_sum) || 0, n_tx: (raw.chain_stats && raw.chain_stats.tx_count) || 0 };
    }
    function getAddrBlockstream(addr) { return tryFetch('https://blockstream.info/api/address/' + addr).then(function(r) { return r.json(); }).then(function(d) { return parseEsploraAddr(d, addr); }); }
    function getAddrMempool(addr) { return tryFetch('https://mempool.space/api/address/' + addr).then(function(r) { return r.json(); }).then(function(d) { return parseEsploraAddr(d, addr); }); }
    function getAddrBlockchainInfo(addr) {
      return tryFetch('https://blockchain.info/balance?active=' + addr + '&cors=true').then(function(r) { return r.json(); }).then(function(d) {
        var a = d[addr]; if (!a || typeof a.final_balance !== 'number') throw new Error('Invalid response');
        return { address: addr, balance: a.final_balance, total_received: a.total_received || 0, total_sent: a.total_sent != null ? a.total_sent : (a.total_received ? a.total_received - a.final_balance : 0), n_tx: a.n_tx || 0 };
      });
    }
    function getAddrBlockcypher(addr) {
      return tryFetch('https://api.blockcypher.com/v1/btc/main/addrs/' + addr + '/balance').then(function(r) { return r.json(); }).then(function(d) {
        return { address: addr, balance: d.final_balance, total_received: d.total_received, total_sent: d.total_sent, n_tx: d.final_n_tx };
      });
    }

    function getTransactions(address, limit) {
      limit = limit || 10;
      var errors = [];
      return getTxBlockstream(address, limit).catch(function(e) { errors.push('Blockstream: ' + e.message); return getTxMempool(address, limit); })
        .catch(function(e) { errors.push('Mempool: ' + e.message); return getTxBlockcypher(address, limit); })
        .catch(function(e) { errors.push('BlockCypher: ' + e.message); throw new Error('All transaction APIs failed: ' + errors.join('; ')); });
    }
    function parseEsploraTxs(txs, address, limit) {
      if (!Array.isArray(txs)) return [];
      return txs.slice(0, limit).map(function(tx) {
        var isReceived = false, isSent = false, amount = 0;
        (tx.vout || []).forEach(function(o) { if (o.scriptpubkey_address === address) isReceived = true; });
        (tx.vin || []).forEach(function(i) { if (i.prevout && i.prevout.scriptpubkey_address === address) isSent = true; });
        if (isReceived && !isSent) {
          (tx.vout || []).forEach(function(o) { if (o.scriptpubkey_address === address) amount += (o.value || 0); });
        } else if (isSent) {
          var totalIn = 0, totalOut = 0;
          (tx.vin || []).forEach(function(i) { if (i.prevout && i.prevout.scriptpubkey_address === address) totalIn += (i.prevout.value || 0); });
          (tx.vout || []).forEach(function(o) { if (o.scriptpubkey_address === address) totalOut += (o.value || 0); });
          amount = totalIn - totalOut;
        }
        return { txid: tx.txid, type: (isReceived && !isSent) ? 'received' : 'sent', amount: Math.abs(amount), confirmations: tx.status && tx.status.confirmed ? 6 : 0, timestamp: tx.status && tx.status.block_time ? tx.status.block_time * 1000 : Date.now(), blockHeight: (tx.status && tx.status.block_height) || -1 };
      });
    }
    function getTxBlockstream(addr, limit) { return tryFetch('https://blockstream.info/api/address/' + addr + '/txs').then(function(r) { return r.json(); }).then(function(d) { return parseEsploraTxs(d, addr, limit); }); }
    function getTxMempool(addr, limit) { return tryFetch('https://mempool.space/api/address/' + addr + '/txs').then(function(r) { return r.json(); }).then(function(d) { return parseEsploraTxs(d, addr, limit); }); }
    function getTxBlockcypher(addr, limit) {
      return tryFetch('https://api.blockcypher.com/v1/btc/main/addrs/' + addr + '/full?limit=' + limit).then(function(r) { return r.json(); }).then(function(d) {
        if (!d.txs || !Array.isArray(d.txs)) return [];
        return d.txs.slice(0, limit).map(function(tx) {
          var isReceived = false, isSent = false, amount = 0;
          (tx.outputs || []).forEach(function(o) { if (o.addresses && o.addresses.indexOf(addr) !== -1) isReceived = true; });
          (tx.inputs || []).forEach(function(i) { if (i.addresses && i.addresses.indexOf(addr) !== -1) isSent = true; });
          if (isReceived && !isSent) { (tx.outputs || []).forEach(function(o) { if (o.addresses && o.addresses.indexOf(addr) !== -1) amount += (o.value || 0); }); }
          else if (isSent) { var tIn = 0, tOut = 0; (tx.inputs || []).forEach(function(i) { if (i.addresses && i.addresses.indexOf(addr) !== -1) tIn += (i.output_value || 0); }); (tx.outputs || []).forEach(function(o) { if (o.addresses && o.addresses.indexOf(addr) !== -1) tOut += (o.value || 0); }); amount = tIn - tOut; }
          return { txid: tx.hash, type: (isReceived && !isSent) ? 'received' : 'sent', amount: Math.abs(amount), confirmations: tx.confirmations || 0, timestamp: tx.received ? new Date(tx.received).getTime() : Date.now(), blockHeight: tx.block_height || -1 };
        });
      });
    }

    var currentPrice = null;
    var balanceCache = {};
    var txCache = {};
    var previousTxIds = {};
    var monitorInitialized = false;
    var monitorInterval = null;
    var notifFilter = 'all';

    function showToast(title, desc) {
      var c = document.getElementById('toast-container');
      var t = document.createElement('div'); t.className = 'toast';
      t.innerHTML = '<div class="toast-title">' + escHtml(title) + '</div>' + (desc ? '<div class="toast-desc">' + escHtml(desc) + '</div>' : '');
      c.appendChild(t);
      setTimeout(function() { t.style.opacity = '0'; t.style.transition = 'opacity 0.3s'; setTimeout(function() { t.remove(); }, 300); }, 3000);
    }

    function openModal(name) { document.getElementById('modal-' + name).classList.add('active'); if (name === 'settings') loadSettingsUI(); if (name === 'notifications') renderNotifications(); }
    function closeModal(name) { document.getElementById('modal-' + name).classList.remove('active'); }
    document.querySelectorAll('.modal-overlay').forEach(function(el) { el.addEventListener('click', function(e) { if (e.target === el) el.classList.remove('active'); }); });

    function refreshPrice() {
      var btn = document.getElementById('btn-refresh-price');
      if (btn) btn.querySelector('svg').classList.add('spin');
      getBitcoinPrice().then(function(p) {
        currentPrice = p;
        renderPrice();
        updatePortfolio();
      }).catch(function() {
        document.getElementById('price-value').textContent = 'Price unavailable';
      }).finally(function() {
        if (btn) btn.querySelector('svg').classList.remove('spin');
      });
    }
    function renderPrice() {
      if (!currentPrice) return;
      document.getElementById('price-value').textContent = formatPrice(currentPrice.usd);
      var mins = Math.floor((Date.now() - currentPrice.last_updated_at) / 60000);
      document.getElementById('price-updated').textContent = 'Updated ' + (mins < 1 ? 'just now' : mins + 'm ago');
    }

    function updatePortfolio() {
      var addresses = getAddresses();
      var totalSats = 0;
      addresses.forEach(function(a) {
        if (balanceCache[a.address] != null) { totalSats += balanceCache[a.address]; if (a.balance !== balanceCache[a.address]) updateAddress(a.id, { balance: balanceCache[a.address] }); }
        else { totalSats += a.balance || 0; }
      });
      var totalBTC = satsToBTC(totalSats);
      var totalUSD = currentPrice ? totalBTC * currentPrice.usd : 0;
      document.getElementById('total-btc').textContent = totalBTC.toFixed(8) + ' BTC';
      document.getElementById('total-usd').textContent = formatUSD(totalUSD);
      document.getElementById('address-count').textContent = addresses.length;
      var satsEl = document.getElementById('total-sats');
      if (getSettings().showSatoshis) { satsEl.classList.remove('hidden'); satsEl.textContent = totalSats.toLocaleString() + ' sats'; }
      else { satsEl.classList.add('hidden'); }
      if (addresses.length > 0) { document.getElementById('monitoring-status').textContent = 'Active'; document.getElementById('monitoring-detail').textContent = addresses.length + ' address' + (addresses.length > 1 ? 'es' : '') + ' monitored'; }
      else { document.getElementById('monitoring-status').textContent = 'Inactive'; document.getElementById('monitoring-detail').textContent = 'Add addresses to start'; }
    }
    function toggleSats() { var s = getSettings(); s.showSatoshis = !s.showSatoshis; saveSettingsData(s); updatePortfolio(); renderAddresses(); }

    function getCategoryBadge(cat) {
      var m = { savings: ['Savings', 'badge-primary'], inheritance: ['Inheritance', 'badge-purple'], cold_storage: ['Cold Storage', 'badge-warning'], hot_wallet: ['Hot Wallet', 'badge-warning'], other: ['Other', 'badge-gray'] };
      return m[cat] || m.other;
    }

    function renderAddresses() {
      var filter = document.getElementById('filter-category').value;
      var addresses = getAddresses();
      var filtered = filter === 'all' ? addresses : addresses.filter(function(a) { return a.category === filter; });
      var container = document.getElementById('address-list');
      if (filtered.length === 0) {
        container.innerHTML = '<div class="card p-6" style="text-align:center;"><p class="text-muted mb-2">No addresses found</p><p class="text-xs text-muted">' + (filter === 'all' ? 'Add your first Bitcoin address to start monitoring' : 'No addresses in the ' + filter + ' category') + '</p></div>';
        return;
      }
      var settings = getSettings();
      container.innerHTML = filtered.map(function(addr) {
        var balance = balanceCache[addr.address] != null ? balanceCache[addr.address] : (addr.balance || 0);
        var btc = satsToBTC(balance);
        var usd = currentPrice ? btc * currentPrice.usd : 0;
        var catInfo = getCategoryBadge(addr.category);
        var txs = txCache[addr.address] || [];
        var recentTxs = txs.slice(0, 2);
        var html = '<div class="card address-card p-6"><div class="address-card-inner"><div style="flex:1;min-width:0;">' +
          '<div class="flex items-center gap-2 mb-2" style="flex-wrap:wrap;"><strong>' + escHtml(addr.label) + '</strong><span class="badge ' + catInfo[1] + '">' + catInfo[0] + '</span>' +
          '<button class="btn btn-ghost btn-sm btn-icon" onclick="openEditModal(\'' + addr.id + '\')" title="Edit"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button></div>' +
          '<div class="flex items-center gap-2 mb-2"><code class="addr-code mono text-sm text-muted break-all">' + truncateAddr(addr.address, 12) + '</code>' +
          '<button class="btn btn-ghost btn-sm btn-icon" onclick="copyAddr(\'' + addr.address + '\')" title="Copy"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg></button></div>' +
          '<div><div style="font-size:18px;font-weight:700;">' + formatBTC(balance) + ' BTC' + (settings.showSatoshis ? ' <span class="text-xs text-muted">(' + balance.toLocaleString() + ' sats)</span>' : '') + '</div>' +
          '<div class="text-sm text-muted">' + formatUSD(usd) + '</div></div>' +
          '<div class="text-xs text-muted mt-2">Last activity: ' + relativeTime(addr.lastChecked || addr.createdAt) + '</div></div>' +
          '<div class="flex items-center gap-2" style="flex-shrink:0;">' +
          '<button class="btn btn-sm" onclick="openTxModal(\'' + addr.id + '\')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:4px;"><path d="M3 3v5h5"/><path d="M3.05 13A9 9 0 1 0 6 5.3L3 8"/></svg>Transactions</button>' +
          '<button class="btn btn-ghost btn-sm btn-icon" onclick="handleRemoveAddr(\'' + addr.id + '\')" title="Remove" style="color:var(--danger);"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button></div></div>';
        html += '<div class="recent-activity"><div class="flex items-center justify-between mb-2"><span class="text-sm" style="font-weight:500;">Recent Activity</span>' +
          '<span class="badge ' + (recentTxs.length > 0 ? 'badge-success' : 'badge-muted') + '"><span style="width:6px;height:6px;border-radius:50%;background:currentColor;display:inline-block;margin-right:4px;"></span>' + (recentTxs.length > 0 ? 'Active' : 'Dormant') + '</span></div>';
        if (recentTxs.length > 0) {
          html += recentTxs.map(function(tx) {
            var isR = tx.type === 'received';
            return '<div class="tx-item"><div class="flex items-center gap-3"><div class="icon-circle ' + (isR ? 'received-icon' : 'sent-icon') + '"><span style="color:white;font-size:14px;">' + (isR ? '\u2193' : '\u2191') + '</span></div><div><div class="text-sm" style="font-weight:500;">' + (isR ? 'Received' : 'Sent') + '</div><div class="text-xs text-muted">' + relativeTime(tx.timestamp) + '</div></div></div><div style="text-align:right;"><div class="text-sm" style="font-weight:600;color:' + (isR ? 'var(--success)' : 'var(--warning)') + ';">' + (isR ? '+' : '-') + formatBTC(tx.amount) + ' BTC</div><div class="text-xs text-muted">' + (isR ? '+' : '-') + formatUSD(satsToBTC(tx.amount) * (currentPrice ? currentPrice.usd : 0)) + '</div></div></div>';
          }).join('');
        } else { html += '<div class="text-sm text-muted" style="padding:8px 0;">No recent activity</div>'; }
        html += '</div></div>';
        return html;
      }).join('');
    }

    function copyAddr(addr) { navigator.clipboard.writeText(addr).then(function() { showToast('Address copied', 'Bitcoin address copied to clipboard'); }).catch(function() { showToast('Copy failed', 'Unable to copy address'); }); }
    function handleRemoveAddr(id) { if (confirm('Are you sure you want to remove this address from monitoring?')) { removeAddress(id); renderAddresses(); updatePortfolio(); showToast('Address removed', 'Address has been removed from monitoring'); } }

    function handleAddAddress(e) {
      e.preventDefault();
      var addr = document.getElementById('add-address').value.trim();
      var label = document.getElementById('add-label').value.trim();
      var category = document.getElementById('add-category').value;
      var enableAlerts = document.getElementById('add-alerts').checked;
      document.getElementById('add-address-error').classList.add('hidden');
      document.getElementById('add-label-error').classList.add('hidden');
      if (!addr || !validateBitcoinAddress(addr).valid) { var e1 = document.getElementById('add-address-error'); e1.textContent = 'Please enter a valid Bitcoin address'; e1.classList.remove('hidden'); return; }
      if (!label) { var e2 = document.getElementById('add-label-error'); e2.textContent = 'Please enter a label'; e2.classList.remove('hidden'); return; }
      if (getAddresses().some(function(a) { return a.address === addr; })) { showToast('Address already exists', 'This address is already being monitored'); return; }
      var newAddr = { id: generateId(), address: addr, label: label, category: category, enableAlerts: enableAlerts, createdAt: Date.now(), balance: 0, transactions: [] };
      addAddressToStore(newAddr);
      closeModal('addAddress');
      document.getElementById('add-address').value = '';
      document.getElementById('add-label').value = '';
      document.getElementById('add-category').value = 'savings';
      document.getElementById('add-alerts').checked = true;
      showToast('Address added', label + ' is now being monitored');
      fetchBalanceForAddress(newAddr);
      fetchTxForAddress(newAddr);
      renderAddresses();
      updatePortfolio();
      startMonitoring();
    }

    function openEditModal(id) {
      var addr = getAddresses().find(function(a) { return a.id === id; });
      if (!addr) return;
      document.getElementById('edit-id').value = id;
      document.getElementById('edit-address-display').textContent = addr.address;
      document.getElementById('edit-label').value = addr.label;
      document.getElementById('edit-category').value = addr.category;
      document.getElementById('edit-alerts').checked = addr.enableAlerts !== false;
      openModal('editAddress');
    }
    function handleEditAddress(e) {
      e.preventDefault();
      var id = document.getElementById('edit-id').value;
      var label = document.getElementById('edit-label').value.trim();
      if (!label) { showToast('Error', 'Label is required'); return; }
      updateAddress(id, { label: label, category: document.getElementById('edit-category').value, enableAlerts: document.getElementById('edit-alerts').checked, lastUpdated: Date.now() });
      closeModal('editAddress');
      renderAddresses();
      showToast('Address updated', 'Your address has been successfully updated');
    }

    function openTxModal(addrId) {
      var addr = getAddresses().find(function(a) { return a.id === addrId; });
      if (!addr) return;
      document.getElementById('tx-modal-title').textContent = 'Transaction History - ' + addr.label;
      document.getElementById('tx-modal-address').textContent = addr.address;
      document.getElementById('tx-list').innerHTML = '<div style="text-align:center;padding:24px;"><div class="skeleton" style="height:48px;margin-bottom:8px;"></div><div class="skeleton" style="height:48px;margin-bottom:8px;"></div><div class="skeleton" style="height:48px;"></div></div>';
      openModal('transactions');
      getTransactions(addr.address, 25).then(function(txs) { renderTxList(txs); }).catch(function() { document.getElementById('tx-list').innerHTML = '<div style="text-align:center;padding:24px;"><p class="text-muted">Unable to load transactions</p></div>'; });
    }
    function renderTxList(txs) {
      var container = document.getElementById('tx-list');
      if (!txs || txs.length === 0) { container.innerHTML = '<div style="text-align:center;padding:24px;"><p class="text-muted">No transactions found</p></div>'; return; }
      var settings = getSettings();
      container.innerHTML = txs.map(function(tx) {
        var isR = tx.type === 'received';
        var btc = satsToBTC(tx.amount);
        var usd = currentPrice ? btc * currentPrice.usd : 0;
        var statusText = tx.confirmations === 0 ? 'Unconfirmed' : (tx.confirmations < 6 ? tx.confirmations + ' Confirmations' : 'Confirmed');
        var statusColor = tx.confirmations === 0 ? 'badge-warning' : (tx.confirmations < 6 ? 'badge-warning' : 'badge-success');
        return '<div style="display:flex;align-items:flex-start;gap:12px;padding:12px;border:1px solid var(--border);border-radius:8px;margin-bottom:8px;">' +
          '<div class="icon-circle-lg ' + (isR ? 'received-icon' : 'sent-icon') + '"><span style="color:white;font-size:16px;">' + (isR ? '\u2193' : '\u2191') + '</span></div>' +
          '<div style="flex:1;min-width:0;">' +
          '<div class="flex items-center justify-between mb-2" style="flex-wrap:wrap;gap:4px;"><div class="flex items-center gap-2"><span style="font-weight:500;">' + (isR ? 'Received' : 'Sent') + '</span><span class="badge ' + statusColor + '">' + statusText + '</span></div><span class="text-xs text-muted">' + relativeTime(tx.timestamp) + '</span></div>' +
          '<div class="flex items-center justify-between mb-2"><div><div style="font-weight:600;color:' + (isR ? 'var(--success)' : 'var(--warning)') + ';">' + (isR ? '+' : '-') + formatBTC(tx.amount) + ' BTC' + (settings.showSatoshis ? '<div class="text-xs text-muted">(' + tx.amount.toLocaleString() + ' sats)</div>' : '') + '</div><div class="text-sm text-muted">' + (isR ? '+' : '-') + formatUSD(usd) + '</div></div>' +
          '<button class="btn btn-ghost btn-sm" onclick="window.open(\'https://blockstream.info/tx/' + tx.txid + '\',\'_blank\')" style="color:var(--primary);"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:4px;"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>View</button></div>' +
          '<code class="text-xs text-muted mono break-all">' + tx.txid + '</code>' +
          (tx.blockHeight > 0 ? '<div class="text-xs text-muted" style="margin-top:4px;">Block: ' + tx.blockHeight + '</div>' : '') + '</div></div>';
      }).join('');
    }

    function renderAlerts() {
      var alerts = getAlerts().filter(function(a) { return !a.dismissed; }).slice(0, 3);
      var container = document.getElementById('alerts-list');
      var unread = getAlerts().filter(function(a) { return !a.dismissed; }).length;
      var badge = document.getElementById('notif-badge');
      if (unread > 0) { badge.textContent = unread; badge.classList.remove('hidden'); } else { badge.classList.add('hidden'); }
      if (alerts.length === 0) { container.innerHTML = '<div style="text-align:center;padding:24px 0;"><p class="text-muted">No recent alerts</p><p class="text-xs text-muted" style="margin-top:4px;">Transaction alerts will appear here when activity is detected</p></div>'; return; }
      container.innerHTML = alerts.map(function(a) {
        var isR = a.type === 'received';
        var btc = satsToBTC(a.amount);
        var usd = currentPrice ? btc * currentPrice.usd : 0;
        return '<div class="alert-item ' + (isR ? 'alert-received' : 'alert-sent') + '">' +
          '<div class="icon-circle ' + (isR ? 'received-icon' : 'sent-icon') + '"><span style="color:white;font-size:14px;">' + (isR ? '\u2193' : '\u2191') + '</span></div>' +
          '<div style="flex:1;min-width:0;"><div class="flex items-center justify-between mb-2" style="flex-wrap:wrap;gap:4px;"><span class="text-sm" style="font-weight:500;">' + escHtml(a.message) + '</span><span class="text-xs text-muted">' + relativeTime(a.timestamp) + '</span></div>' +
          '<p class="text-sm text-muted">' + (isR ? '+' : '-') + formatBTC(a.amount) + ' BTC (' + (isR ? '+' : '-') + formatUSD(usd) + ') - Transaction confirmed</p>' +
          '<code class="text-xs text-muted mono">TX: ' + a.txid.slice(0, 12) + '...</code></div>' +
          '<button class="btn btn-ghost btn-sm btn-icon" onclick="handleDismissAlert(\'' + a.id + '\')" title="Dismiss">\u2715</button></div>';
      }).join('');
    }
    function handleDismissAlert(id) { dismissAlert(id); renderAlerts(); showToast('Alert dismissed', 'Alert has been marked as read'); }

    function toggleNotifFilter() {
      notifFilter = notifFilter === 'all' ? 'unread' : 'all';
      document.getElementById('btn-notif-filter').textContent = notifFilter === 'all' ? 'Show Unread' : 'Show All';
      renderNotifications();
    }
    function renderNotifications() {
      var alerts = getAlerts();
      var filtered = notifFilter === 'unread' ? alerts.filter(function(a) { return !a.dismissed; }) : alerts;
      var unread = alerts.filter(function(a) { return !a.dismissed; }).length;
      var badge = document.getElementById('notif-modal-badge');
      if (unread > 0) { badge.textContent = unread + ' new'; badge.classList.remove('hidden'); } else { badge.classList.add('hidden'); }
      var container = document.getElementById('notif-list');
      if (filtered.length === 0) { container.innerHTML = '<div style="text-align:center;padding:32px 0;"><p class="text-muted">' + (notifFilter === 'unread' ? 'No unread notifications' : 'No notifications yet') + '</p><p class="text-xs text-muted" style="margin-top:4px;">' + (notifFilter === 'unread' ? 'All caught up!' : 'Transaction alerts will appear here when activity is detected.') + '</p></div>'; return; }
      container.innerHTML = filtered.map(function(a) {
        var isR = a.type === 'received';
        var btc = satsToBTC(a.amount);
        var usd = currentPrice ? btc * currentPrice.usd : 0;
        return '<div class="alert-item ' + (a.dismissed ? '' : (isR ? 'alert-received' : 'alert-sent')) + '" style="' + (a.dismissed ? 'opacity:0.5;background:var(--bg-muted);border-color:var(--border);' : '') + '">' +
          '<div class="icon-circle ' + (isR ? 'received-icon' : 'sent-icon') + '"><span style="color:white;font-size:14px;">' + (isR ? '\u2193' : '\u2191') + '</span></div>' +
          '<div style="flex:1;min-width:0;"><div class="flex items-center justify-between mb-2" style="flex-wrap:wrap;gap:4px;"><span class="text-sm" style="font-weight:500;">' + escHtml(a.message) + '</span><span class="text-xs text-muted">' + relativeTime(a.timestamp) + '</span></div>' +
          '<div class="flex items-center justify-between mb-2"><span class="text-sm text-muted">' + (isR ? '+' : '-') + formatBTC(a.amount) + ' BTC (' + (isR ? '+' : '-') + formatUSD(usd) + ')</span><span class="badge ' + (isR ? 'badge-success' : 'badge-warning') + '">' + (isR ? 'Received' : 'Sent') + '</span></div>' +
          '<code class="text-xs text-muted mono">TX: ' + a.txid.slice(0, 16) + '...</code></div>' +
          (!a.dismissed ? '<button class="btn btn-ghost btn-sm btn-icon" onclick="handleDismissNotif(\'' + a.id + '\')" title="Dismiss">\u2715</button>' : '') + '</div>';
      }).join('');
    }
    function handleDismissNotif(id) { dismissAlert(id); renderNotifications(); renderAlerts(); }
    function dismissAllAlerts() { var alerts = getAlerts(); alerts.forEach(function(a) { a.dismissed = true; }); saveAlerts(alerts); renderNotifications(); renderAlerts(); showToast('All alerts dismissed', 'All alerts marked as read'); }
    function clearAllAlerts() { if (confirm('Are you sure you want to clear all alerts?')) { saveAlerts([]); renderNotifications(); renderAlerts(); showToast('Alerts cleared', 'All alerts have been removed'); } }

    function loadSettingsUI() { var s = getSettings(); document.getElementById('setting-notifications').checked = s.enableNotifications; document.getElementById('setting-satoshis').checked = s.showSatoshis; }
    function saveSettings() {
      var s = getSettings();
      s.enableNotifications = document.getElementById('setting-notifications').checked;
      s.showSatoshis = document.getElementById('setting-satoshis').checked;
      saveSettingsData(s);
      closeModal('settings');
      showToast('Settings saved', 'Your preferences have been updated');
      updatePortfolio(); renderAddresses();
    }
    function clearAllData() {
      if (confirm('Are you sure you want to clear all data? This will remove all addresses, alerts, and settings.')) {
        localStorage.removeItem(KEYS.ADDRESSES); localStorage.removeItem(KEYS.ALERTS); localStorage.removeItem(KEYS.SETTINGS);
        closeModal('settings'); showToast('Data cleared', 'All application data has been removed');
        setTimeout(function() { location.reload(); }, 500);
      }
    }

    function exportBackup() {
      var addresses = getAddresses(), alerts = getAlerts(), settings = getSettings();
      var backup = { version: '1.0', exportDate: new Date().toISOString(), appName: 'BitWatch', data: { addresses: addresses, alerts: alerts, settings: settings }, metadata: { addressCount: addresses.length, alertCount: alerts.length } };
      var blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      var link = document.createElement('a'); link.href = URL.createObjectURL(blob);
      link.download = 'bitwatch-backup-' + new Date().toISOString().split('T')[0] + '.json';
      document.body.appendChild(link); link.click(); document.body.removeChild(link); URL.revokeObjectURL(link.href);
      showToast('Backup exported', 'Downloaded backup with ' + addresses.length + ' addresses');
    }
    function importBackup(e) {
      var file = e.target.files && e.target.files[0]; if (!file) return;
      if (!file.name.endsWith('.json')) { showToast('Invalid file', 'Please select a JSON backup file'); return; }
      file.text().then(function(text) {
        var data = JSON.parse(text);
        if (!data.data || !data.data.addresses) throw new Error('Invalid backup format');
        var addresses = data.data.addresses;
        if (!Array.isArray(addresses)) throw new Error('Invalid addresses data');
        addresses.forEach(function(a) { if (!a.id || !a.address) throw new Error('Invalid address format'); if (!a.label) a.label = a.address.substring(0, 12) + '...'; if (!a.category) a.category = 'other'; if (!a.createdAt) a.createdAt = Date.now(); });
        saveAddresses(addresses);
        if (data.data.alerts) saveAlerts(data.data.alerts);
        if (data.data.settings) saveSettingsData(data.data.settings);
        showToast('Backup imported', 'Imported ' + addresses.length + ' addresses');
        setTimeout(function() { location.reload(); }, 1000);
      }).catch(function(err) { showToast('Import failed', err.message || 'Unable to read backup file'); });
      e.target.value = '';
    }

    function fetchBalanceForAddress(addr) {
      getAddressInfo(addr.address).then(function(info) {
        balanceCache[addr.address] = info.balance;
        updateAddress(addr.id, { balance: info.balance, lastChecked: Date.now() });
        renderAddresses(); updatePortfolio();
      }).catch(function() {});
    }
    function fetchTxForAddress(addr) {
      getTransactions(addr.address, 5).then(function(txs) { txCache[addr.address] = txs; renderAddresses(); }).catch(function() {});
    }
    function refreshAllBalances() {
      var addresses = getAddresses();
      showToast('Refreshing', 'Updating all address balances...');
      addresses.forEach(function(addr) { fetchBalanceForAddress(addr); fetchTxForAddress(addr); });
      refreshPrice();
    }

    function checkForNewTransactions() {
      var addresses = getAddresses();
      if (addresses.length === 0) return;
      addresses.forEach(function(addr) {
        getTransactions(addr.address, 5).then(function(txs) {
          var prevIds = previousTxIds[addr.address] || [];
          if (monitorInitialized && prevIds.length > 0) {
            txs.forEach(function(tx) {
              if (prevIds.indexOf(tx.txid) === -1) {
                var al = { id: generateId(), type: tx.type, message: (tx.type === 'received' ? 'Received' : 'Sent') + ' ' + formatBTC(tx.amount) + ' BTC', amount: tx.amount, addressId: addr.id, txid: tx.txid, timestamp: Date.now(), dismissed: false };
                addAlertItem(al); renderAlerts();
                var settings = getSettings();
                if (settings.enableNotifications && 'Notification' in window && Notification.permission === 'granted') {
                  new Notification('BitWatch: ' + al.message, { body: addr.label + ' - ' + truncateAddr(addr.address) });
                }
              }
            });
          }
          previousTxIds[addr.address] = txs.map(function(tx) { return tx.txid; });
          txCache[addr.address] = txs;
          getAddressInfo(addr.address).then(function(info) {
            balanceCache[addr.address] = info.balance;
            updateAddress(addr.id, { balance: info.balance, lastChecked: Date.now() });
            renderAddresses(); updatePortfolio();
          }).catch(function() {});
        }).catch(function() {});
      });
      if (!monitorInitialized) monitorInitialized = true;
    }
    function startMonitoring() {
      if (monitorInterval) return;
      if (getAddresses().length === 0) return;
      checkForNewTransactions();
      monitorInterval = setInterval(checkForNewTransactions, 300000);
    }
    function manualRefreshMonitor() { checkForNewTransactions(); showToast('Checking transactions', 'Scanning for new activity...'); }

    function init() {
      refreshPrice();
      setInterval(refreshPrice, 300000);
      var addresses = getAddresses();
      addresses.forEach(function(a) { balanceCache[a.address] = a.balance || 0; });
      updatePortfolio(); renderAddresses(); renderAlerts();
      addresses.forEach(function(addr) { fetchBalanceForAddress(addr); fetchTxForAddress(addr); });
      startMonitoring();
      if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission();
    }
    init();
