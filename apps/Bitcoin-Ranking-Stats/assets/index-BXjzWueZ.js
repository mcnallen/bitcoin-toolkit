const TOTAL_SUPPLY = 21000000;
const CURRENT_SUPPLY = 19900000;
const GLOBAL_POPULATION = 8300000000;
const ESTIMATED_HOLDERS = 130000000;

const HOLDER_DISTRIBUTION = [
  [0.001, 50.0],
  [0.01, 72.0],
  [0.1, 92.0],
  [1.0, 99.4],
  [10.0, 99.95],
  [100.0, 99.995],
  [1000.0, 99.9998],
  [10000.0, 99.99999]
];

function calculateHolderPercentile(btcAmount) {
  for (const [threshold, percentile] of HOLDER_DISTRIBUTION) {
    if (btcAmount <= threshold) {
      let prevThreshold = 0;
      let prevPercentile = 0;
      for (const [k, v] of HOLDER_DISTRIBUTION) {
        if (k >= btcAmount) break;
        prevThreshold = k;
        prevPercentile = v;
      }
      if (prevThreshold === threshold || prevThreshold === 0) return percentile;
      const ratio = (btcAmount - prevThreshold) / (threshold - prevThreshold);
      return prevPercentile + ratio * (percentile - prevPercentile);
    }
  }
  return 99.9;
}

function calculateGlobalPercentile(btcAmount) {
  const hp = calculateHolderPercentile(btcAmount);
  const holdersWithMore = Math.floor(((100 - hp) / 100) * ESTIMATED_HOLDERS);
  return (holdersWithMore / GLOBAL_POPULATION) * 100;
}

function calculateEstimatedRank(btcAmount) {
  const hp = calculateHolderPercentile(btcAmount);
  return Math.max(1, Math.round(((100 - hp) / 100) * ESTIMATED_HOLDERS));
}

function generateEncouragement(btcAmount) {
  if (btcAmount >= 1.0) return "\u{1F389} Congratulations! You're a whole coiner - you're in an elite group!";
  if (btcAmount >= 0.1) return "\u{1F4AA} Great job! You're ahead of most Bitcoin holders. Keep stacking!";
  if (btcAmount >= 0.01) return "\u{1F680} You're on your way! Every satoshi counts - keep building your stack!";
  if (btcAmount >= 0.001) return "\u2B50 Every journey starts with a single step. Keep stacking those sats!";
  return "\u{1F331} Great start! Remember: not your keys, not your coins. Keep stacking!";
}

function fmt(n) { return new Intl.NumberFormat('en-US').format(n); }
function fmtCur(n) { return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n); }
function fmtPct(n, d = 2) { return n.toFixed(d) + '%'; }

async function fetchBtcPrice() {
  try {
    const r = await fetch('https://api.coinbase.com/v2/prices/BTC-USD/spot');
    if (r.ok) { const d = await r.json(); return parseFloat(d.data.amount); }
  } catch (e) {}
  try {
    const r = await fetch('https://mempool.space/api/v1/prices');
    if (r.ok) { const d = await r.json(); return d.USD; }
  } catch (e) {}
  try {
    const r = await fetch('https://blockchain.info/ticker');
    if (r.ok) { const d = await r.json(); return d.USD.last; }
  } catch (e) {}
  try {
    const r = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd');
    if (r.ok) { const d = await r.json(); return d.bitcoin.usd; }
  } catch (e) {}
  return 67000;
}

function generateDCAProjections(currentBtc, btcPrice) {
  const dailyDca = 5.0;
  const timeframes = [30, 90, 180, 365, 730];
  return timeframes.map(days => {
    const totalInvested = dailyDca * days;
    const btcAccumulated = totalInvested / btcPrice;
    const newTotal = currentBtc + btcAccumulated;
    const newHP = calculateHolderPercentile(newTotal);
    const period = days < 365 ? days + " days" : (days / 365).toFixed(days > 365 ? 0 : 0) + " year" + (days > 365 ? "s" : "");
    return { days, period, totalInvested, btcAccumulated, newTotal, newUsdValue: newTotal * btcPrice, newHolderPercentile: 100 - newHP, coffees: days };
  });
}

function generateStackingGoals(currentBtc, btcPrice, dailyDca) {
  const goals = [
    { amount: 0.001, name: '1 Million Satoshis', icon: '\u{1F331}' },
    { amount: 0.01, name: '1% of Bitcoin', icon: '\u2B50' },
    { amount: 0.1, name: 'Significant Stacker', icon: '\u{1F680}' },
    { amount: 0.21, name: '21% Club Member', icon: '\u{1F48E}' },
    { amount: 1.0, name: 'Whole Coiner', icon: '\u{1F3AF}' },
    { amount: 1.5, name: 'Top 1% Territory', icon: '\u{1F3C6}' },
    { amount: 2.1, name: 'Elite Hodler', icon: '\u{1F451}' },
    { amount: 21.0, name: 'Bitcoin Maximalist', icon: '\u{1F981}' }
  ];
  const result = [];
  for (const g of goals) {
    if (g.amount > currentBtc && result.length < 4) {
      const needed = g.amount - currentBtc;
      const hp = calculateHolderPercentile(g.amount);
      const gp = calculateGlobalPercentile(g.amount);
      const rank = calculateEstimatedRank(g.amount);
      const daysNeeded = Math.floor((needed * btcPrice) / dailyDca);
      result.push({ ...g, needed, holderRanking: 100 - hp, globalRanking: gp, rank, daysNeeded, months: (daysNeeded / 30.44).toFixed(1), usdNeeded: needed * btcPrice });
    }
  }
  return result;
}

