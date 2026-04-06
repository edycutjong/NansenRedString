#!/usr/bin/env bash

# clear
clear

# Set terminal tab/window title
echo -ne "\033]0;Nansen RedString Demo\007"

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


# Fake a cool bootup sequence
echo -e "\033[1;36m[System]\033[0m Initializing Nansen RedString Console..."
sleep 0.5
echo -e "\033[1;36m[System]\033[0m Establishing connection to archive nodes..."
sleep 0.5
echo -e "\033[1;36m[System]\033[0m Bypassing rate limits (MOCK_MODE=ENGAGED)..."
sleep 0.8
echo -e "\033[1;32m[Success]\033[0m Uplink established. Starting sequence..."
sleep 1

function pause() {
  # Wait up to 5 seconds. If user presses Enter early, it advances immediately.
  echo -e "\n\033[2;37m>> Press Enter to continue, or wait 5 seconds...\033[0m"
  read -t 5 -r || true
}

echo -e "\n\033[1;35m[MODULE 1] Basic Wallet Profiling\033[0m"
pause
NANSEN_MOCK=true npx tsx src/index.ts profile 0xdead000000000000000000000000000000000001

echo -e "\n\033[1;35m[MODULE 2] Two-Wallet Comparison (Entity Identity Check)\033[0m"
pause
NANSEN_MOCK=true npx tsx src/index.ts compare 0xdead000000000000000000000000000000000001 0xfund000000000000000000000000000000000002

echo -e "\n\033[1;35m[MODULE 3] Deep Investigation (Generating Interactive 3D Trace)\033[0m"
pause
NANSEN_MOCK=true npx tsx src/index.ts investigate 0xdead000000000000000000000000000000000001 --depth 2

echo -e "\n\033[1;32m[System]\033[0m Demo sequence complete."
