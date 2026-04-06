import { describe, it, expect, vi, beforeEach } from 'vitest';
import { existsSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type { GraphData } from '../../src/types/graph.js';

import { renderGraph, generateHTML } from '../../src/lib/html-renderer.js';

function createMockGraphData(): GraphData {
  return {
    nodes: [
      { id: '0xseed', label: '0xseed...', type: 'seed', balance_usd: 1000000, pnl_30d: 50000, labels: ['Whale'], sm_labels: [], depth: 0, defi_protocols: 2 },
      { id: '0xfund', label: 'Fund A', type: 'smart-money', balance_usd: 5000000, pnl_30d: 200000, labels: ['Fund'], sm_labels: ['Smart Money'], depth: 1, defi_protocols: 5 },
      { id: '0xdex', label: 'Uniswap Router', type: 'contract', balance_usd: 0, pnl_30d: 0, labels: ['Contract'], sm_labels: [], depth: 1, defi_protocols: 0 },
    ],
    links: [
      { source: '0xseed', target: '0xfund', volume_usd: 250000, tx_count: 15, direction: 'outflow' },
      { source: '0xseed', target: '0xdex', volume_usd: 100000, tx_count: 42, direction: 'bidirectional' },
    ],
    meta: {
      seed: '0xseed1234567890',
      depth: 2,
      width: 10,
      chain: 'ethereum',
      api_calls: 15,
      cache_hits: 3,
      started_at: new Date().toISOString(),
      duration_ms: 4500,
      total_nodes: 3,
      total_edges: 2,
      smart_money_count: 1,
      labeled_count: 1,
    },
  };
}

describe('html-renderer', () => {
  describe('generateHTML', () => {
    it('should generate valid HTML document', () => {
      const data = createMockGraphData();
      const html = generateHTML(data);
      
      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('<html');
      expect(html).toContain('</html>');
    });

    it('should include graph data as JSON', () => {
      const data = createMockGraphData();
      const html = generateHTML(data);
      
      expect(html).toContain('0xseed');
      expect(html).toContain('0xfund');
      expect(html).toContain('"volume_usd"');
    });

    it('should include seed address in title', () => {
      const data = createMockGraphData();
      const html = generateHTML(data);
      
      expect(html).toContain('<title>RedString');
      expect(html).toContain('0xseed1234');
    });

    it('should include the cyberpunk color palette', () => {
      const html = generateHTML(createMockGraphData());
      
      expect(html).toContain('#FF2A2A'); // Neon Crimson (seed)
      expect(html).toContain('#FFD700'); // Cyber Gold (smart money)
      expect(html).toContain('#00F0FF'); // Neon Cyan (labeled)
      expect(html).toContain('#1E293B'); // Dim Slate (unknown)
      expect(html).toContain('#64748B'); // Muted Slate Gray (contract)
    });

    it('should include CDN script for 3d-force-graph', () => {
      const html = generateHTML(createMockGraphData());
      expect(html).toContain('unpkg.com/3d-force-graph');
    });

    it('should include CDN fallback', () => {
      const html = generateHTML(createMockGraphData());
      expect(html).toContain('cdnjs.cloudflare.com');
    });

    it('should include auto-orbit camera code', () => {
      const html = generateHTML(createMockGraphData());
      expect(html).toContain('autoOrbit');
      expect(html).toContain('Math.sin(angle)');
    });

    it('should include screenshot export shortcut', () => {
      const html = generateHTML(createMockGraphData());
      expect(html).toContain("key.toLowerCase() === 's'");
      expect(html).toContain('toDataURL');
    });

    it('should include detail panel and node click handler', () => {
      const html = generateHTML(createMockGraphData());
      expect(html).toContain('detail-panel');
      expect(html).toContain('showDetailPanel');
      expect(html).toContain('onNodeClick');
    });

    it('should include legend overlay', () => {
      const html = generateHTML(createMockGraphData());
      expect(html).toContain('legend');
      expect(html).toContain('Smart Money');
      expect(html).toContain('Target');
    });

    it('should include stats bar', () => {
      const html = generateHTML(createMockGraphData());
      expect(html).toContain('id="stats"');
      expect(html).toContain('Nodes');
      expect(html).toContain('Edges');
    });

    it('should include keyboard hints', () => {
      const html = generateHTML(createMockGraphData());
      expect(html).toContain('[S] Screenshot');
      expect(html).toContain('[R] Reset Camera');
      expect(html).toContain('[L] Toggle Labels');
    });

    it('should include money flow particles', () => {
      const html = generateHTML(createMockGraphData());
      expect(html).toContain('linkDirectionalParticles');
      expect(html).toContain('linkDirectionalParticleSpeed');
    });

    it('should include loading overlay', () => {
      const html = generateHTML(createMockGraphData());
      expect(html).toContain('id="loading"');
      expect(html).toContain('Initializing WebGL matrix');
    });
    
    it('should include meta stats', () => {
      const data = createMockGraphData();
      const html = generateHTML(data);
      expect(html).toContain(String(data.meta.total_nodes));
      expect(html).toContain(String(data.meta.total_edges));
      expect(html).toContain(String(data.meta.depth));
      expect(html).toContain('ETHEREUM');
    });

    it('should include preserveDrawingBuffer for screenshots', () => {
      const html = generateHTML(createMockGraphData());
      expect(html).toContain('preserveDrawingBuffer: true');
    });
  });

  describe('renderGraph', () => {
    it('should write HTML file and return path', () => {
      const data = createMockGraphData();
      const outputDir = join(tmpdir(), 'redstring-test-' + Date.now());
      
      try {
        const { mkdirSync } = require('node:fs');
        mkdirSync(outputDir, { recursive: true });
        
        const outputPath = renderGraph(data, outputDir);
        
        expect(outputPath).toContain('redstring-');
        expect(outputPath).toContain('.html');
        expect(existsSync(outputPath)).toBe(true);
        
        const content = readFileSync(outputPath, 'utf-8');
        expect(content).toContain('<!DOCTYPE html>');
        expect(content).toContain('0xseed');
      } finally {
        rmSync(outputDir, { recursive: true, force: true });
      }
    });

    it('should default to cwd when no outputDir specified', () => {
      const data = createMockGraphData();
      const outputPath = renderGraph(data);
      
      expect(outputPath).toContain(process.cwd());
      expect(existsSync(outputPath)).toBe(true);
      
      // Cleanup
      rmSync(outputPath, { force: true });
    });
  });
});
