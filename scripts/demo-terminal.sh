#!/usr/bin/env bash

# =============================================================================
# RedString Demo — Synchronized with ElevenLabs Voiceover (1:21 / 81 seconds)
# =============================================================================
# Total voiceover: 81 seconds
#
# Timeline:
#   0:00 - 0:07  Segment 1: Intro — banner + bootup
#   0:07 - 0:22  Segment 2: Profile command (~15s)
#   0:22 - 0:41  Segment 3: Compare command (~19s)
#   0:41 - 0:58  Segment 4a: Investigate command — terminal portion (~17s)
#   0:58 - 0:75  Segment 4b: Investigate — HTML 3D graph auto-opens (~17s)
#   0:75 - 0:81  Segment 5: Closing tagline (~6s)
# =============================================================================

clear

# Set terminal tab/window title
echo -ne "\033]0;Nansen RedString Demo\007"

# ─── SEGMENT 1: Intro (0:00 – 0:07) ─────────────────────────────────────────
# Voice: "This is RedString. A forensic investigation engine built on Nansen."
# Voice: "One command. Zero setup. Full on-chain intelligence."

echo -e "\033[1;31m"
cat << "EOF"
    ____          __  _____ __       _             
   / __ \___  ____/ / / ___// /______(_)___  ____ _
  / /_/ / _ \/ __  /  \__ \/ __/ ___/ / __ \/ __ `/
 / _, _/  __/ /_/ /  ___/ / /_/ /  / / / / / /_/ / 
/_/ |_|\___/\__,_/  /____/\__/_/  /_/_/ /_/\__, /  
                                          /____/   
EOF
echo -e "\033[0m"

# Bootup — 5.6s total (fits within 7s intro segment)
echo -e "\033[1;36m[System]\033[0m Initializing Nansen RedString Console..."
sleep 1.2
echo -e "\033[1;36m[System]\033[0m Establishing connection to archive nodes..."
sleep 1.2
echo -e "\033[1;36m[System]\033[0m Bypassing rate limits (MOCK_MODE=ENGAGED)..."
sleep 1.4
echo -e "\033[1;32m[Success]\033[0m Uplink established. Starting sequence..."
sleep 1.2

# ─── SEGMENT 2: Profile (0:07 – 0:22) ───────────────────────────────────────
# Voice: "Let's start with a basic wallet profile."
# Voice: "RedString profile. One address in. Full dossier out."
# Voice: "Labels, balances, thirty-day P-and-L, DeFi exposure..."

echo -e "\n\033[1;35m━━━ MODULE 1 ━━━ Basic Wallet Profiling\033[0m"
sleep 2
# Command runs — mock mode (~2s)
NANSEN_MOCK=true npx tsx src/index.ts profile 0xdead000000000000000000000000000000000001
# Hold — let narrator finish describing the output
sleep 8

# ─── SEGMENT 3: Compare (0:22 – 0:41) ───────────────────────────────────────
# Voice: "Now, let's compare two wallets side by side."
# Voice: "RedString compare. Are these two addresses the same entity?"
# Voice: "...entity match confirmed, ninety-two percent correlation score."

echo -e "\n\033[1;35m━━━ MODULE 2 ━━━ Two-Wallet Comparison (Entity Identity Check)\033[0m"
sleep 2.5
# Command runs — mock mode (~3s)
NANSEN_MOCK=true npx tsx src/index.ts compare 0xdead000000000000000000000000000000000001 0xfund000000000000000000000000000000000002
# Hold — narrator reveals correlation score
sleep 10

# ─── SEGMENT 4: Investigate (0:41 – 0:58 terminal, then HTML auto-opens) ────
# Voice: "Here's where it gets interesting."
# Voice: "RedString investigate. Depth two. BFS graph traversal."
# Voice: "We start from the seed wallet, fan out through counterparties..."
# >>> At ~0:58 browser auto-opens with 3D graph <<<
# Voice: "...render the entire network as an interactive 3D WebGL graph."
# Voice: "Rotate, zoom, click any node. This is on-chain forensics, visualized."

echo -e "\n\033[1;35m━━━ MODULE 3 ━━━ Deep Investigation (Generating Interactive 3D Trace)\033[0m"
sleep 2.5
# Command runs — BFS traversal + HTML generation (~5s in mock)
# Browser auto-opens at the end — this is where you switch screen recording to browser
NANSEN_MOCK=true npx tsx src/index.ts investigate 0xdead000000000000000000000000000000000001 --depth 2

# ─── SEGMENT 4b + 5: HTML showcase + Closing (0:58 – 1:21) ──────────────────
# The 3D graph is now open in browser. Record ~23 seconds of:
#   - Auto-orbit camera spinning (5s)
#   - Click a node to show detail panel (5s)
#   - Manual rotate/zoom (5s)
#   - Hold on wide shot as narrator says closing line (8s)
# Voice: "RedString. Map the cabal. Built for Nansen."

sleep 5
echo -e "\n\033[1;32m[System]\033[0m Demo sequence complete."
echo -e "\033[1;31m[RedString]\033[0m Map the Cabal. \033[0;90mBuilt for Nansen.\033[0m"
sleep 3

echo ""
