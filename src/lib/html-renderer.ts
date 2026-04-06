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
  <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' rx='20' fill='%23050508'/><circle cx='50' cy='50' r='25' fill='%23FF2A2A'/><circle cx='50' cy='50' r='35' fill='none' stroke='%23FF2A2A' stroke-width='4' stroke-dasharray='10 6'/></svg>">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;600;700&family=Orbitron:wght@400;700;900&display=swap" rel="stylesheet">
  <style>
    :root {
      --red: #FF2A2A;
      --red-glow: rgba(255, 42, 42, 0.6);
      --gold: #FFD700;
      --cyan: #00F0FF;
      --bg: #050508;
      --bg2: #0a0a10;
      --slate: #64748B;
      --text: #e2e8f0;
    }

    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      background: var(--bg);
      color: var(--text);
      font-family: 'JetBrains Mono', monospace;
      overflow: hidden;
      height: 100vh;
    }

    /* ═══════════════════════════════════════════════════════════
       CINEMATIC BOOT SEQUENCE
       ═══════════════════════════════════════════════════════════ */
    body::after {
      content: ''; position: fixed; inset: 0; pointer-events: none; z-index: 9999;
      background: url('data:image/svg+xml;utf8,<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><filter id="noiseFilter"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3" stitchTiles="stitch"/></filter><rect width="100%" height="100%" filter="url(%23noiseFilter)"/></svg>');
      opacity: 0.03; mix-blend-mode: overlay;
    }

    #loading {
      position: fixed; inset: 0; z-index: 1000;
      background: var(--bg);
      display: flex; align-items: center; justify-content: center; flex-direction: column;
      transition: all 0.8s cubic-bezier(0.19, 1, 0.22, 1);
    }
    #loading.hidden { opacity: 0; transform: scale(1.5); filter: blur(10px); pointer-events: none; }

    #flash-bang {
      position: fixed; inset: 0; z-index: 999;
      background: linear-gradient(135deg, #FF2A2A, #00F0FF);
      mix-blend-mode: screen;
      opacity: 0; pointer-events: none;
      transition: opacity 1.5s ease-out;
    }
    #flash-bang.fire {
      opacity: 0.9;
      transition: none;
    }

    /* Scanline overlay */
    #loading::before {
      content: ''; position: absolute; inset: 0; z-index: 1;
      background: repeating-linear-gradient(
        0deg, transparent, transparent 2px, rgba(255,42,42,0.03) 2px, rgba(255,42,42,0.03) 4px
      );
      pointer-events: none;
      animation: scanline-scroll 8s linear infinite;
    }
    @keyframes scanline-scroll { to { background-position-y: 100vh; } }

    .boot-logo {
      font-family: 'Orbitron', sans-serif;
      font-size: 48px; font-weight: 900;
      color: var(--red);
      letter-spacing: 12px;
      text-shadow: 0 0 40px var(--red-glow), 0 0 80px rgba(255,42,42,0.3);
      position: relative; z-index: 2;
      animation: glitch-text 3s infinite;
    }
    @keyframes glitch-text {
      0%, 92%, 100% { transform: none; opacity: 1; filter: hue-rotate(0deg); }
      93% { transform: translate(-8px, 4px) skewX(-15deg); opacity: 0.8; filter: hue-rotate(90deg); text-shadow: -4px 0 var(--cyan), 4px 0 var(--red); }
      94% { transform: translate(6px, -4px) skewX(10deg); opacity: 0.9; text-shadow: 4px 0 var(--cyan), -4px 0 var(--red); }
      95% { transform: none; opacity: 1; filter: hue-rotate(0deg); }
    }

    .boot-sub {
      font-size: 11px; color: var(--slate); letter-spacing: 4px;
      margin-top: 20px; z-index: 2; position: relative;
    }

    .boot-progress {
      width: 280px; height: 2px;
      background: rgba(255,42,42,0.1);
      margin-top: 32px; z-index: 2; position: relative;
      border-radius: 2px; overflow: hidden;
    }
    .boot-progress-bar {
      height: 100%; width: 0%;
      background: linear-gradient(90deg, var(--red), #ff6b6b);
      box-shadow: 0 0 12px var(--red-glow);
      transition: width 0.3s ease;
    }

    .boot-terminal {
      margin-top: 24px; z-index: 2; position: relative;
      font-size: 10px; color: rgba(100,116,139,0.6);
      text-align: left; width: 280px;
      min-height: 60px;
    }
    .boot-line {
      opacity: 0; animation: boot-fade 0.3s forwards;
    }
    .boot-line::before {
      content: '› '; color: var(--red); opacity: 0.5;
    }
    @keyframes boot-fade { to { opacity: 1; } }

    /* ═══════════════════════════════════════════════════════════
       HEADER — HUD STYLE
       ═══════════════════════════════════════════════════════════ */
    #header {
      position: fixed; top: 0; left: 0; right: 0; z-index: 100;
      padding: 16px 24px;
      background: linear-gradient(180deg, rgba(5,5,8,0.98) 0%, rgba(5,5,8,0.8) 60%, transparent 100%);
      display: flex; align-items: center; gap: 20px;
      border-bottom: 1px solid rgba(255,42,42,0.08);
      opacity: 0; transform: translateY(-20px);
      transition: all 0.8s cubic-bezier(0.4, 0, 0.2, 1);
    }
    #header.visible { opacity: 1; transform: translateY(0); }

    #header h1 {
      font-family: 'Orbitron', sans-serif;
      font-size: 14px; color: var(--red); font-weight: 700;
      letter-spacing: 4px;
      text-shadow: 0 0 20px var(--red-glow);
    }
    .header-divider {
      width: 1px; height: 20px;
      background: linear-gradient(180deg, transparent, rgba(255,42,42,0.3), transparent);
    }
    #header .meta {
      font-size: 10px; color: var(--slate);
      display: flex; gap: 20px;
    }
    .meta-item { display: flex; align-items: center; gap: 6px; }
    .meta-key { color: rgba(100,116,139,0.6); text-transform: uppercase; letter-spacing: 1px; }
    .meta-val {
      color: var(--text); font-weight: 500;
      padding: 2px 8px;
      background: rgba(255,42,42,0.06);
      border: 1px solid rgba(255,42,42,0.1);
      border-radius: 3px;
    }
    .meta-val.highlight { color: var(--red); border-color: rgba(255,42,42,0.25); }

    /* ═══════════════════════════════════════════════════════════
       UI PANELS — GLASSMORPHISM
       ═══════════════════════════════════════════════════════════ */
    .glass-panel {
      background: rgba(5,5,12,0.8);
      backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
      border: 1px solid rgba(255,42,42,0.12);
      border-radius: 8px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.03);
      opacity: 0; transform: translateY(10px);
      transition: all 0.6s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .glass-panel.visible { opacity: 1; transform: translateY(0); }

    /* Legend */
    #legend {
      position: fixed; bottom: 24px; left: 24px; z-index: 100;
      padding: 16px 20px; font-size: 11px;
      display: flex; flex-direction: column; gap: 8px;
    }
    .legend-title {
      font-family: 'Orbitron', sans-serif;
      font-size: 9px; color: var(--red); letter-spacing: 2px;
      margin-bottom: 4px; opacity: 0.7;
    }
    .legend-item { display: flex; align-items: center; gap: 10px; }
    .legend-dot {
      width: 8px; height: 8px; border-radius: 50%;
      position: relative;
    }
    .legend-dot::after {
      content: ''; position: absolute; inset: -3px;
      border-radius: 50%; opacity: 0.3;
      background: inherit; filter: blur(4px);
    }

    /* Stats */
    #stats {
      position: fixed; bottom: 24px; right: 24px; z-index: 100;
      padding: 16px 20px; font-size: 11px;
      display: flex; flex-direction: column; gap: 6px;
    }
    .stats-title {
      font-family: 'Orbitron', sans-serif;
      font-size: 9px; color: var(--red); letter-spacing: 2px;
      margin-bottom: 4px; opacity: 0.7;
    }
    .stat-row { display: flex; justify-content: space-between; gap: 32px; }
    .stat-label { color: var(--slate); font-size: 10px; }
    .stat-value {
      color: var(--text); font-weight: 600; font-size: 12px;
      font-variant-numeric: tabular-nums;
    }
    .stat-value.gold { color: var(--gold); }
    .stat-value.green { color: #22c55e; }

    /* Keyboard hints */
    #hints {
      position: fixed; top: 60px; left: 24px; z-index: 100;
      font-size: 10px; color: rgba(100,116,139,0.4);
      opacity: 0; transition: opacity 0.8s 1.5s;
    }
    #hints.visible { opacity: 1; }
    .hint-key {
      display: inline-block; padding: 1px 6px;
      border: 1px solid rgba(100,116,139,0.2);
      border-radius: 3px; margin-right: 2px;
      color: rgba(100,116,139,0.6);
    }
    .hint-sep { margin: 0 10px; opacity: 0.3; }

    /* ═══════════════════════════════════════════════════════════
       DETAIL PANEL
       ═══════════════════════════════════════════════════════════ */
    #detail-panel {
      position: fixed; top: 70px; right: 24px; z-index: 100;
      width: 340px; max-height: calc(100vh - 110px);
      overflow-y: auto;
      background: rgba(5,5,12,0.9);
      backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px);
      border: 1px solid rgba(255,42,42,0.15);
      border-left: 3px solid var(--red);
      border-radius: 8px;
      padding: 24px;
      display: none; font-size: 12px;
      box-shadow: 0 16px 48px rgba(0,0,0,0.5), 0 0 40px rgba(255,42,42,0.05);
      animation: panel-slide 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    }
    @keyframes panel-slide {
      from { opacity: 0; transform: translateX(20px); }
      to { opacity: 1; transform: translateX(0); }
    }
    #detail-panel.visible { display: block; }
    #detail-panel h2 {
      font-family: 'Orbitron', sans-serif;
      font-size: 11px; color: var(--red);
      margin-bottom: 16px; letter-spacing: 3px;
    }
    #detail-panel .detail-row {
      display: flex; justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid rgba(255,255,255,0.04);
    }
    #detail-panel .detail-label { color: var(--slate); font-size: 10px; }
    #detail-panel .detail-value {
      color: var(--text); font-weight: 500;
      text-align: right; max-width: 190px; word-break: break-all;
    }
    #detail-panel .tag {
      display: inline-block; padding: 3px 10px;
      border-radius: 4px; font-size: 10px; margin: 2px;
      font-weight: 500;
    }
    #detail-panel .tag-sm {
      background: rgba(255,215,0,0.1); color: var(--gold);
      border: 1px solid rgba(255,215,0,0.2);
    }
    #detail-panel .tag-label {
      background: rgba(0,240,255,0.1); color: var(--cyan);
      border: 1px solid rgba(0,240,255,0.2);
    }
    #detail-panel .close-btn {
      position: absolute; top: 16px; right: 16px;
      cursor: pointer; color: var(--slate); font-size: 14px;
      width: 24px; height: 24px; display: flex; align-items: center; justify-content: center;
      border-radius: 4px; transition: all 0.2s;
    }
    #detail-panel .close-btn:hover {
      color: var(--red); background: rgba(255,42,42,0.1);
    }

    /* ═══════════════════════════════════════════════════════════
       INTERACTIVE FOOTER
       ═══════════════════════════════════════════════════════════ */
    #footer-bar {
      position: fixed; bottom: 0; left: 0; right: 0; z-index: 99;
      height: 2px;
      background: linear-gradient(90deg, transparent, var(--red), transparent);
      opacity: 0.3;
    }

    /* ═══════════════════════════════════════════════════════════
       AMBIENT VFX
       ═══════════════════════════════════════════════════════════ */
    #vignette {
      position: fixed; inset: 0; z-index: 50; pointer-events: none;
      background: radial-gradient(ellipse at center, transparent 40%, rgba(5,5,8,0.6) 100%);
    }

    /* Corner brackets */
    .corner-bracket {
      position: fixed; z-index: 90; pointer-events: none;
      width: 30px; height: 30px;
      opacity: 0; transition: opacity 0.6s 0.8s;
    }
    .corner-bracket.visible { opacity: 0.15; }
    .corner-bracket.tl { top: 10px; left: 10px; border-top: 1px solid var(--red); border-left: 1px solid var(--red); }
    .corner-bracket.tr { top: 10px; right: 10px; border-top: 1px solid var(--red); border-right: 1px solid var(--red); }
    .corner-bracket.bl { bottom: 10px; left: 10px; border-bottom: 1px solid var(--red); border-left: 1px solid var(--red); }
    .corner-bracket.br { bottom: 10px; right: 10px; border-bottom: 1px solid var(--red); border-right: 1px solid var(--red); }

    /* Pulse ring on target node */
    @keyframes ring-pulse {
      0% { box-shadow: 0 0 0 0 rgba(255,42,42,0.4); }
      100% { box-shadow: 0 0 0 20px rgba(255,42,42,0); }
    }

    /* Scrollbar */
    ::-webkit-scrollbar { width: 4px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: rgba(255,42,42,0.2); border-radius: 2px; }
  </style>
