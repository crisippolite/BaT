#!/bin/bash
# BaT Signal — Sync environment variables across services
#
# This script reads from .env.local and pushes relevant variables
# to each service. Edit the variables below to match your setup.

set -e

echo "=== BaT Signal Environment Sync ==="

# Source local env file if it exists
if [ -f .env.local ]; then
  echo "Loading from .env.local..."
  set -a
  source .env.local
  set +a
fi

# --- Convex ---
echo ""
echo "--- Setting Convex environment variables ---"
if [ -n "$SCRAPER_SECRET" ]; then
  npx convex env set SCRAPER_SECRET "$SCRAPER_SECRET"
  echo "  Set SCRAPER_SECRET"
fi
if [ -n "$ML_SERVICE_URL" ]; then
  npx convex env set ML_SERVICE_URL "$ML_SERVICE_URL"
  echo "  Set ML_SERVICE_URL"
fi

# --- Railway Scraper ---
echo ""
echo "--- Setting Railway Scraper variables ---"
echo "(Switch to scraper service in Railway first: railway link)"
if [ -n "$CONVEX_SITE_URL" ]; then
  railway variable set CONVEX_SITE_URL="$CONVEX_SITE_URL" 2>/dev/null || echo "  (railway not linked to scraper)"
fi
if [ -n "$SCRAPER_SECRET" ]; then
  railway variable set SCRAPER_SECRET="$SCRAPER_SECRET" 2>/dev/null || echo "  (railway not linked to scraper)"
fi

echo ""
echo "Done. Verify with:"
echo "  npx convex env list"
echo "  railway variable list"