function generateMarketContext(btcPrice) {
  const marketCap = btcPrice * CURRENT_SUPPLY;
  const r2125 = ((btcPrice - 47000) / 47000) * 100;
  const c2125 = (Math.pow(btcPrice / 47000, 1/4) - 1) * 100;
  let currRank = 12, compRank = 12;
  if (marketCap > 2e12) { currRank = 7; compRank = 6; }
  else if (marketCap > 1.5e12) { currRank = 8; compRank = 8; }
  else if (marketCap > 1e12) { currRank = 10; compRank = 10; }
  return { btcPrice, marketCap, marketCapT: marketCap / 1e12, currRank, compRank, r2125, c2125 };
}

function generateExplanations(btcAmount, supplyPct, holderPct, globalPct, rank, usdValue, btcPrice) {
  const sats = btcAmount * 1e8;
  const holdersWithLess = Math.floor((holderPct / 100) * ESTIMATED_HOLDERS);
  const peopleWithMore = Math.floor((globalPct / 100) * GLOBAL_POPULATION);
  return {
    portfolio: {
      explanation: `Your ${btcAmount.toFixed(8)} BTC is worth ${fmtCur(usdValue)} at current market prices.`,
      funFact: `That's ${fmt(sats)} satoshis! Fun fact: 1 satoshi is the smallest unit of Bitcoin, named after Bitcoin's creator.`,
      math: `Calculation: ${btcAmount.toFixed(8)} BTC \u00d7 ${fmtCur(btcPrice)} per BTC = ${fmtCur(usdValue)}`
    },
    supply: {
      explanation: `You own ${supplyPct.toFixed(6)}% of all Bitcoin that will ever exist.`,
      funFact: `Since only 21 million Bitcoin will ever be created, owning ${btcAmount.toFixed(8)} BTC means you have a permanent claim to this portion of the finite supply!`,
      math: `Calculation: (${btcAmount.toFixed(8)} \u00f7 21,000,000) \u00d7 100 = ${supplyPct.toFixed(6)}%`
    },
    global: {
      explanation: `You're ahead of ${(100 - globalPct).toFixed(2)}% of all ${fmt(GLOBAL_POPULATION)} people on Earth when it comes to Bitcoin ownership.`,
      funFact: `Only approximately ${fmt(peopleWithMore)} people worldwide have more Bitcoin than you, while ${fmt(GLOBAL_POPULATION - peopleWithMore)} people have less or none! Only about ${fmt(ESTIMATED_HOLDERS)} people globally even own Bitcoin.`,
      math: `Calculation: ${fmt(peopleWithMore)} people have more BTC than you \u00f7 ${fmt(GLOBAL_POPULATION)} total people = you're ahead of ${(100 - globalPct).toFixed(2)}%`
    },
    holder: {
      explanation: `Among the estimated ${fmt(ESTIMATED_HOLDERS)} Bitcoin holders worldwide, you rank in the top ${(100 - holderPct).toFixed(2)}%.`,
      funFact: `This means approximately ${fmt(holdersWithLess)} Bitcoin holders have less BTC than you. The median Bitcoin holder owns less than 0.01 BTC!`,
      math: `Calculation: ${holderPct.toFixed(2)}% of ${fmt(ESTIMATED_HOLDERS)} Bitcoin holders have less than you, putting you in the top ${(100 - holderPct).toFixed(2)}%`
    },
    rank: {
      explanation: `Your estimated global rank among Bitcoin holders is approximately #${fmt(rank)}.`,
      funFact: `If all Bitcoin holders were lined up by their holdings, you'd be near position ${fmt(rank)}! Every Bitcoin holder is part of an exclusive group - only about 1.5% of the world's population owns any Bitcoin at all!`,
      math: `Calculation: Top ${(100 - holderPct).toFixed(2)}% of ${fmt(ESTIMATED_HOLDERS)} holders = rank #${fmt(rank)}`
    }
  };
}

function injectDeps() {
  if (!document.querySelector('link[href*="bootstrap"]')) {
    const bs = document.createElement('link');
    bs.rel = 'stylesheet';
    bs.href = 'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css';
    document.head.appendChild(bs);
  }
  if (!document.querySelector('link[href*="font-awesome"]')) {
    const fa = document.createElement('link');
    fa.rel = 'stylesheet';
    fa.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css';
    document.head.appendChild(fa);
  }
  if (!document.querySelector('script[src*="bootstrap"]')) {
    const bsJs = document.createElement('script');
    bsJs.src = 'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js';
    document.body.appendChild(bsJs);
  }
}