</head>
<body>

  <!-- Cinematic Boot Sequence -->
  <div id="loading">
    <div class="boot-logo">REDSTRING</div>
    <div class="boot-sub">FORENSIC GRAPH ENGINE</div>
    <div class="boot-progress"><div class="boot-progress-bar" id="boot-bar"></div></div>
    <div class="boot-terminal" id="boot-terminal"></div>
  </div>

  <div id="flash-bang"></div>

  <!-- Ambient VFX -->
  <div id="vignette"></div>
  <div class="corner-bracket tl"></div>
  <div class="corner-bracket tr"></div>
  <div class="corner-bracket bl"></div>
  <div class="corner-bracket br"></div>
  <div id="footer-bar"></div>

  <!-- Header -->
  <div id="header">
    <h1>REDSTRING</h1>
    <div class="header-divider"></div>
    <div class="meta">
      <div class="meta-item"><span class="meta-key">Target</span><span class="meta-val highlight">${data.meta.seed.slice(0, 10)}...</span></div>
      <div class="meta-item"><span class="meta-key">Depth</span><span class="meta-val">${data.meta.depth}</span></div>
      <div class="meta-item"><span class="meta-key">Chain</span><span class="meta-val">${data.meta.chain.toUpperCase()}</span></div>
      <div class="meta-item"><span class="meta-key">Nodes</span><span class="meta-val">${data.meta.total_nodes}</span></div>
    </div>
  </div>

  <!-- Keyboard Hints -->
  <div id="hints">
    <span class="hint-key">S</span> Screenshot<span class="hint-sep">·</span>
    <span class="hint-key">R</span> Reset<span class="hint-sep">·</span>
    <span class="hint-key">L</span> Labels<span class="hint-sep">·</span>
    <span class="hint-key">Click</span> Inspect
  </div>

  <!-- Legend -->
  <div id="legend" class="glass-panel">
    <div class="legend-title">ENTITY TYPES</div>
    <div class="legend-item"><div class="legend-dot" style="background:#FF2A2A;"></div> Target</div>
    <div class="legend-item"><div class="legend-dot" style="background:#FFD700;"></div> Smart Money</div>
    <div class="legend-item"><div class="legend-dot" style="background:#00F0FF;"></div> Labeled Entity</div>
    <div class="legend-item"><div class="legend-dot" style="background:#334155;"></div> Unknown</div>
    <div class="legend-item"><div class="legend-dot" style="background:#64748B;"></div> Contract</div>
  </div>

  <!-- Stats -->
  <div id="stats" class="glass-panel">
    <div class="stats-title">TELEMETRY</div>
    <div class="stat-row"><span class="stat-label">Nodes</span><span class="stat-value" data-count="${data.meta.total_nodes}">0</span></div>
    <div class="stat-row"><span class="stat-label">Edges</span><span class="stat-value" data-count="${data.meta.total_edges}">0</span></div>
    <div class="stat-row"><span class="stat-label">Smart Money</span><span class="stat-value gold" data-count="${data.meta.smart_money_count}">0</span></div>
    <div class="stat-row"><span class="stat-label">API Calls</span><span class="stat-value" data-count="${data.meta.api_calls}">0</span></div>
    <div class="stat-row"><span class="stat-label">Cache Hits</span><span class="stat-value green" data-count="${data.meta.cache_hits}">0</span></div>
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

  <!-- Dependencies -->
  <!-- Dependencies -->
  <script src="https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/d3-force-3d@3/dist/d3-force-3d.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/3d-force-graph@1.73.3/dist/3d-force-graph.min.js"></script>
  <script>
    /* ═══════════════════════════════════════════════════════
       BOOT SEQUENCE
       ═══════════════════════════════════════════════════════ */
    const bootLines = [
      'loading nansen api bridge...',
      'handshake: research.profiler.trace',
      'traversal depth: ${data.meta.depth} — ${data.meta.total_nodes} entities',
      'enrichment pipeline: labels, balance, pnl',
      'smart money scan: ${data.meta.smart_money_count} flagged',
      'compiling webgl force matrix...',
      'injecting ${data.meta.total_edges} edges',
      'ready.'
    ];

    const bootBar = document.getElementById('boot-bar');
    const bootTerm = document.getElementById('boot-terminal');
    let bootIdx = 0;

    function bootTick() {
      if (bootIdx >= bootLines.length) {
        bootBar.style.width = '100%';
        setTimeout(initGraph, 400);
        return;
      }
      const pct = ((bootIdx + 1) / bootLines.length * 100);
      bootBar.style.width = pct + '%';

      const line = document.createElement('div');
      line.className = 'boot-line';
      line.style.animationDelay = '0s';
      line.textContent = bootLines[bootIdx];
      bootTerm.appendChild(line);

      // Keep only last 4 lines visible
      while (bootTerm.children.length > 4) {
        bootTerm.removeChild(bootTerm.firstChild);
      }

      bootIdx++;
      setTimeout(bootTick, 180 + Math.random() * 120);
    }
    setTimeout(bootTick, 600);

    /* ═══════════════════════════════════════════════════════
       GRAPH INIT
       ═══════════════════════════════════════════════════════ */
    /* ═══════════════════════════════════════════════════════
       AUDIO SYNTH ENGINE
       ═══════════════════════════════════════════════════════ */
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    function playBeep(freq, type, duration, vol) {
      if (audioCtx.state === 'suspended') audioCtx.resume();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = type; osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
      gain.gain.setValueAtTime(vol, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
      osc.connect(gain); gain.connect(audioCtx.destination);
      osc.start(); osc.stop(audioCtx.currentTime + duration);
    }

    const graphData = ${jsonData};

    const COLOR_MAP = {
      'seed':        '#FF2A2A',
      'smart-money': '#FFD700',
      'labeled':     '#00F0FF',
      'unknown':     '#e2e8f0',
      'contract':    '#64748B',
    };

    const GLOW_MAP = {
      'seed':        'rgba(255,42,42,0.5)',
      'smart-money': 'rgba(255,215,0,0.4)',
      'labeled':     'rgba(0,240,255,0.4)',
      'unknown':     'rgba(30,41,59,0.2)',
      'contract':    'rgba(100,116,139,0.3)',
    };

    function nodeSize(n) {
      if (n.type === 'seed') return 22;
      if (n.balance_usd <= 0) return 4;
      return Math.min(20, Math.max(4, Math.log10(n.balance_usd + 1) * 3));
    }

    let Graph;
    const spinningNodes = new Set(); // To hold custom geometries for animation

    function initGraph() {
      const THREE = window.THREE;

      Graph = ForceGraph3D({ rendererConfig: { preserveDrawingBuffer: true, antialias: true, alpha: true } })
        (document.getElementById('graph'))
        .graphData(graphData)
        .backgroundColor('#050508')
        .width(window.innerWidth)
        .height(window.innerHeight)
        // Custom 3D nodes with glow
        .nodeThreeObject(node => {
          const group = new THREE.Group();
          const color = COLOR_MAP[node.type] || '#1E293B';
          const size = nodeSize(node);
          
          let geo;
          if (node.type === 'seed') {
            geo = new THREE.IcosahedronGeometry(size * 0.7, 0);
          } else if (node.type === 'smart-money') {
            geo = new THREE.OctahedronGeometry(size * 0.8, 0);
          } else {
            geo = new THREE.SphereGeometry(size * 0.6, 16, 16);
          }

          const mat = new THREE.MeshPhongMaterial({
            color: new THREE.Color(color),
            emissive: new THREE.Color(color),
            emissiveIntensity: node.type === 'seed' || node.type === 'smart-money' ? 0.8 : 0.4,
            shininess: 100,
            transparent: true,
            opacity: 0.9,
            flatShading: node.type === 'seed' || node.type === 'smart-money'
          });
          const core = new THREE.Mesh(geo, mat);
          group.add(core);

          // Outer wireframe/glow shell
          if (node.type === 'seed' || node.type === 'smart-money') {
            const wireGeo = new THREE.IcosahedronGeometry(size * 1.1, 1);
            const wireMat = new THREE.MeshBasicMaterial({
              color: new THREE.Color(color), wireframe: true, transparent: true, opacity: 0.2
            });
            const wire = new THREE.Mesh(wireGeo, wireMat);
            group.add(wire);
            spinningNodes.add(group);
          } else {
            const glowGeo = new THREE.SphereGeometry(size * 0.9, 16, 16);
            const glowMat = new THREE.MeshBasicMaterial({
              color: new THREE.Color(color), transparent: true, opacity: 0.08
            });
            const glow = new THREE.Mesh(glowGeo, glowMat);
            group.add(glow);
          }

          // Pulse ring for seed node
          if (node.type === 'seed') {
            const ringGeo = new THREE.RingGeometry(size * 1.0, size * 1.2, 32);
            const ringMat = new THREE.MeshBasicMaterial({
              color: 0xFF2A2A, transparent: true, opacity: 0.2, side: THREE.DoubleSide
            });
            const ring = new THREE.Mesh(ringGeo, ringMat);
            ring.userData.isRing = true;
            group.add(ring);
          }

          return group;
        })
        .nodeLabel(n => '')
        // Tooltip
        .onNodeHover((node, prevNode) => {
          document.body.style.cursor = node ? 'pointer' : 'default';
          const tooltip = document.getElementById('hover-tooltip');
          if (node) {
            if (node !== prevNode) playBeep(node.type === 'seed' ? 600 : node.type === 'smart-money' ? 800 : 400, 'sine', 0.1, 0.05);
            tooltip.innerHTML = '<strong>' + node.label + '</strong>' +
              (node.sm_labels && node.sm_labels.length > 0 ? ' <span style="color:#FFD700;">★ SM</span>' : '') +
              '<br><span style="color:#64748B;">' + formatUSD(node.balance_usd) + '</span>';
            tooltip.style.display = 'block';
          } else {
            tooltip.style.display = 'none';
          }
        })
        // Edges
        .linkColor(d => d.direction === 'inflow' ? 'rgba(34,197,94,0.35)' : d.direction === 'outflow' ? 'rgba(239,68,68,0.35)' : 'rgba(100,116,139,0.15)')
        .linkWidth(d => Math.min(3, Math.max(0.3, Math.log10(d.volume_usd + 1) * 0.4)))
        .linkOpacity(0.5)
        // Particles (money flow)
        .linkDirectionalParticles(d => d.volume_usd > 10000 ? 5 : d.volume_usd > 1000 ? 3 : d.volume_usd > 0 ? 1 : 0)
        .linkDirectionalParticleSpeed(d => Math.log10(d.tx_count + 1) * 0.003)
        .linkDirectionalParticleWidth(3) // Fatter particles
        .linkDirectionalParticleColor(d => d.direction === 'inflow' ? '#22c55e' : '#ef4444')
        .warmupTicks(200)
        .cooldownTicks(50); // Give it a short decay instead of 0 which might fallback to Infinity

      // Physics
      Graph.d3Force('charge').strength(-400).distanceMax(800);
      Graph.d3Force('link').distance(120); // Give nodes room to breathe
      Graph.d3VelocityDecay(0.8); // High friction (decay) to quickly stop simulation jittering

      // Click handler
      Graph.onNodeClick(node => {
        playBeep(300, 'square', 0.3, 0.1);
        showDetailPanel(node);
        const distance = 180;
        const distRatio = 1 + distance/Math.hypot(node.x, node.y, node.z);
        Graph.cameraPosition(
          { x: node.x * distRatio, y: node.y * distRatio, z: node.z * distRatio },
          node, 1200
        );
      });

      // Add ambient light for node materials
      const scene = Graph.scene();
      
      // Cyberpunk deep fog
      scene.fog = new THREE.FogExp2('#050508', 0.0006);
      
      // Tactical Grid Floor
      const grid = new THREE.PolarGridHelper(3000, 32, 16, 64, '#FF2A2A', '#1E293B');
      grid.position.y = -600;
      grid.material.transparent = true;
      grid.material.opacity = 0.2;
      scene.add(grid);

      const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
      scene.add(ambientLight);
      const dirLight = new THREE.DirectionalLight(0xffffff, 0.4);
      dirLight.position.set(100, 200, 100);
      scene.add(dirLight);

      // Add starfield particles
      const starGeo = new THREE.BufferGeometry();
      const starCount = 1500;
      const starPos = new Float32Array(starCount * 3);
      for (let i = 0; i < starCount * 3; i++) {
        starPos[i] = (Math.random() - 0.5) * 3000;
      }
      starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
      const starMat = new THREE.PointsMaterial({
        color: 0x334155, size: 1.5, transparent: true, opacity: 0.4
      });
      const stars = new THREE.Points(starGeo, starMat);
      scene.add(stars);

      // ── Cinematic intro camera ──
      Graph.cameraPosition({ x: 0, y: 1500, z: 8000 }); // Start extremely far back for a hyperdrive effect
      // The swoop will be triggered in the Reveal UI block

      // Auto-orbit synced to actual monitor refresh rate to eliminate jitter
      let angle = 0;
      let autoOrbit = true;
      
      const renderTick = () => {
        if (autoOrbit) {
          // Pin lookAt to 0,0,0 so internal graph forces don't shake the camera
          Graph.cameraPosition({
            x: 550 * Math.sin(angle),
            y: 80 * Math.sin(angle * 0.7),
            z: 550 * Math.cos(angle)
          }, { x: 0, y: 0, z: 0 });
          angle += Math.PI / 1800;
        }

        // Rotate starfield & grid slowly
        stars.rotation.y += 0.0001;
        stars.rotation.x += 0.00005;
        grid.rotation.y -= 0.0002;

        // Animate custom geometry hype-structures
        spinningNodes.forEach(mesh => {
            mesh.rotation.x += 0.005;
            mesh.rotation.y += 0.008;
            mesh.rotation.z += 0.004;
        });
        
        requestAnimationFrame(renderTick);
      };
      requestAnimationFrame(renderTick);

      document.getElementById('graph').addEventListener('mousedown', () => { autoOrbit = false; });

      // Keyboard shortcuts
      let showLabels = true;
      document.addEventListener('keydown', e => {
        if (e.key.toLowerCase() === 's' && !e.ctrlKey && !e.metaKey) {
          const link = document.createElement('a');
          link.download = 'redstring-' + graphData.meta.seed.slice(0, 10) + '.png';
          link.href = document.querySelector('canvas').toDataURL('image/png');
          link.click();
        }
        if (e.key.toLowerCase() === 'r') { autoOrbit = true; angle = 0; }
        if (e.key.toLowerCase() === 'l') {
          showLabels = !showLabels;
          // Toggle 3D labels could be added here
        }
      });

      // ── Reveal UI ──
      setTimeout(() => {
        // ⚡ FIRE FLASH-BANG WOW EFFECT ⚡
        const flash = document.getElementById('flash-bang');
        if (flash) {
          flash.classList.add('fire');
          setTimeout(() => flash.classList.remove('fire'), 50);
        }

        // SWOOP CAMERA IN (HYPER SCROLL)
        Graph.cameraPosition({ x: 400, y: 200, z: 600 }, { x: 0, y: 0, z: 0 }, 3000);

        document.getElementById('loading').classList.add('hidden');
      }, 300);
      setTimeout(() => {
        document.getElementById('header').classList.add('visible');
        document.querySelectorAll('.corner-bracket').forEach(el => el.classList.add('visible'));
      }, 800);
      setTimeout(() => {
        document.getElementById('hints').classList.add('visible');
        document.querySelectorAll('.glass-panel').forEach(el => el.classList.add('visible'));
        animateCounters();
      }, 1200);
    }

    /* ═══════════════════════════════════════════════════════
       ANIMATED STAT COUNTERS
       ═══════════════════════════════════════════════════════ */
    function animateCounters() {
      document.querySelectorAll('.stat-value[data-count]').forEach(el => {
        const target = parseInt(el.dataset.count);
        const duration = 1200;
        const start = performance.now();
        function tick(now) {
          const elapsed = now - start;
          const pct = Math.min(elapsed / duration, 1);
          const eased = 1 - Math.pow(1 - pct, 3);
          el.textContent = Math.round(target * eased);
          if (pct < 1) requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
      });
    }

    /* ═══════════════════════════════════════════════════════
       DETAIL PANEL & UTILITIES
       ═══════════════════════════════════════════════════════ */
    function showDetailPanel(node) {
      const panel = document.getElementById('detail-panel');
      const content = document.getElementById('detail-content');

      let html = '';
      html += detailRow('Address', node.id);
      html += detailRow('Label', node.label);
      html += detailRow('Type', '<span style="color:' + (COLOR_MAP[node.type]||'#ccc') + ';">' + node.type.toUpperCase() + '</span>');
      html += detailRow('Depth', node.depth);
      html += detailRow('Balance', '<span style="color:#22c55e;">' + formatUSD(node.balance_usd) + '</span>');
      html += detailRow('PnL (30d)', formatUSD(node.pnl_30d));
      html += detailRow('DeFi Protocols', node.defi_protocols || 0);

      if (node.labels && node.labels.length > 0) {
        html += '<div style="margin-top:14px;margin-bottom:6px;color:#64748B;font-size:9px;letter-spacing:1px;text-transform:uppercase;">Labels</div>';
        html += node.labels.map(l => '<span class="tag tag-label">' + l + '</span>').join('');
      }
      if (node.sm_labels && node.sm_labels.length > 0) {
        html += '<div style="margin-top:14px;margin-bottom:6px;color:#64748B;font-size:9px;letter-spacing:1px;text-transform:uppercase;">Smart Money</div>';
        html += node.sm_labels.map(l => '<span class="tag tag-sm">' + l + '</span>').join('');
      }

      html += '<div style="margin-top:20px;text-align:center;">';
      html += '<button onclick="navigator.clipboard.writeText(\\'' + node.id + '\\')" style="background:rgba(255,42,42,0.08);color:var(--red);border:1px solid rgba(255,42,42,0.2);padding:8px 20px;border-radius:6px;cursor:pointer;font-family:inherit;font-size:11px;letter-spacing:1px;transition:all 0.2s;" onmouseover="this.style.background=\\'rgba(255,42,42,0.15)\\'" onmouseout="this.style.background=\\'rgba(255,42,42,0.08)\\'">COPY ADDRESS</button>';
      html += '</div>';

      content.innerHTML = html;
      panel.classList.add('visible');
    }

    function detailRow(label, value) {
      return '<div class="detail-row"><span class="detail-label">' + label + '</span><span class="detail-value">' + value + '</span></div>';
    }

    function formatUSD(v) {
      if (v === undefined || v === null) return '$0';
      if (Math.abs(v) >= 1e6) return '$' + (v/1e6).toFixed(1) + 'M';
      if (Math.abs(v) >= 1e3) return '$' + (v/1e3).toFixed(1) + 'K';
      return '$' + v.toFixed(0);
    }

    // Resize handler
    window.addEventListener('resize', () => {
      if (Graph) Graph.width(window.innerWidth).height(window.innerHeight);
    });

    // Mouse tooltip tracker
    const tooltipEl = document.createElement('div');
    tooltipEl.id = 'hover-tooltip';
    tooltipEl.style.cssText = 'position:fixed;z-index:200;display:none;background:rgba(5,5,12,0.95);backdrop-filter:blur(12px);border:1px solid rgba(255,42,42,0.15);border-radius:6px;padding:8px 14px;font-size:11px;pointer-events:none;color:#e2e8f0;max-width:250px;box-shadow:0 4px 20px rgba(0,0,0,0.4);';
    document.body.appendChild(tooltipEl);
    document.addEventListener('mousemove', e => {
      tooltipEl.style.left = (e.clientX + 16) + 'px';
      tooltipEl.style.top = (e.clientY + 16) + 'px';
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
