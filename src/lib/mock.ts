/**
 * Mock Data — Synthetic data generator for RedString testing.
 *
 * Activated via NANSEN_MOCK=true. Returns deterministic fake data
 * for all 16 endpoints, enabling offline development and testing
 * without burning API credits.
 */

export const IS_MOCK = process.env.NANSEN_MOCK === 'true';

// ---------------------------------------------------------------------------
// Deterministic Wallet Addresses
// ---------------------------------------------------------------------------

export const MOCK_WALLETS = {
  seed: '0xdead000000000000000000000000000000000001',
  smartMoney1: '0xfund000000000000000000000000000000000002',
  smartMoney2: '0xwhale00000000000000000000000000000000003',
  labeled1: '0xbinance000000000000000000000000000000004',
  labeled2: '0xaave0000000000000000000000000000000000005',
  unknown1: '0xunknown000000000000000000000000000000006',
  unknown2: '0xanon0000000000000000000000000000000000007',
  contract1: '0xcontract0000000000000000000000000000008',
  exploiter: '0xexploit00000000000000000000000000000009',
  mixer: '0xmixer000000000000000000000000000000000010',
};

function seededRandom(seedStr: string) {
  let h = 0xdeadbeef;
  for (let i = 0; i < seedStr.length; i++) h = Math.imul(h ^ seedStr.charCodeAt(i), 2654435761);
  return function() {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  }
}

function generateDeterministicConnections(address: string, width: number) {
  const rand = seededRandom(address);
  const connections = [];
  
  for (let i = 0; i < width; i++) {
    let childAddr;
    // 20% chance to link back to a known core wallet to create some clusters/cycles instead of 100% pure tree
    if (rand() < 0.2) {
      const coreWallets = Object.values(MOCK_WALLETS);
      childAddr = coreWallets[Math.floor(rand() * coreWallets.length)];
    } else {
      // Generate a new plausible looking address based on the seed sequence
      const hex1 = Math.floor(rand() * 1e16).toString(16);
      const hex2 = Math.floor(rand() * 1e16).toString(16);
      childAddr = '0x' + (hex1 + hex2).padEnd(40, '0');
    }
    
    connections.push({
      address: childAddr,
      volume_usd: Math.floor(rand() * 800000) + 100,
      tx_count: Math.floor(rand() * 100) + 1,
      direction: rand() > 0.6 ? 'out' : (rand() > 0.5 ? 'in' : 'both')
    });
  }
  return connections;
}

