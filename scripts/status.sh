#!/bin/bash
# BaT Signal — Check status of all services

set -e

echo "=== BaT Signal Service Status ==="
echo ""

echo "--- Convex ---"
npx convex env list 2>/dev/null || echo "  (not configured)"
echo ""

echo "--- Railway ---"
railway status 2>/dev/null || echo "  (not configured)"
echo ""

echo "--- Vercel ---"
vercel ls 2>/dev/null || echo "  (not configured)"
echo ""

echo "--- Local Git ---"
echo "  Branch: $(git branch --show-current)"
echo "  Status: $(git status --short | wc -l) modified files"