function renderApp() {
  injectDeps();
  const root = document.getElementById('root');
  if (!root) return;
  root.setAttribute('data-bs-theme', 'light');
  root.innerHTML = `
    <div class="site-header">
        <div class="container">
            <div class="d-flex align-items-center justify-content-center">
                <img src="/bitcoin-ranking/static/bitcoin-icon.svg" alt="Bitcoin" width="44" height="44" class="me-3 header-logo">
                <div>
                    <h1 class="mb-0">Bitcoin Ranking Stats</h1>
                    <p class="mb-0 header-subtitle">Discover where you rank among global Bitcoin holders</p>
                </div>
            </div>
        </div>
    </div>

    <div class="container mt-4 mb-5">

        <div class="row g-3 mb-4" id="introStats">
            <div class="col-6 col-md-3">
                <div class="stat-card stat-card--orange p-3 rounded text-center">
                    <i class="fas fa-bolt mb-2 stat-icon"></i>
                    <div class="stat-number" id="liveBtcPrice">--</div>
                    <small class="stat-label">Live BTC Price</small>
                </div>
            </div>
            <div class="col-6 col-md-3">
                <div class="stat-card stat-card--dark p-3 rounded text-center">
                    <i class="fas fa-shield-halved mb-2 stat-icon"></i>
                    <div class="stat-number">21,000,000</div>
                    <small class="stat-label">Max Supply</small>
                </div>
            </div>
            <div class="col-6 col-md-3">
                <div class="stat-card stat-card--dark p-3 rounded text-center">
                    <i class="fas fa-user-group mb-2 stat-icon"></i>
                    <div class="stat-number">~130M</div>
                    <small class="stat-label">Bitcoin Holders</small>
                </div>
            </div>
            <div class="col-6 col-md-3">
                <div class="stat-card stat-card--slate p-3 rounded text-center">
                    <i class="fas fa-earth-americas mb-2 stat-icon"></i>
                    <div class="stat-number">1.6%</div>
                    <small class="stat-label">of World Owns BTC</small>
                </div>
            </div>
        </div>

        <div class="card mb-4" id="introCard">
            <div class="card-body">
                <h5 class="card-title mb-3">
                    <i class="fas fa-question-circle text-warning me-2"></i>
                    Why Does Your Bitcoin Ranking Matter?
                </h5>
                <div class="row g-3">
                    <div class="col-md-4">
                        <div class="p-3 bg-secondary bg-opacity-10 rounded h-100">
                            <h6><i class="fas fa-gem me-2"></i>Extreme Scarcity</h6>
                            <p class="small text-muted mb-0">Only 21 million Bitcoin will ever exist. With ~8.3 billion people on Earth, there isn't even enough for everyone to own 0.003 BTC.</p>
                        </div>
                    </div>
                    <div class="col-md-4">
                        <div class="p-3 bg-dark bg-opacity-10 rounded h-100">
                            <h6><i class="fas fa-chart-line me-2"></i>Growing Adoption</h6>
                            <p class="small text-muted mb-0">Only about 1.6% of the world's population currently owns any Bitcoin. As adoption grows, your ranking among holders becomes increasingly significant.</p>
                        </div>
                    </div>
                    <div class="col-md-4">
                        <div class="p-3 bg-secondary bg-opacity-10 rounded h-100">
                            <h6><i class="fas fa-hourglass-half me-2"></i>Lost Forever</h6>
                            <p class="small text-muted mb-0">An estimated 3-4 million Bitcoin are permanently lost (forgotten keys, early wallets). The real available supply is far less than 21 million.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div class="card mb-4">
            <div class="card-body">
                <h5 class="card-title mb-3">
                    <i class="fas fa-calculator me-2"></i>
                    Calculate Your Bitcoin Position
                </h5>
                <div class="row">
                    <div class="col-12">
                        <label for="btcAmount" class="form-label">Bitcoin Amount (BTC)</label>
                        <div class="input-group mb-3">
                            <span class="input-group-text">\u20BF</span>
                            <input type="number" class="form-control" id="btcAmount" placeholder="0.00000000" step="0.00000001" min="0" max="21000000">
                        </div>
                    </div>
                </div>
                <button type="button" class="btn btn-warning w-100" id="calculateBtn">
                    <i class="fas fa-chart-line me-2"></i>
                    Calculate My Ranking
                </button>
            </div>
        </div>

        <div class="text-center d-none" id="loadingSpinner">
            <div class="spinner-border text-warning" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
            <p class="mt-2 text-muted">Fetching Bitcoin data...</p>
        </div>

        <div class="card d-none" id="resultsCard">
            <div class="card-body">
                <h5 class="card-title mb-4">
                    <i class="fas fa-trophy me-2"></i>
                    Your Bitcoin Portfolio Statistics
                </h5>

                <div class="row mb-3">
                    <div class="col-md-6 mb-3 mb-md-0">
                        <div class="stat-card stat-card--slate p-3 rounded text-center">
                            <i class="fas fa-earth-americas fa-2x mb-2 stat-icon"></i>
                            <div class="stat-number" id="globalPopulation">8,300,000,000</div>
                            <small class="stat-label">Global Population</small>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="stat-card stat-card--dark p-3 rounded text-center">
                            <i class="fab fa-bitcoin fa-2x mb-2 stat-icon"></i>
                            <div class="stat-number" id="totalHolders">130,000,000</div>
                            <small class="stat-label">Estimated Bitcoin Holders</small>
                        </div>
                    </div>
                </div>

                <div class="row mb-3">
                    <div class="col-12">
                        <div class="stat-card stat-card--orange p-4 rounded">
                            <div class="d-flex justify-content-between align-items-center">
                                <div class="d-flex align-items-center">
                                    <span>Portfolio Value (USD)</span>
                                    <button class="btn btn-sm btn-outline-success ms-2" type="button" data-bs-toggle="collapse" data-bs-target="#portfolioDetails" aria-expanded="false">
                                        <i class="fas fa-circle-info"></i>
                                    </button>
                                </div>
                                <div class="stat-number stat-number--lg" id="usdValue">$0.00</div>
                            </div>
                            <div class="collapse mt-3" id="portfolioDetails">
                                <div class="border-top border-success pt-3">
                                    <p class="mb-2" id="portfolioExplanation">Your portfolio explanation will appear here.</p>
                                    <p class="mb-2 fw-bold" id="portfolioFunFact">Fun fact will appear here.</p>
                                    <small id="portfolioMath">Math calculation will appear here.</small>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="row g-3">
                    <div class="col-md-6">
                        <div class="stat-card stat-card--dark p-3 rounded text-center position-relative">
                            <i class="fas fa-chart-pie fa-2x mb-2 stat-icon"></i>
                            <div class="stat-number" id="supplyPercentage">0.000%</div>
                            <small class="stat-label">of Total Bitcoin Supply</small>
                            <button class="btn btn-sm btn-outline-primary position-absolute top-0 end-0 m-2" type="button" data-bs-toggle="modal" data-bs-target="#supplyModal">
                                <i class="fas fa-circle-info"></i>
                            </button>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="stat-card stat-card--orange p-3 rounded text-center position-relative">
                            <i class="fas fa-ranking-star fa-2x mb-2 stat-icon"></i>
                            <div class="stat-number" id="globalRanking">Ahead of 0.00%</div>
                            <small class="stat-label">of Global Population</small>
                            <button class="btn btn-sm btn-outline-warning position-absolute top-0 end-0 m-2" type="button" data-bs-toggle="modal" data-bs-target="#globalModal">
                                <i class="fas fa-circle-info"></i>
                            </button>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="stat-card stat-card--dark p-3 rounded text-center position-relative">
                            <i class="fas fa-trophy fa-2x mb-2 stat-icon"></i>
                            <div class="stat-number" id="holderRanking">Top 0.00%</div>
                            <small class="stat-label">of Bitcoin Holders</small>
                            <button class="btn btn-sm btn-outline-info position-absolute top-0 end-0 m-2" type="button" data-bs-toggle="modal" data-bs-target="#holderModal">
                                <i class="fas fa-circle-info"></i>
                            </button>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="stat-card stat-card--slate p-3 rounded text-center position-relative">
                            <i class="fas fa-arrow-up-1 fa-2x mb-2 stat-icon"></i>
                            <div class="stat-number" id="estimatedRank">#0</div>
                            <small class="stat-label">Estimated Global Rank</small>
                            <button class="btn btn-sm btn-outline-light position-absolute top-0 end-0 m-2" type="button" data-bs-toggle="modal" data-bs-target="#rankModal">
                                <i class="fas fa-circle-info"></i>
                            </button>
                        </div>
                    </div>
                </div>

                <div class="mt-4 p-3 bg-success bg-opacity-10 rounded" id="encouragementMessage">
                    <div class="d-flex align-items-center">
                        <i class="fas fa-rocket me-2"></i>
                        <span id="encouragementText">Keep stacking those sats!</span>
                    </div>
                </div>

                <div class="mt-4">
                    <h6 class="mb-3">
                        <i class="fas fa-chart-line text-warning me-2"></i>
                        DCA Projections & Stacking Goals (at current prices)
                    </h6>
                    <ul class="nav nav-tabs" id="projectionTabs" role="tablist">
                        <li class="nav-item" role="presentation">
                            <button class="nav-link active" id="dca-tab" data-bs-toggle="tab" data-bs-target="#dca-content" type="button">
                                <i class="fas fa-coffee me-1"></i> Coffee vs Bitcoin
                            </button>
                        </li>
                        <li class="nav-item" role="presentation">
                            <button class="nav-link" id="goals-tab" data-bs-toggle="tab" data-bs-target="#goals-content" type="button">
                                <i class="fas fa-target me-1"></i> Stacking Goals
                            </button>
                        </li>
                    </ul>
                    <div class="tab-content" id="projectionTabContent">
                        <div class="tab-pane fade show active" id="dca-content">
                            <div class="p-3 border border-top-0 rounded-bottom">
                                <p class="text-muted mb-3">Skip your daily $5 coffee and stack Bitcoin instead!</p>
                                <div class="row g-2" id="dcaProjections"></div>
                                <div class="mt-3">
                                    <h6 class="text-warning">Fun Facts:</h6>
                                    <ul class="list-unstyled" id="dcaFunFacts"></ul>
                                </div>
                            </div>
                        </div>
                        <div class="tab-pane fade" id="goals-content">
                            <div class="p-3 border border-top-0 rounded-bottom">
                                <div class="mb-4">
                                    <label for="dcaAmount" class="form-label">Daily DCA Amount ($)</label>
                                    <div class="input-group">
                                        <span class="input-group-text">$</span>
                                        <input type="number" class="form-control" id="dcaAmount" value="20" step="1" min="1" max="1000">
                                        <button class="btn btn-outline-warning" type="button" id="updateDCABtn">
                                            <i class="fas fa-sync-alt me-1"></i> Update Goals
                                        </button>
                                    </div>
                                    <small class="text-muted">Adjust your daily investment amount for goal timelines</small>
                                </div>
                                <p class="text-muted mb-3">Your next milestones and where you'll rank when you reach them:</p>
                                <div class="row g-3" id="stackingGoals"></div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="mt-5">
                    <h5 class="mb-4">
                        <i class="fas fa-chart-bar text-warning me-2"></i>
                        Why Bitcoin Matters: Historical Context & Returns
                    </h5>
                    <div class="card mb-4">
                        <div class="card-body">
                            <h6 class="card-title"><i class="fas fa-history text-success me-2"></i>Bitcoin 4-Year Cycle Returns (CAGR)</h6>
                            <div class="row g-3">
                                <div class="col-md-3"><div class="text-center p-3 bg-success bg-opacity-10 rounded"><h6 class="text-success mb-1">2009-2013</h6><h4 class="text-success">+5,037%</h4><small class="text-muted">CAGR: +201%</small></div></div>
                                <div class="col-md-3"><div class="text-center p-3 bg-success bg-opacity-10 rounded"><h6 class="text-success mb-1">2013-2017</h6><h4 class="text-success">+1,343%</h4><small class="text-muted">CAGR: +95%</small></div></div>
                                <div class="col-md-3"><div class="text-center p-3 bg-success bg-opacity-10 rounded"><h6 class="text-success mb-1">2017-2021</h6><h4 class="text-success">+295%</h4><small class="text-muted">CAGR: +41%</small></div></div>
                                <div class="col-md-3"><div class="text-center p-3 bg-warning bg-opacity-10 rounded"><h6 class="text-warning mb-1">2021-2025</h6><h4 class="text-warning" id="returns2021">+67%</h4><small class="text-muted">CAGR: <span id="cagr2021">+14%</span></small></div></div>
                            </div>
                            <div class="mt-3 text-center"><small class="text-muted"><strong>Projected 2025-2029:</strong> Conservative estimate +150-300% based on adoption trends and supply halvings</small></div>
                        </div>
                    </div>
                    <div class="card mb-4">
                        <div class="card-body">
                            <h6 class="card-title"><i class="fas fa-globe text-primary me-2"></i>Bitcoin's Global Market Position</h6>
                            <div class="row g-3">
                                <div class="col-md-6">
                                    <div class="bg-primary bg-opacity-10 p-3 rounded">
                                        <h6 class="text-primary mb-2">Currency Ranking</h6>
                                        <p class="mb-1">With a market capitalization of approximately <strong id="marketCap">$1.34 trillion</strong>, and just 16 years old, Bitcoin ranks as the <strong id="currencyRank">10th-largest currency globally</strong>.</p>
                                        <small class="text-muted">At current price of <span id="currentPrice">$67,000</span></small>
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <div class="bg-info bg-opacity-10 p-3 rounded">
                                        <h6 class="text-info mb-2">Company Ranking</h6>
                                        <p class="mb-1">If Bitcoin were a company, it would rank as the <strong id="companyRank">10th largest company in the world</strong> by market capitalization, larger than most Fortune 500 companies.</p>
                                        <small class="text-muted">Larger than most sovereign wealth funds</small>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="card mb-4">
                        <div class="card-body">
                            <h6 class="card-title"><i class="fas fa-exclamation-triangle text-danger me-2"></i>The Debt Crisis & Why Bitcoin Matters</h6>
                            <div class="row g-3">
                                <div class="col-md-4"><div class="text-center p-3 bg-danger bg-opacity-10 rounded"><h6 class="text-danger mb-1">U.S. National Debt</h6><h4 class="text-danger">$38.6T</h4><small class="text-muted" id="debtDate">As of Feb 2026</small></div></div>
                                <div class="col-md-4"><div class="text-center p-3 bg-secondary bg-opacity-10 rounded"><h6 class="mb-1">U.S. Debt Growth Rate</h6><h4>+$1T</h4><small class="text-muted">Every 5 months</small></div></div>
                                <div class="col-md-4"><div class="text-center p-3 bg-secondary bg-opacity-10 rounded"><h6 class="mb-1">Global Debt</h6><h4>$323T+</h4><small class="text-muted">Worldwide total</small></div></div>
                            </div>
                            <div class="mt-3 p-3 bg-warning bg-opacity-10 rounded">
                                <p class="mb-2"><i class="fas fa-exclamation-circle text-warning me-2"></i><strong>The U.S. has recently added about $1 trillion to its national debt every five months\u2014more than twice the pace of prior decades. Meanwhile, rapid expansions of the money supply can erode purchasing power by fueling inflation.</strong></p>
                                <p class="mb-0 small"><i class="fas fa-external-link-alt me-2"></i><a href="https://www.usdebtclock.org/" target="_blank" rel="noopener noreferrer" class="text-warning">View real-time U.S. debt at usdebtclock.org</a></p>
                            </div>
                        </div>
                    </div>
                    <div class="card mb-4">
                        <div class="card-body">
                            <h6 class="card-title"><i class="fas fa-home text-info me-2"></i>House Prices: Fiat vs Bitcoin (2013-2026)</h6>
                            <div class="table-responsive">
                                <table class="table table-striped">
                                    <thead><tr><th>Year</th><th>Median Home Price (USD)</th><th>Bitcoin Price</th><th>Home Price (BTC)</th></tr></thead>
                                    <tbody>
                                        <tr><td>2013</td><td>$259,000</td><td>$200</td><td>1,295 BTC</td></tr>
                                        <tr><td>2017</td><td>$323,100</td><td>$4,000</td><td>81 BTC</td></tr>
                                        <tr><td>2021</td><td>$408,100</td><td>$47,000</td><td>8.7 BTC</td></tr>
                                        <tr class="table-warning"><td>2026</td><td>$420,000</td><td id="btcPrice2025">$67,000</td><td><strong id="btcHousePrice2025">6.3 BTC</strong></td></tr>
                                        <tr class="table-warning"><td>2029*</td><td id="housePrice2029">~$550,000</td><td id="btcPrice2029">~$500,000</td><td><strong id="btcHousePrice2029">~1.1 BTC</strong></td></tr>
                                    </tbody>
                                </table>
                            </div>
                            <div class="mt-3 p-3 bg-info bg-opacity-10 rounded">
                                <p class="mb-1"><i class="fas fa-chart-line text-info me-2"></i><strong>Key Insight:</strong> While house prices increased +62% in USD since 2013, they've decreased -99.5% when priced in Bitcoin.</p>
                                <small class="text-muted">Bitcoin preserves and grows purchasing power against real assets over time.</small>
                            </div>
                            <div class="mt-3 p-3 bg-secondary bg-opacity-10 rounded">
                                <h6 class="mb-2"><i class="fas fa-crystal-ball text-secondary me-2"></i>*2029 Bitcoin Price Forecasts</h6>
                                <p class="mb-2 small"><strong>Consensus forecasts for 2029 range from $275,000 to $500,000</strong>, with CoinDCX stretching that upper bound to $640,000. These models generally factor in continued institutional adoption, halving cycles, and macroeconomic dynamics.</p>
                                <p class="mb-0 small">On the more speculative end, Bitwise and Cantor Fitzgerald suggest the potential for Bitcoin to break above $1 million, though that is often described in broader long-term terms and involves more aggressive assumptions regarding demand and scarcity.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div class="alert alert-danger d-none" id="errorAlert" role="alert">
            <i class="fas fa-exclamation-triangle me-2"></i>
            <span id="errorMessage">Unable to fetch Bitcoin data. Please try again later.</span>
        </div>

        <div class="mt-5 text-center">
            <small class="text-muted">Data sourced from CoinDesk and CoinGecko APIs. Rankings are statistical estimates based on Bitcoin distribution patterns.</small>
        </div>
    </div>

    <div class="modal fade" id="supplyModal" tabindex="-1"><div class="modal-dialog"><div class="modal-content"><div class="modal-header"><h5 class="modal-title"><i class="fas fa-percentage text-primary me-2"></i>Bitcoin Supply Ownership</h5><button type="button" class="btn-close" data-bs-dismiss="modal"></button></div><div class="modal-body"><p id="supplyExplanation"></p><div class="alert alert-primary"><i class="fas fa-lightbulb me-2"></i><span id="supplyFunFact"></span></div><h6>The Math:</h6><code id="supplyMath"></code></div></div></div></div>
    <div class="modal fade" id="globalModal" tabindex="-1"><div class="modal-dialog"><div class="modal-content"><div class="modal-header"><h5 class="modal-title"><i class="fas fa-globe text-warning me-2"></i>Global Population Ranking</h5><button type="button" class="btn-close" data-bs-dismiss="modal"></button></div><div class="modal-body"><p id="globalExplanation"></p><div class="alert alert-warning"><i class="fas fa-lightbulb me-2"></i><span id="globalFunFact"></span></div><h6>The Math:</h6><code id="globalMath"></code></div></div></div></div>
    <div class="modal fade" id="holderModal" tabindex="-1"><div class="modal-dialog"><div class="modal-content"><div class="modal-header"><h5 class="modal-title"><i class="fas fa-medal text-info me-2"></i>Bitcoin Holder Ranking</h5><button type="button" class="btn-close" data-bs-dismiss="modal"></button></div><div class="modal-body"><p id="holderExplanation"></p><div class="alert alert-info"><i class="fas fa-lightbulb me-2"></i><span id="holderFunFact"></span></div><h6>The Math:</h6><code id="holderMath"></code></div></div></div></div>
    <div class="modal fade" id="rankModal" tabindex="-1"><div class="modal-dialog"><div class="modal-content"><div class="modal-header"><h5 class="modal-title"><i class="fas fa-hashtag text-secondary me-2"></i>Estimated Global Rank</h5><button type="button" class="btn-close" data-bs-dismiss="modal"></button></div><div class="modal-body"><p id="rankExplanation"></p><div class="alert alert-secondary"><i class="fas fa-lightbulb me-2"></i><span id="rankFunFact"></span></div><h6>The Math:</h6><code id="rankMath"></code></div></div></div></div>
  `;
}

