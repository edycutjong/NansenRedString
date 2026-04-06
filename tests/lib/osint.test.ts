import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/lib/nansen.js', () => ({
  fetchWebSearch: vi.fn(),
}));

import { gatherOsint } from '../../src/lib/osint.js';
import { fetchWebSearch } from '../../src/lib/nansen.js';

const mockSearch = fetchWebSearch as ReturnType<typeof vi.fn>;

describe('osint', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return parsed OSINT results', async () => {
    mockSearch.mockResolvedValue({
      success: true,
      data: [
        { title: 'Report A', url: 'https://a.com', snippet: 'snippet A', source: 'etherscan' },
        { title: 'Report B', url: 'https://b.com', snippet: 'snippet B', source: 'twitter' },
      ],
    });

    const results = await gatherOsint('0x123');
    expect(results).toHaveLength(2);
    expect(results[0].title).toBe('Report A');
    expect(results[0].url).toBe('https://a.com');
    expect(results[0].snippet).toBe('snippet A');
    expect(results[0].source).toBe('etherscan');
  });

  it('should return empty array on API failure', async () => {
    mockSearch.mockResolvedValue({ success: false, error: 'timeout' });
    const results = await gatherOsint('0x456');
    expect(results).toEqual([]);
  });

  it('should return empty array when data is null', async () => {
    mockSearch.mockResolvedValue({ success: true, data: null });
    const results = await gatherOsint('0x789');
    expect(results).toEqual([]);
  });

  it('should return empty array when data is not an array', async () => {
    mockSearch.mockResolvedValue({ success: true, data: 'not-array' });
    const results = await gatherOsint('0xabc');
    expect(results).toEqual([]);
  });

  it('should handle missing fields with defaults', async () => {
    mockSearch.mockResolvedValue({
      success: true,
      data: [{ /* all fields missing */ }],
    });

    const results = await gatherOsint('0xdef');
    expect(results).toHaveLength(1);
    expect(results[0].title).toBe('Unknown');
    expect(results[0].url).toBe('');
    expect(results[0].snippet).toBe('');
    expect(results[0].source).toBe('web');
  });
});
