#!/bin/bash
# BaT Signal — Deploy all services
# Usage: ./scripts/deploy.sh [convex|scraper|ml|frontend|all]

set -e

TARGET="${1:-all}"

deploy_convex() {
  echo "==> Deploying Convex..."
  npx convex deploy
  echo "    Convex deployed."
}

deploy_scraper() {
  echo "==> Deploying Scraper to Railway..."
  cd scraper
  railway up --detach
  cd ..
  echo "    Scraper deployed."
}

deploy_ml() {
  echo "==> Deploying ML Service to Railway..."
  cd ml
  railway up --detach
  cd ..
  echo "    ML service deployed."
}

deploy_frontend() {
  echo "==> Deploying Frontend to Vercel..."
  cd frontend
  vercel --prod
  cd ..
  echo "    Frontend deployed."
}

case "$TARGET" in
  convex)
    deploy_convex
    ;;
  scraper)
    deploy_scraper
    ;;
  ml)
    deploy_ml
    ;;
  frontend)
    deploy_frontend
    ;;
  all)
    deploy_convex
    deploy_scraper
    deploy_ml
    deploy_frontend
    echo ""
    echo "All services deployed."
    ;;
  *)
    echo "Usage: $0 [convex|scraper|ml|frontend|all]"
    exit 1
    ;;
esac
