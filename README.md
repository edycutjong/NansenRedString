# 🔴 RedString — On-Chain Forensic Investigation Engine

[![CI](https://github.com/edycutjong/nansen-redstring/actions/workflows/ci.yml/badge.svg)](https://github.com/edycutjong/nansen-redstring/actions)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green?logo=node.js)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-red.svg)](LICENSE)

**Map wallet networks as interactive 3D graphs.** RedString is a forensic investigation CLI that wraps the [Nansen CLI](https://docs.nansen.ai) to perform BFS traversal of on-chain wallet connections, enrich nodes with financial intelligence, and render self-contained WebGL visualizations.

> Built for the **Nansen CLI Build Challenge — Week 4**

---

## ✨ Features

- 🕵️ **BFS Graph Traversal** — Discover wallet networks with configurable depth (1–3) and width (5–20)
- 💰 **Financial Enrichment** — Labels, balances, 30d PnL, DeFi protocol exposure per node
- 🌐 **3D WebGL Visualization** — Self-contained HTML with auto-orbit cameras, particle effects, and screenshot export
- 🔍 **OSINT Integration** — Off-chain intelligence via Nansen web search
- ⚡ **Disk Cache** — SHA256-keyed persistent cache to minimize API costs (configurable TTLs)
- 📊 **Telemetry Receipt** — Forensic audit trail of every API call with latency tracking
- 🎭 **Mock Mode** — Full offline development with synthetic data (`NANSEN_MOCK=true`)

## 🏗️ Architecture

```
redstring investigate 0xdead... --depth 2 --width 10
        │
        ├─── BFS Engine (graph-builder.ts)
        │    ├── profiler trace → connections
        │    ├── profiler counterparties → fallback
        │    └── enrichNode → labels, balance, PnL, DeFi
        │
        ├─── OSINT Layer (osint.ts)
        │    └── web search → off-chain intelligence
        │
        ├─── Terminal Report (terminal-report.ts)
        │    └── Palantir-aesthetic forensic summary
        │
        ├─── HTML Renderer (html-renderer.ts)
        │    └── 3D force-directed graph (3d-force-graph)
        │
        └─── Telemetry (telemetry.ts)
             └── API call receipt with cache hit rates
```

## 🚀 Quick Start

### Prerequisites

- **Node.js** ≥ 18
- **Nansen CLI** installed and authenticated (`npm i -g @nansen/cli`)

### Install & Run

```bash
# Clone
git clone https://github.com/edycutjong/nansen-redstring.git
cd nansen-redstring

# Install dependencies
npm install

# Run in mock mode (no API key needed)
NANSEN_MOCK=true npx tsx src/index.ts investigate 0xdead...beef

# Run with live Nansen API
npx tsx src/index.ts investigate 0xdead...beef --depth 2 --width 10
```

### Global Install

```bash
npm run build
npm link
redstring investigate 0xdead...beef
```

## 📖 Commands

### `investigate <address>`

Core forensic command. Traces wallet connections via BFS and renders a 3D graph.

| Flag | Description | Default |
|------|-------------|---------|
| `-d, --depth <n>` | BFS traversal depth (1–3) | `2` |
| `-w, --width <n>` | Max counterparties per node (5–20) | `10` |
| `-c, --chain <chain>` | Blockchain network | `ethereum` |
| `-m, --min-volume <usd>` | Minimum USD volume filter | `0` |
| `--osint` | Include off-chain web search | `false` |
| `--no-cache` | Bypass disk cache | `false` |
| `--no-open` | Skip auto-opening browser | `false` |
| `--json` | Output raw graph JSON | `false` |
| `-o, --output <dir>` | Output directory for HTML | `cwd` |

### `compare <address-a> <address-b>`

Head-to-head wallet comparison. Shows correlation score, common counterparties, and shared tokens.

| Flag | Description | Default |
|------|-------------|---------|
| `-c, --chain <chain>` | Blockchain network | `ethereum` |
| `--json` | Output raw JSON | `false` |

### `profile <address>`

Deep wallet profile — labels, balance, PnL, DeFi positions, and recent transactions.

| Flag | Description | Default |
|------|-------------|---------|
| `-c, --chain <chain>` | Blockchain network | `ethereum` |
| `--json` | Output raw JSON | `false` |

## 🎮 3D Visualizer Controls

| Shortcut | Action |
|----------|--------|
| `S` | Screenshot (PNG export) |
| `R` | Reset camera position |
| `L` | Toggle node labels |
| Mouse drag | Rotate view |
| Scroll | Zoom in/out |
| Click node | Open detail panel |

### Node Color Legend

| Color | Meaning |
|-------|---------|
| 🔴 Neon Crimson | Seed / Target wallet |
| 🟡 Cyber Gold | Smart Money |
| 🔵 Neon Cyan | Labeled entity (Exchange, DEX, etc.) |
| ⚫ Dim Slate | Unknown wallet |
| 🔘 Muted Gray | Contract |

## 🧪 Development

```bash
# Type check
npm run typecheck

# Lint
npm run lint

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Full CI pipeline (typecheck + lint + test:coverage)
npm run ci
```

### Demo Cast (Suggested Wallets)

| Alias | Address | Why |
|-------|---------|-----|
| jaredfromsubway.eth | `0xae2Fc483527B8EF99EB5D9B44875F005ba1FaE13` | MEV bot operator |
| Wintermute | `0x0000000000000000000000000000000000000000` | Market maker |
| Nomad Exploiter | `0x56D8B635A7C88Fd1104D23d632AF4003B16d0BF6` | Bridge exploit |

## 🔧 Environment Variables

| Variable | Description |
|----------|-------------|
| `NANSEN_MOCK` | Enable synthetic data mode (`true`/`false`) |
| `NANSEN_DEBUG` | Enable verbose API error logging (`true`/`false`) |

## 📁 Project Structure

```
src/
├── index.ts              # CLI entry point (Commander.js)
├── commands/
│   ├── investigate.ts    # BFS investigation command
│   ├── compare.ts        # Wallet comparison command
│   └── profile.ts        # Deep wallet profile command
├── lib/
│   ├── graph-builder.ts  # BFS traversal engine
│   ├── nansen.ts         # Nansen CLI wrapper + caching
│   ├── html-renderer.ts  # 3D WebGL HTML generator
│   ├── enricher.ts       # Node financial enrichment
│   ├── osint.ts          # Off-chain intelligence
│   ├── disk-cache.ts     # SHA256-keyed persistent cache
│   ├── telemetry.ts      # API call tracking
│   ├── terminal-report.ts # Terminal formatting
│   └── mock.ts           # Synthetic data generator
└── types/
    ├── graph.ts          # GraphNode, GraphEdge, GraphData
    ├── investigation.ts  # InvestigationOptions, results
    └── wallet.ts         # Raw API response shapes
```

## 📄 License

MIT © [edycutjong](https://github.com/edycutjong)
