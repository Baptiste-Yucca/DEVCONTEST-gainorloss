#!/bin/bash

# Configuration
USER_ADDRESS="0x3f3994bb23c48204ddeb99aa6bf6dd275abf7a3f"
SUPPLY_TOKEN_ADDRESS="0x0cA4f5554Dd9Da6217d62D8df2816c82bba4157b"
MORALIS_API_KEY="${MORALIS_API_KEY:-YOUR_API_KEY_HERE}"

echo "🔍 Test Moralis - Supply Token USDC"
echo "=================================="
echo "Adresse: $USER_ADDRESS"
echo "Token: $SUPPLY_TOKEN_ADDRESS"
echo ""

# URL Moralis
MORALIS_URL="https://deep-index.moralis.io/api/v2/$USER_ADDRESS/erc20/transfers?chain=gnosis&token_addresses=$SUPPLY_TOKEN_ADDRESS"

echo "📡 URL: $MORALIS_URL"
echo "🔑 API Key: $MORALIS_API_KEY"
echo ""

# Test de la requête
echo "📊 Réponse Moralis:"
curl -s -H "X-API-Key: $MORALIS_API_KEY" -H "Accept: application/json" "$MORALIS_URL" | jq '.' 