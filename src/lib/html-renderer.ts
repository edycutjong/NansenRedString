/**
 * HTML Renderer — Compiles graph data into a self-contained 3D WebGL HTML file.
 *
 * The generated HTML uses 3d-force-graph via unpkg CDN for zero-build
 * interactive visualization. This IS the product — the money shot.
 *
 * Features:
 *  - Auto-orbit cinematic camera
 *  - Money flow particles on high-volume edges
 *  - Click-to-inspect node detail panel
 *  - Screenshot export (press 'S')
 *  - CDN fallback (unpkg → cdnjs)
 */

import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { GraphData } from '../types/graph.js';

// ---------------------------------------------------------------------------
// HTML Template
// ---------------------------------------------------------------------------

function generateHTML(data: GraphData): string {
  const jsonData = JSON.stringify(data, null, 2);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>RedString — ${data.meta.seed.slice(0, 10)}...</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      background: #0a0a0a;
      color: #e0e0e0;
      font-family: 'JetBrains Mono', 'SF Mono', 'Fira Code', monospace;
      overflow: hidden;
      height: 100vh;
    }

    /* Header */
    #header {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      z-index: 100;
      padding: 12px 20px;
      background: linear-gradient(180deg, rgba(10,10,10,0.95) 0%, rgba(10,10,10,0) 100%);
      display: flex;
      align-items: center;
      gap: 16px;
    }
    #header h1 {
      font-size: 16px;
      color: #FF2A2A;
      font-weight: 700;
      letter-spacing: 2px;
    }
    #header .meta {
      font-size: 11px;
      color: #64748B;
    }
    #header .meta span {
      color: #94a3b8;
      margin: 0 8px;
    }

    /* Legend */
    #legend {
      position: fixed;
      bottom: 20px;
      left: 20px;
      z-index: 100;
      font-size: 11px;
      display: flex;
      flex-direction: column;
      gap: 6px;
      background: rgba(10,10,10,0.75);
      backdrop-filter: blur(12px);
      padding: 12px 16px;
      border-radius: 6px;
      border: 1px solid rgba(255,42,42,0.2);
    }
    .legend-item {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .legend-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
    }

    /* Stats Bar */
    #stats {
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 100;
      font-size: 11px;
      background: rgba(10,10,10,0.75);
      backdrop-filter: blur(12px);
      padding: 12px 16px;
      border-radius: 6px;
      border: 1px solid rgba(255,42,42,0.2);
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .stat-row { display: flex; justify-content: space-between; gap: 24px; }
    .stat-label { color: #64748B; }
    .stat-value { color: #e0e0e0; font-weight: 600; }

    /* Detail Panel (Glassmorphism) */
    #detail-panel {
      position: fixed;
      top: 60px;
      right: 20px;
      z-index: 100;
      width: 320px;
      max-height: calc(100vh - 100px);
      overflow-y: auto;
      background: rgba(10,10,10,0.85);
      backdrop-filter: blur(16px);
      border-left: 3px solid #FF2A2A;
      border-radius: 6px;
      padding: 20px;
      display: none;
      font-size: 12px;
    }
    #detail-panel.visible { display: block; }
    #detail-panel h2 {
      font-size: 14px;
      color: #FF2A2A;
      margin-bottom: 12px;
      letter-spacing: 1px;
    }
    #detail-panel .detail-row {
      display: flex;
      justify-content: space-between;
      padding: 6px 0;
      border-bottom: 1px solid rgba(255,255,255,0.05);
    }
    #detail-panel .detail-label { color: #64748B; }
    #detail-panel .detail-value { color: #e0e0e0; font-weight: 500; text-align: right; max-width: 180px; word-break: break-all; }
    #detail-panel .tag {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 3px;
      font-size: 10px;
      margin: 2px;
    }
    #detail-panel .tag-sm { background: rgba(255,215,0,0.15); color: #FFD700; }
    #detail-panel .tag-label { background: rgba(0,240,255,0.15); color: #00F0FF; }
    #detail-panel .close-btn {
      position: absolute;
      top: 12px;
      right: 12px;
      cursor: pointer;
      color: #64748B;
      font-size: 16px;
    }
    #detail-panel .close-btn:hover { color: #FF2A2A; }

    /* Keyboard hints */
    #hints {
      position: fixed;
      top: 50px;
      left: 20px;
      z-index: 100;
      font-size: 10px;
      color: #475569;
    }

    /* Loading overlay */
    #loading {
      position: fixed;
      inset: 0;
      z-index: 200;
      background: #0a0a0a;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-direction: column;
      gap: 16px;
      transition: opacity 0.5s;
    }
    #loading.hidden { opacity: 0; pointer-events: none; }
    #loading h2 { color: #FF2A2A; font-size: 18px; letter-spacing: 3px; }
    .pulse { animation: pulse 1.5s infinite; }
    @keyframes pulse { 0%, 100% { opacity: 0.4; } 50% { opacity: 1; } }
  </style>