let cachedPrice = null;

async function initApp() {
  renderApp();

  cachedPrice = await fetchBtcPrice();
  const priceEl = document.getElementById('liveBtcPrice');
  if (priceEl) priceEl.textContent = '$' + Math.round(cachedPrice).toLocaleString();

  const debtDateEl = document.getElementById('debtDate');
  if (debtDateEl) {
    const now = new Date();
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    debtDateEl.textContent = `As of ${months[now.getMonth()]} ${now.getFullYear()}`;
  }

  document.getElementById('calculateBtn').addEventListener('click', () => calculate());
  document.getElementById('btcAmount').addEventListener('keypress', (e) => { if (e.key === 'Enter') calculate(); });
  document.getElementById('btcAmount').addEventListener('input', () => {
    document.getElementById('resultsCard').classList.add('d-none');
    document.getElementById('errorAlert').classList.add('d-none');
  });
  document.getElementById('updateDCABtn').addEventListener('click', () => updateGoals());
  document.getElementById('dcaAmount').addEventListener('keypress', (e) => { if (e.key === 'Enter') updateGoals(); });
}

async function calculate() {
  const input = document.getElementById('btcAmount');
  const btcAmount = parseFloat(input.value);
  if (!btcAmount || btcAmount <= 0) { showError('Please enter a valid Bitcoin amount'); return; }
  if (btcAmount > 21000000) { showError('Bitcoin amount cannot exceed 21 million BTC'); return; }

  document.getElementById('loadingSpinner').classList.remove('d-none');
  document.getElementById('resultsCard').classList.add('d-none');
  document.getElementById('errorAlert').classList.add('d-none');
  document.getElementById('calculateBtn').disabled = true;

  try {
    const price = cachedPrice || await fetchBtcPrice();
    cachedPrice = price;
    const usdValue = btcAmount * price;
    const supplyPct = (btcAmount / TOTAL_SUPPLY) * 100;
    const holderPct = calculateHolderPercentile(btcAmount);
    const globalPct = calculateGlobalPercentile(btcAmount);
    const rank = calculateEstimatedRank(btcAmount);
    const encouragement = generateEncouragement(btcAmount);
    const explanations = generateExplanations(btcAmount, supplyPct, holderPct, globalPct, rank, usdValue, price);
    const dcaData = generateDCAProjections(btcAmount, price);
    const dcaAmount = parseFloat(document.getElementById('dcaAmount').value) || 20;
    const goals = generateStackingGoals(btcAmount, price, dcaAmount);
    const market = generateMarketContext(price);

    document.getElementById('usdValue').textContent = fmtCur(usdValue);
    document.getElementById('supplyPercentage').textContent = fmtPct(supplyPct, 6);
    document.getElementById('globalRanking').textContent = `Ahead of ${fmtPct(100 - globalPct, 2)}`;
    document.getElementById('holderRanking').textContent = `Top ${fmtPct(100 - holderPct, 2)}`;
    document.getElementById('estimatedRank').textContent = `#${fmt(rank)}`;
    document.getElementById('encouragementText').textContent = encouragement;
    document.getElementById('globalPopulation').textContent = fmt(GLOBAL_POPULATION);
    document.getElementById('totalHolders').textContent = fmt(ESTIMATED_HOLDERS);

    document.getElementById('portfolioExplanation').textContent = explanations.portfolio.explanation;
    document.getElementById('portfolioFunFact').textContent = explanations.portfolio.funFact;
    document.getElementById('portfolioMath').textContent = explanations.portfolio.math;
    document.getElementById('supplyExplanation').textContent = explanations.supply.explanation;
    document.getElementById('supplyFunFact').textContent = explanations.supply.funFact;
    document.getElementById('supplyMath').textContent = explanations.supply.math;
    document.getElementById('globalExplanation').textContent = explanations.global.explanation;
    document.getElementById('globalFunFact').textContent = explanations.global.funFact;
    document.getElementById('globalMath').textContent = explanations.global.math;
    document.getElementById('holderExplanation').textContent = explanations.holder.explanation;
    document.getElementById('holderFunFact').textContent = explanations.holder.funFact;
    document.getElementById('holderMath').textContent = explanations.holder.math;
    document.getElementById('rankExplanation').textContent = explanations.rank.explanation;
    document.getElementById('rankFunFact').textContent = explanations.rank.funFact;
    document.getElementById('rankMath').textContent = explanations.rank.math;

    renderDCA(dcaData, btcAmount, price);
    renderGoals(goals);
    updateMarketContext(market);

    document.getElementById('resultsCard').classList.remove('d-none');
    document.getElementById('resultsCard').scrollIntoView({ behavior: 'smooth', block: 'start' });

    if (btcAmount >= 1.0) {
      const card = document.getElementById('resultsCard');
      card.style.animation = 'pulse 0.6s ease-in-out';
      setTimeout(() => { card.style.animation = ''; }, 600);
    }
  } catch (err) {
    console.error(err);
    showError('Unable to calculate ranking. Please check your connection and try again.');
  } finally {
    document.getElementById('loadingSpinner').classList.add('d-none');
    document.getElementById('calculateBtn').disabled = false;
  }
}

