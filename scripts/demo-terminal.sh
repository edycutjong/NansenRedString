#!/usr/bin/env bash

# clear
clear

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
echo -e "\033[1;32m[Success]\033[0m Uplink established. Running targeted investigation..."
sleep 1

# Execute the mock investigation on a dummy address
NANSEN_MOCK=true npx tsx src/index.ts investigate 0xdead000000000000000000000000000000000001
