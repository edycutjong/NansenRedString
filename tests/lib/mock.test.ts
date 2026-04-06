import { describe, it, expect } from 'vitest';
import { getMockData, MOCK_WALLETS } from '../../src/lib/mock.js';

describe('mock', () => {
  describe('MOCK_WALLETS', () => {
    it('should have all required wallet addresses', () => {
      expect(MOCK_WALLETS.seed).toBeDefined();
      expect(MOCK_WALLETS.smartMoney1).toBeDefined();
      expect(MOCK_WALLETS.smartMoney2).toBeDefined();
      expect(MOCK_WALLETS.labeled1).toBeDefined();
      expect(MOCK_WALLETS.labeled2).toBeDefined();
      expect(MOCK_WALLETS.unknown1).toBeDefined();
      expect(MOCK_WALLETS.unknown2).toBeDefined();
      expect(MOCK_WALLETS.contract1).toBeDefined();
      expect(MOCK_WALLETS.exploiter).toBeDefined();
      expect(MOCK_WALLETS.mixer).toBeDefined();
    });

    it('should have unique addresses', () => {
      const values = Object.values(MOCK_WALLETS);
      const unique = new Set(values);
      expect(unique.size).toBe(values.length);
    });
  });

  describe('getMockData', () => {
    it('should return trace data for "profiler trace"', () => {
      const result = getMockData('profiler trace', ['--address', MOCK_WALLETS.seed]) as any;
      expect(result).toBeDefined();
      expect(result.address).toBe(MOCK_WALLETS.seed);
      expect(result.connections).toBeInstanceOf(Array);
      expect(result.connections.length).toBeGreaterThan(0);
      expect(result.connections[0]).toHaveProperty('address');
      expect(result.connections[0]).toHaveProperty('volume_usd');
      expect(result.connections[0]).toHaveProperty('tx_count');
      expect(result.connections[0]).toHaveProperty('direction');
    });

    it('should return counterparties data', () => {
      const result = getMockData('profiler counterparties', []) as any[];
      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('address');
      expect(result[0]).toHaveProperty('label');
    });

    it('should return related wallets data', () => {
      const result = getMockData('profiler related-wallets', []) as any[];
      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('relationship');
      expect(result[0]).toHaveProperty('confidence');
    });

    it('should return compare data', () => {
      const result = getMockData('profiler compare', [
        '--address-a', MOCK_WALLETS.seed,
        '--address-b', MOCK_WALLETS.smartMoney1,
      ]) as any;
      expect(result).toBeDefined();
      expect(result.address_a).toBe(MOCK_WALLETS.seed);
      expect(result.address_b).toBe(MOCK_WALLETS.smartMoney1);
      expect(result.common_counterparties).toBeDefined();
      expect(result.correlation_score).toBeDefined();
    });

    it('should return smart money labels for SM addresses', () => {
      const result = getMockData('profiler labels', ['--address', MOCK_WALLETS.smartMoney1]) as any[];
      expect(result).toBeInstanceOf(Array);
      expect(result[0].label).toBe('Smart Money');
      expect(result[0].category).toBe('Smart Money');
    });

    it('should return exchange labels for labeled addresses', () => {
      const result = getMockData('profiler labels', ['--address', MOCK_WALLETS.labeled1]) as any[];
      expect(result).toBeInstanceOf(Array);
      expect(result[0].label).toBe('Binance Hot Wallet');
    });

    it('should return protocol labels for labeled2', () => {
      const result = getMockData('profiler labels', ['--address', MOCK_WALLETS.labeled2]) as any[];
      expect(result).toBeInstanceOf(Array);
      expect(result[0].label).toBe('Aave Protocol');
    });

    it('should return contract labels for contracts', () => {
      const result = getMockData('profiler labels', ['--address', MOCK_WALLETS.contract1]) as any[];
      expect(result).toBeInstanceOf(Array);
      expect(result[0].label).toContain('Uniswap');
    });

    it('should return exploiter labels', () => {
      const result = getMockData('profiler labels', ['--address', MOCK_WALLETS.exploiter]) as any[];
      expect(result).toBeInstanceOf(Array);
      expect(result[0].label).toContain('Exploiter');
    });

    it('should return empty labels for unknown addresses', () => {
      const result = getMockData('profiler labels', ['--address', '0xunknown']) as any[];
      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBe(0);
    });

    it('should return balance data', () => {
      const result = getMockData('profiler balance', []) as any;
      expect(result).toBeDefined();
      expect(result.total_usd).toBeGreaterThan(0);
      expect(result.tokens).toBeInstanceOf(Array);
    });

    it('should return PnL summary data', () => {
      const result = getMockData('profiler pnl-summary', []) as any;
      expect(result).toBeDefined();
      expect(result.total_pnl_usd).toBeDefined();
      expect(result.win_rate).toBeDefined();
    });

    it('should return portfolio DeFi data', () => {
      const result = getMockData('portfolio defi', []) as any[];
      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('protocol');
    });

    it('should return web search data', () => {
      const result = getMockData('web search', []) as any[];
      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('title');
      expect(result[0]).toHaveProperty('url');
    });

    it('should return smart money netflow data', () => {
      const result = getMockData('smart-money netflow', []) as any[];
      expect(result).toBeInstanceOf(Array);
      expect(result[0]).toHaveProperty('token');
      expect(result[0]).toHaveProperty('netflow_usd');
    });

    it('should return token info data', () => {
      const result = getMockData('token info', []) as any;
      expect(result).toBeDefined();
      expect(result.symbol).toBe('ETH');
    });

    it('should return transaction data', () => {
      const result = getMockData('profiler transactions', []) as any[];
      expect(result).toBeInstanceOf(Array);
      expect(result[0]).toHaveProperty('hash');
    });

    it('should return token who-bought-sold data', () => {
      const result = getMockData('token who-bought-sold', []) as any[];
      expect(result).toBeInstanceOf(Array);
      expect(result[0]).toHaveProperty('side');
    });

    it('should return wallet show data', () => {
      const result = getMockData('wallet show', ['--address', '0xtest']) as any;
      expect(result).toBeDefined();
      expect(result.address).toBe('0xtest');
    });

    it('should return account data', () => {
      const result = getMockData('account', []) as any;
      expect(result).toBeDefined();
      expect(result.plan).toBe('pro');
    });

    it('should return schema data', () => {
      const result = getMockData('schema', []) as any;
      expect(result).toBeDefined();
      expect(result.endpoints).toBe(16);
    });

    it('should return null for unknown commands', () => {
      const result = getMockData('unknown-command', []);
      expect(result).toBeNull();
    });

    it('should handle missing arg values gracefully', () => {
      const result = getMockData('profiler trace', []) as any;
      expect(result).toBeDefined();
      expect(result.address).toBe(MOCK_WALLETS.seed); // falls back to default
    });

    it('should return compare defaults when args missing', () => {
      const result = getMockData('profiler compare', []) as any;
      expect(result.address_a).toBe(MOCK_WALLETS.seed);
      expect(result.address_b).toBe(MOCK_WALLETS.smartMoney1);
    });
  });
});