function renderDCA(projections, btcAmount, price) {
  const container = document.getElementById('dcaProjections');
  const facts = document.getElementById('dcaFunFacts');
  container.innerHTML = '';
  facts.innerHTML = '';
  projections.forEach(p => {
    const div = document.createElement('div');
    div.className = 'col-md-6 col-lg-4';
    div.innerHTML = `<div class="card bg-info bg-opacity-10 h-100"><div class="card-body text-center p-3"><div class="d-flex justify-content-between align-items-center mb-2"><small class="text-muted">${p.period}</small><span class="badge bg-info">${p.coffees} \u2615</span></div><h6 class="text-info">${p.newTotal.toFixed(6)} BTC</h6><p class="mb-1 small">Invested: $${p.totalInvested.toLocaleString()}</p><p class="mb-1 small">Value: $${Math.round(p.newUsdValue).toLocaleString()}</p><small class="text-success">Top ${p.newHolderPercentile.toFixed(1)}% of holders</small></div></div>`;
    container.appendChild(div);
  });
  const btcPer365 = (365 * 5 / price).toFixed(6);
  const funFacts = [
    `Instead of buying 365 coffees per year ($${(365*5).toLocaleString()}), you could accumulate ${btcPer365} BTC!`,
    `A daily $5 Bitcoin habit costs the same as a coffee habit but builds wealth over time.`,
    `In 2 years, skipping daily coffee for Bitcoin could move you up ${fmt(Math.abs(calculateEstimatedRank(btcAmount + (730*5/price)) - calculateEstimatedRank(btcAmount)))} positions in the global ranking!`
  ];
  funFacts.forEach(f => {
    const li = document.createElement('li');
    li.className = 'mb-2';
    li.innerHTML = `<i class="fas fa-lightbulb text-warning me-2"></i>${f}`;
    facts.appendChild(li);
  });
}

