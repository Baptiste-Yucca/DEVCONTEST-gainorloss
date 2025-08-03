#!/bin/bash

# Configuration
USER_ADDRESS="0x3f3994bb23c48204ddeb99aa6bf6dd275abf7a3f"
SUPPLY_TOKEN_ADDRESS="0x0cA4f5554Dd9Da6217d62D8df2816c82bba4157b"
MORALIS_API_KEY="${MORALIS_API_KEY:-YOUR_API_KEY_HERE}"

echo "🔍 DEBUG: Supply Token USDC"
echo "=================================="
echo "Adresse utilisateur: $USER_ADDRESS"
echo "Token supply: $SUPPLY_TOKEN_ADDRESS"
echo "=================================="

# 1. Requête Moralis pour les transferts
echo ""
echo "📡 1. Requête Moralis pour les transferts:"
echo "----------------------------------------"

MORALIS_URL="https://deep-index.moralis.io/api/v2/$USER_ADDRESS/erc20/transfers?chain=gnosis&token_addresses=$SUPPLY_TOKEN_ADDRESS"

echo "URL: $MORALIS_URL"
echo "Headers: X-API-Key: $MORALIS_API_KEY"
echo ""

# Exécuter la requête Moralis
MORALIS_RESPONSE=$(curl -s -H "X-API-Key: $MORALIS_API_KEY" -H "Accept: application/json" "$MORALIS_URL")

echo "📊 Réponse Moralis:"
echo "$MORALIS_RESPONSE" | jq '.'

# 2. Analyser les transferts
echo ""
echo "📈 2. Analyse des transferts:"
echo "----------------------------------------"

# Compter les transferts entrants/sortants
INCOMING_COUNT=$(echo "$MORALIS_RESPONSE" | jq '.result | map(select(.to_address | ascii_downcase == "'$USER_ADDRESS'")) | length')
OUTGOING_COUNT=$(echo "$MORALIS_RESPONSE" | jq '.result | map(select(.from_address | ascii_downcase == "'$USER_ADDRESS'")) | length')

echo "Transferts entrants (IN): $INCOMING_COUNT"
echo "Transferts sortants (OUT): $OUTGOING_COUNT"
echo "Total: $((INCOMING_COUNT + OUTGOING_COUNT))"

# 3. Calculer les montants
echo ""
echo "💰 3. Calcul des montants:"
echo "----------------------------------------"

# Montants entrants (en wei)
INCOMING_AMOUNT=$(echo "$MORALIS_RESPONSE" | jq '.result | map(select(.to_address | ascii_downcase == "'$USER_ADDRESS'")) | map(.value | tonumber) | add // 0')
OUTGOING_AMOUNT=$(echo "$MORALIS_RESPONSE" | jq '.result | map(select(.from_address | ascii_downcase == "'$USER_ADDRESS'")) | map(.value | tonumber) | add // 0')

# Convertir en USDC (6 décimales)
INCOMING_USDC=$(echo "scale=6; $INCOMING_AMOUNT / 1000000" | bc -l 2>/dev/null || echo "0")
OUTGOING_USDC=$(echo "scale=6; $OUTGOING_AMOUNT / 1000000" | bc -l 2>/dev/null || echo "0")
NET_USDC=$(echo "scale=6; $INCOMING_USDC - $OUTGOING_USDC" | bc -l 2>/dev/null || echo "0")

echo "Montant total entrant: $INCOMING_USDC USDC"
echo "Montant total sortant: $OUTGOING_USDC USDC"
echo "Balance nette calculée: $NET_USDC USDC"

# 4. Comparer avec l'API backend
echo ""
echo "🔍 4. Comparaison avec l'API backend:"
echo "----------------------------------------"

BACKEND_RESPONSE=$(curl -s "http://localhost:3001/api/rmm/v3/$USER_ADDRESS")
BACKEND_SUPPLY=$(echo "$BACKEND_RESPONSE" | jq '.data.results[0].data.transactions.USDC.supply | length // 0')
BACKEND_WITHDRAWS=$(echo "$BACKEND_RESPONSE" | jq '.data.results[0].data.transactions.USDC.supply | map(select(.type == "withdraw")) | length // 0')

echo "Transactions supply (backend): $BACKEND_SUPPLY"
echo "Transactions withdraw (backend): $BACKEND_WITHDRAWS"
echo "Transactions deposit (backend): $((BACKEND_SUPPLY - BACKEND_WITHDRAWS))"

# 5. Résumé
echo ""
echo "📊 5. Résumé du debug:"
echo "=================================="
echo "✅ Moralis - Transferts entrants: $INCOMING_COUNT"
echo "✅ Moralis - Transferts sortants: $OUTGOING_COUNT"
echo "✅ Moralis - Balance nette: $NET_USDC USDC"
echo "✅ Backend - Total supply: $BACKEND_SUPPLY"
echo "✅ Backend - Total withdraws: $BACKEND_WITHDRAWS"
echo ""

# 6. Vérifier la balance actuelle sur GnosisScan
echo "🌐 6. Vérification balance actuelle:"
echo "----------------------------------------"
echo "URL GnosisScan: https://gnosisscan.io/token/$SUPPLY_TOKEN_ADDRESS?a=$USER_ADDRESS"
echo "Balance attendue: $NET_USDC USDC"
echo "Balance réelle: 33.41 USDC (selon l'utilisateur)"
echo ""

# Différence
DIFF=$(echo "scale=6; 33.41 - $NET_USDC" | bc -l 2>/dev/null || echo "0")
echo "🔍 Différence: $DIFF USDC"
echo ""

if [ "$DIFF" != "0" ]; then
    echo "❌ PROBLÈME: Les montants ne correspondent pas !"
    echo "💡 Causes possibles:"
    echo "   - Transferts manqués par Moralis"
    echo "   - Problème de décimale"
    echo "   - Transactions internes non comptées"
    echo "   - Erreur dans le calcul backend"
else
    echo "✅ SUCCÈS: Les montants correspondent !"
fi 