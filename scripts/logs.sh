#!/bin/bash
# BaT Signal — View logs from services
# Usage: ./scripts/logs.sh [convex|scraper|ml]

TARGET="${1:-convex}"

case "$TARGET" in
  convex)
    echo "==> Convex logs (streaming)..."
    npx convex logs
    ;;
  scraper)
    echo "==> Railway Scraper logs (streaming)..."
    railway logs
    ;;
  ml)
    echo "==> Railway ML service logs (streaming)..."
    railway logs
    ;;
  *)
    echo "Usage: $0 [convex|scraper|ml]"
    exit 1
    ;;
esac