function renderGoals(goals) {
  const container = document.getElementById('stackingGoals');
  container.innerHTML = '';
  if (goals.length === 0) {
    container.innerHTML = '<div class="col-12 text-center text-muted"><i class="fas fa-trophy fa-2x mb-3"></i><p>Congratulations! You\'ve reached all our milestone goals!</p></div>';
    return;
  }
  const dcaVal = document.getElementById('dcaAmount').value;
  goals.forEach(g => {
    const div = document.createElement('div');
    div.className = 'col-md-6';
    div.innerHTML = `<div class="card bg-primary bg-opacity-10 h-100"><div class="card-body p-3"><div class="d-flex align-items-center mb-2"><span class="fs-4 me-2">${g.icon}</span><h6 class="mb-0 text-primary">${g.name}</h6></div><p class="mb-2"><strong>${g.amount} BTC</strong> <small class="text-muted">(+${g.needed.toFixed(6)} BTC needed)</small></p><div class="row g-2 small"><div class="col-6"><div class="text-center p-2 bg-success bg-opacity-10 rounded"><div class="fw-bold text-success">Top ${g.holderRanking.toFixed(1)}%</div><div class="text-muted">of holders</div></div></div><div class="col-6"><div class="text-center p-2 bg-warning bg-opacity-10 rounded"><div class="fw-bold text-warning">Rank #${g.rank.toLocaleString()}</div><div class="text-muted">globally</div></div></div></div><div class="mt-2 text-center"><small class="text-muted"><i class="fas fa-calendar me-1"></i>${g.months} months at $${dcaVal}/day DCA</small></div></div></div>`;
    container.appendChild(div);
  });
}