export function getMockData(command: string, args: string[]): unknown {
  // Profiler Trace — returns connected wallets
  if (command.includes('profiler trace')) {
    const address = getArgValue(args, '--address') || MOCK_WALLETS.seed;
    const width = parseInt(getArgValue(args, '--width') || '10', 10);
    return {
      address,
      connections: generateDeterministicConnections(address, width),
    };
  }

  // Profiler Counterparties
  if (command.includes('profiler counterparties')) {
    const address = getArgValue(args, '--address') || MOCK_WALLETS.seed;
    const width = parseInt(getArgValue(args, '--width') || '10', 10);
    return generateDeterministicConnections(address, width);
  }

  // Profiler Related Wallets
  if (command.includes('profiler related-wallets')) {
    return [
      { address: MOCK_WALLETS.smartMoney2, relationship: 'funding_source', confidence: 0.92, shared_labels: ['Smart Money'] },
      { address: MOCK_WALLETS.mixer, relationship: 'common_counterparty', confidence: 0.67 },
    ];
  }

  // Profiler Compare
  if (command.includes('profiler compare')) {
    return {
      address_a: getArgValue(args, '--address-a') || MOCK_WALLETS.seed,
      address_b: getArgValue(args, '--address-b') || MOCK_WALLETS.smartMoney1,
      common_counterparties: 7,
      common_tokens: 4,
      correlation_score: 0.78,
      shared_labels: ['DeFi Trader', 'High Frequency'],
    };
  }

  // Profiler Labels
  if (command.includes('profiler labels')) {
    const addr = getArgValue(args, '--address') || '';
    if (addr === MOCK_WALLETS.smartMoney1 || addr === MOCK_WALLETS.smartMoney2) {
      return [{ label: 'Smart Money', tag: 'Fund', category: 'Smart Money' }];
    }
    if (addr === MOCK_WALLETS.labeled1) {
      return [{ label: 'Binance Hot Wallet', tag: 'CEX', category: 'Exchange' }];
    }
    if (addr === MOCK_WALLETS.labeled2) {
      return [{ label: 'Aave Protocol', tag: 'DeFi', category: 'Protocol' }];
    }
    if (addr === MOCK_WALLETS.contract1) {
      return [{ label: 'Uniswap V3: Router', tag: 'DEX', category: 'Protocol' }];
    }
    if (addr === MOCK_WALLETS.exploiter) {
      return [{ label: 'Labeled: Exploiter', tag: 'Warning', category: 'Risk' }];
    }
    return [];
  }

  // Profiler Balance
  if (command.includes('profiler balance')) {
    return {
      total_usd: 1250000 + Math.floor(Math.random() * 500000),
      tokens: [
        { symbol: 'ETH', amount: 350, value_usd: 875000 },
        { symbol: 'USDC', amount: 250000, value_usd: 250000 },
        { symbol: 'AAVE', amount: 500, value_usd: 125000 },
      ],
    };
  }

  // Profiler PnL Summary
  if (command.includes('profiler pnl-summary')) {
    return {
      realized_pnl_usd: 45000,
      unrealized_pnl_usd: 12000,
      total_pnl_usd: 57000,
      period_days: 30,
      win_rate: 0.68,
      total_trades: 142,
    };
  }

  // Portfolio DeFi
  if (command.includes('portfolio defi')) {
    return [
      { protocol: 'Aave V3', type: 'lending', value_usd: 125000, chain: 'ethereum' },
      { protocol: 'Uniswap V3', type: 'liquidity', value_usd: 85000, chain: 'ethereum' },
      { protocol: 'Lido', type: 'staking', value_usd: 250000, chain: 'ethereum' },
    ];
  }

  // Web Search (OSINT)
  if (command.includes('web search')) {
    return [
      { title: 'Wallet Analysis Report', url: 'https://example.com/report', snippet: 'Known DeFi whale active since 2021', source: 'etherscan' },
      { title: 'Thread: Suspicious Activity', url: 'https://twitter.com/example', snippet: 'Multiple connections to sanctioned entities', source: 'twitter' },
    ];
  }

  // Smart Money Netflow
  if (command.includes('smart-money netflow')) {
    return [
      { token: 'ETH', netflow_usd: -1250000, smart_money_count: 42 },
      { token: 'USDC', netflow_usd: 850000, smart_money_count: 28 },
    ];
  }

  // Token Info
  if (command.includes('token info')) {
    return { symbol: 'ETH', name: 'Ethereum', price_usd: 2500, market_cap: 300000000000 };
  }

  // Profiler Transactions
  if (command.includes('profiler transactions')) {
    return [
      { hash: '0xabc...', from: MOCK_WALLETS.seed, to: MOCK_WALLETS.smartMoney1, value_usd: 50000, timestamp: '2024-01-15T12:00:00Z' },
      { hash: '0xdef...', from: MOCK_WALLETS.labeled1, to: MOCK_WALLETS.seed, value_usd: 25000, timestamp: '2024-01-14T08:30:00Z' },
    ];
  }

  // Token Who Bought/Sold
  if (command.includes('token who-bought-sold')) {
    return [
      { address: MOCK_WALLETS.smartMoney1, side: 'buy', volume_usd: 100000, label: 'Fund' },
      { address: MOCK_WALLETS.unknown1, side: 'sell', volume_usd: 50000 },
    ];
  }

  // Wallet Show
  if (command.includes('wallet show')) {
    return { address: getArgValue(args, '--address'), status: 'active', chain: 'ethereum' };
  }

  // Account
  if (command === 'account') {
    return { plan: 'pro', credits_remaining: 450, api_calls_today: 52 };
  }

  // Schema
  if (command === 'schema') {
    return { version: '2.0', endpoints: 16 };
  }

  return null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getArgValue(args: string[], flag: string): string | undefined {
  const idx = args.indexOf(flag);
  if (idx !== -1 && idx + 1 < args.length) return args[idx + 1];
  return undefined;
}