</head>
<body>
  <!-- Loading -->
  <div id="loading">
    <h2>REDSTRING</h2>
    <div class="pulse" style="color: #64748B; font-size: 12px;">Initializing WebGL matrix...</div>
  </div>

  <!-- Header -->
  <div id="header">
    <h1>REDSTRING</h1>
    <div class="meta">
      TARGET: <span>${data.meta.seed.slice(0, 10)}...</span>
      DEPTH: <span>${data.meta.depth}</span>
      CHAIN: <span>${data.meta.chain.toUpperCase()}</span>
      NODES: <span>${data.meta.total_nodes}</span>
    </div>
  </div>

  <!-- Keyboard Hints -->
  <div id="hints">
    [S] Screenshot &nbsp; [R] Reset Camera &nbsp; [L] Toggle Labels &nbsp; [Click] Inspect Node
  </div>

  <!-- Legend -->
  <div id="legend">
    <div class="legend-item"><div class="legend-dot" style="background:#FF2A2A;box-shadow:0 0 8px #FF2A2A;"></div> Target</div>
    <div class="legend-item"><div class="legend-dot" style="background:#FFD700;box-shadow:0 0 8px #FFD700;"></div> Smart Money</div>
    <div class="legend-item"><div class="legend-dot" style="background:#00F0FF;box-shadow:0 0 8px #00F0FF;"></div> Labeled Entity</div>
    <div class="legend-item"><div class="legend-dot" style="background:#1E293B;border:1px solid #334155;"></div> Unknown</div>
    <div class="legend-item"><div class="legend-dot" style="background:#64748B;"></div> Contract</div>
  </div>

  <!-- Stats -->
  <div id="stats">
    <div class="stat-row"><span class="stat-label">Nodes</span><span class="stat-value">${data.meta.total_nodes}</span></div>
    <div class="stat-row"><span class="stat-label">Edges</span><span class="stat-value">${data.meta.total_edges}</span></div>
    <div class="stat-row"><span class="stat-label">Smart Money</span><span class="stat-value" style="color:#FFD700">${data.meta.smart_money_count}</span></div>
    <div class="stat-row"><span class="stat-label">API Calls</span><span class="stat-value">${data.meta.api_calls}</span></div>
    <div class="stat-row"><span class="stat-label">Cache Hits</span><span class="stat-value" style="color:#22c55e">${data.meta.cache_hits}</span></div>
    <div class="stat-row"><span class="stat-label">Duration</span><span class="stat-value">${(data.meta.duration_ms / 1000).toFixed(1)}s</span></div>
  </div>

  <!-- Detail Panel -->
  <div id="detail-panel">
    <span class="close-btn" onclick="document.getElementById('detail-panel').classList.remove('visible')">✕</span>
    <h2>NODE INTEL</h2>
    <div id="detail-content"></div>
  </div>

  <!-- Graph Container -->
  <div id="graph"></div>

  <!-- 3D Force Graph (CDN with fallback) -->
  <script src="https://unpkg.com/3d-force-graph@1.73.3/dist/3d-force-graph.min.js"></script>
  <script>
    if (!window.ForceGraph3D) {
      document.write('<script src="https://cdnjs.cloudflare.com/ajax/libs/3d-force-graph/1.73.3/3d-force-graph.min.js"><\\/script>');
    }
  </script>
  <script>
    // Inject data
    const graphData = ${jsonData};

    // Color map
    const COLOR_MAP = {
      'seed':        '#FF2A2A',
      'smart-money': '#FFD700',
      'labeled':     '#00F0FF',
      'unknown':     '#1E293B',
      'contract':    '#64748B',
    };

    // Size: log-scale balance (min 3, max 18)
    function nodeSize(n) {
      if (n.type === 'seed') return 18;
      if (n.balance_usd <= 0) return 3;
      return Math.min(18, Math.max(3, Math.log10(n.balance_usd + 1) * 2.5));
    }

    // Initialize graph
    const Graph = ForceGraph3D({ rendererConfig: { preserveDrawingBuffer: true } })
      (document.getElementById('graph'))
      .graphData(graphData)
      .backgroundColor('#0a0a0a')
      .width(window.innerWidth)
      .height(window.innerHeight)
      // Nodes
      .nodeColor(n => COLOR_MAP[n.type] || '#1E293B')
      .nodeVal(n => nodeSize(n))
      .nodeLabel(n => n.label + (n.sm_labels && n.sm_labels.length > 0 ? ' [SM]' : ''))
      .nodeOpacity(0.9)
      // Edges
      .linkColor(d => d.direction === 'inflow' ? 'rgba(34,197,94,0.4)' : d.direction === 'outflow' ? 'rgba(239,68,68,0.4)' : 'rgba(148,163,184,0.25)')
      .linkWidth(d => Math.min(4, Math.max(0.5, Math.log10(d.volume_usd + 1) * 0.5)))
      .linkOpacity(0.6)
      // Particles (money flow on high-volume edges)
      .linkDirectionalParticles(d => d.volume_usd > 10000 ? 3 : 0)
      .linkDirectionalParticleSpeed(d => Math.log10(d.tx_count + 1) * 0.002)
      .linkDirectionalParticleWidth(1.5)
      .linkDirectionalParticleColor(d => d.direction === 'inflow' ? '#22c55e' : '#ef4444')
      // Physics
      .d3Force('charge', d3.forceManyBody().strength(-250))
      // Click handler
      .onNodeClick(node => {
        showDetailPanel(node);
        // Focus camera on clicked node
        const distance = 200;
        const distRatio = 1 + distance/Math.hypot(node.x, node.y, node.z);
        Graph.cameraPosition(
          { x: node.x * distRatio, y: node.y * distRatio, z: node.z * distRatio },
          node,
          1000
        );
      });

    // Auto-orbit (cinematic — for demo video)
    let angle = 0;
    let autoOrbit = true;
    const orbitInterval = setInterval(() => {
      if (!autoOrbit) return;
      Graph.cameraPosition({
        x: 600 * Math.sin(angle),
        z: 600 * Math.cos(angle)
      });
      angle += Math.PI / 1500;
    }, 16);

    // Stop orbit on user interaction
    document.getElementById('graph').addEventListener('mousedown', () => { autoOrbit = false; });

    // Keyboard shortcuts
    let showLabels = true;
    document.addEventListener('keydown', e => {
      // S = Screenshot
      if (e.key.toLowerCase() === 's' && !e.ctrlKey && !e.metaKey) {
        const link = document.createElement('a');
        link.download = 'redstring-' + graphData.meta.seed.slice(0, 10) + '.png';
        link.href = document.querySelector('canvas').toDataURL('image/png');
        link.click();
      }
      // R = Reset Camera
      if (e.key.toLowerCase() === 'r') {
        autoOrbit = true;
        angle = 0;
      }
      // L = Toggle Labels
      if (e.key.toLowerCase() === 'l') {
        showLabels = !showLabels;
        Graph.nodeLabel(showLabels ? (n => n.label) : (() => ''));
      }
    });

    // Detail Panel
    function showDetailPanel(node) {
      const panel = document.getElementById('detail-panel');
      const content = document.getElementById('detail-content');

      let html = '';
      html += detailRow('Address', node.id);
      html += detailRow('Label', node.label);
      html += detailRow('Type', node.type.toUpperCase());
      html += detailRow('Depth', node.depth);
      html += detailRow('Balance', formatUSD(node.balance_usd));
      html += detailRow('PnL (30d)', formatUSD(node.pnl_30d));
      html += detailRow('DeFi Protocols', node.defi_protocols || 0);

      if (node.labels && node.labels.length > 0) {
        html += '<div style="margin-top:12px;margin-bottom:4px;color:#64748B;">Labels</div>';
        html += node.labels.map(l => '<span class="tag tag-label">' + l + '</span>').join('');
      }
      if (node.sm_labels && node.sm_labels.length > 0) {
        html += '<div style="margin-top:12px;margin-bottom:4px;color:#64748B;">Smart Money</div>';
        html += node.sm_labels.map(l => '<span class="tag tag-sm">' + l + '</span>').join('');
      }

      // Copy button
      html += '<div style="margin-top:16px;text-align:center;">';
      html += '<button onclick="navigator.clipboard.writeText(\\'' + node.id + '\\')" style="background:rgba(255,42,42,0.15);color:#FF2A2A;border:1px solid rgba(255,42,42,0.3);padding:6px 16px;border-radius:4px;cursor:pointer;font-family:inherit;font-size:11px;">Copy Address</button>';
      html += '</div>';

      content.innerHTML = html;
      panel.classList.add('visible');
    }

    function detailRow(label, value) {
      return '<div class="detail-row"><span class="detail-label">' + label + '</span><span class="detail-value">' + value + '</span></div>';
    }

    function formatUSD(v) {
      if (Math.abs(v) >= 1e6) return '$' + (v/1e6).toFixed(1) + 'M';
      if (Math.abs(v) >= 1e3) return '$' + (v/1e3).toFixed(1) + 'K';
      return '$' + v.toFixed(0);
    }

    // Hide loading after render
    setTimeout(() => {
      document.getElementById('loading').classList.add('hidden');
    }, 1500);

    // Resize handler
    window.addEventListener('resize', () => {
      Graph.width(window.innerWidth).height(window.innerHeight);
    });
  </script>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Renderer
// ---------------------------------------------------------------------------

export function renderGraph(data: GraphData, outputDir?: string): string {
  const html = generateHTML(data);
  const filename = `redstring-${data.meta.seed.slice(0, 10)}-${Date.now()}.html`;
  const outputPath = join(outputDir || process.cwd(), filename);
  writeFileSync(outputPath, html);
  return outputPath;
}

export { generateHTML };