function updateMarketContext(mc) {
  const el = (id) => document.getElementById(id);
  const sign = mc.r2125 >= 0 ? '+' : '';
  if (el('returns2021')) el('returns2021').textContent = `${sign}${mc.r2125.toFixed(0)}%`;
  if (el('cagr2021')) el('cagr2021').textContent = `${sign}${mc.c2125.toFixed(0)}%`;
  if (el('marketCap')) el('marketCap').textContent = `$${mc.marketCapT.toFixed(2)} trillion`;
  const rankMap = {7:'7th-largest',8:'8th-largest',10:'10th-largest',12:'12th-largest'};
  if (el('currencyRank')) el('currencyRank').textContent = `${rankMap[mc.currRank]||mc.currRank+'th-largest'} currency globally`;
  const compMap = {6:'6th largest',7:'7th largest',8:'8th largest',10:'10th largest',12:'12th largest'};
  if (el('companyRank')) el('companyRank').textContent = `${compMap[mc.compRank]||mc.compRank+'th largest'} company in the world`;
  if (el('currentPrice')) el('currentPrice').textContent = `$${mc.btcPrice.toLocaleString()}`;
  if (el('btcPrice2025')) el('btcPrice2025').textContent = `$${mc.btcPrice.toLocaleString()}`;
  if (el('btcHousePrice2025')) el('btcHousePrice2025').textContent = `${(420000/mc.btcPrice).toFixed(1)} BTC`;
  const proj2029House = 420000 * Math.pow(1.035, 3);
  const proj2029Btc = 500000;
  if (el('housePrice2029')) el('housePrice2029').textContent = `~$${Math.round(proj2029House).toLocaleString()}`;
  if (el('btcPrice2029')) el('btcPrice2029').textContent = `~$${proj2029Btc.toLocaleString()}`;
  if (el('btcHousePrice2029')) el('btcHousePrice2029').textContent = `~${(proj2029House/proj2029Btc).toFixed(1)} BTC`;
}

async function updateGoals() {
  const btcAmount = parseFloat(document.getElementById('btcAmount').value);
  const dcaAmount = parseFloat(document.getElementById('dcaAmount').value);
  if (!btcAmount || btcAmount <= 0) { showError('Please calculate your ranking first'); return; }
  if (!dcaAmount || dcaAmount <= 0) { showError('Please enter a valid DCA amount'); return; }
  const price = cachedPrice || await fetchBtcPrice();
  const goals = generateStackingGoals(btcAmount, price, dcaAmount);
  renderGoals(goals);
}

function showError(msg) {
  document.getElementById('errorMessage').textContent = msg;
  document.getElementById('errorAlert').classList.remove('d-none');
  document.getElementById('resultsCard').classList.add('d-none');
}

initApp();
