#!/bin/sh
# Installs node_modules when package-lock.json changed (or node_modules is missing).
# The dev container keeps node_modules in a named volume that Docker seeds only once, so
# without this check a new dependency never reaches the running container.
# NPM_CMD can be overridden for tests.
set -e

NPM="${NPM_CMD:-npm}"
STAMP="node_modules/.lock-hash"

[ -f package-lock.json ] || { echo "[bunbau] package-lock.json not found" >&2; exit 1; }
if command -v sha256sum >/dev/null 2>&1; then want=$(sha256sum package-lock.json | cut -d' ' -f1); else want=$(shasum -a 256 package-lock.json | cut -d' ' -f1); fi
have=$(cat "$STAMP" 2>/dev/null || true)

if [ "$want" != "$have" ] || [ ! -d node_modules ]; then
  echo "[bunbau] package-lock.json changed or node_modules missing -> installing dependencies"
  $NPM ci
  rm -rf .next/cache
  mkdir -p node_modules
  echo "$want" > "$STAMP"
else
  echo "[bunbau] dependencies up to date"
fi
