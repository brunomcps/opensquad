#!/bin/bash
# ============================================================
# Deploy brunosallesphd.com.br to Cloudflare Pages
# ============================================================
#
# This script builds and deploys the COMPLETE site.
# It ALWAYS includes ALL pages (homepage + mapa-7p + upsell-2as).
#
# WARNING: Cloudflare Pages replaces ALL content on every deploy.
# NEVER deploy a single page without including the others.
#
# Usage: bash _deploy/deploy-brunosallesphd.sh
# ============================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
DEPLOY_DIR="$SCRIPT_DIR/brunosallesphd.com.br"
MAPA_SRC="$PROJECT_ROOT/squads/infoprodutos/mapa/landing-page/mapa-7p-landing-page-codigo/LP-MAPA-7P/Kimi_Agent_MAPA-7P Landing Page/app"

echo "============================================================"
echo "  Deploying brunosallesphd.com.br"
echo "============================================================"
echo ""

# Step 1: Verify deploy folder exists with homepage
if [ ! -f "$DEPLOY_DIR/index.html" ]; then
  echo "ERROR: Homepage not found at $DEPLOY_DIR/index.html"
  echo "The _deploy/brunosallesphd.com.br/ folder must contain the homepage."
  exit 1
fi

# Step 2: Build MAPA-7P React app (if source exists)
if [ -d "$MAPA_SRC/src" ]; then
  echo "[1/3] Building MAPA-7P React app..."
  BUILD_DIR=$(mktemp -d)
  cp -r "$MAPA_SRC/src" "$BUILD_DIR/"
  cp "$MAPA_SRC/package.json" "$MAPA_SRC/vite.config.ts" "$MAPA_SRC/index.html" "$BUILD_DIR/"
  cp "$MAPA_SRC/tsconfig.json" "$MAPA_SRC/tsconfig.app.json" "$MAPA_SRC/tsconfig.node.json" "$BUILD_DIR/" 2>/dev/null || true
  cp "$MAPA_SRC/tailwind.config.js" "$MAPA_SRC/tailwind.config.ts" "$BUILD_DIR/" 2>/dev/null || true
  cp "$MAPA_SRC/postcss.config.js" "$MAPA_SRC/postcss.config.mjs" "$BUILD_DIR/" 2>/dev/null || true
  cp "$MAPA_SRC/components.json" "$BUILD_DIR/" 2>/dev/null || true

  cd "$BUILD_DIR"
  npm install --silent
  NODE_ENV=production npx vite build

  # Copy build output to deploy folder
  rm -rf "$DEPLOY_DIR/mapa-7p/assets"
  mkdir -p "$DEPLOY_DIR/mapa-7p"
  cp -r "$BUILD_DIR/dist/"* "$DEPLOY_DIR/mapa-7p/"

  rm -rf "$BUILD_DIR"
  echo "   MAPA-7P built successfully"
else
  echo "[1/3] MAPA-7P source not found, using existing build in _deploy/"
fi

# Step 3: Verify all pages are present
echo "[2/3] Verifying all pages..."
ERRORS=0

if [ ! -f "$DEPLOY_DIR/index.html" ]; then
  echo "   MISSING: Homepage (index.html)"
  ERRORS=$((ERRORS + 1))
fi

if [ ! -f "$DEPLOY_DIR/mapa-7p/index.html" ]; then
  echo "   MISSING: /mapa-7p/ page"
  ERRORS=$((ERRORS + 1))
fi

if [ ! -f "$DEPLOY_DIR/upsell-2as/index.html" ]; then
  echo "   MISSING: /upsell-2as/ page"
  ERRORS=$((ERRORS + 1))
fi

# Check for placeholders (common mistake)
PLACEHOLDERS=$(grep -r "INSERIR\|URL_DO\|PLACEHOLDER" "$DEPLOY_DIR/" --include="*.html" -l 2>/dev/null | wc -l)
if [ "$PLACEHOLDERS" -gt 0 ]; then
  echo "   WARNING: Found placeholder text in:"
  grep -r "INSERIR\|URL_DO\|PLACEHOLDER" "$DEPLOY_DIR/" --include="*.html" -l 2>/dev/null
  ERRORS=$((ERRORS + 1))
fi

if [ "$ERRORS" -gt 0 ]; then
  echo ""
  echo "ERROR: $ERRORS problems found. Fix them before deploying."
  exit 1
fi

echo "   All pages verified OK"

# Step 4: Deploy
echo "[3/3] Deploying to Cloudflare Pages..."
cd "$DEPLOY_DIR"
npx wrangler pages deploy . --project-name=mapa-7p --branch=main

echo ""
echo "============================================================"
echo "  Deploy complete!"
echo "  Verify:"
echo "    https://brunosallesphd.com.br/"
echo "    https://brunosallesphd.com.br/mapa-7p/"
echo "    https://brunosallesphd.com.br/upsell-2as/"
echo "============================================================"
