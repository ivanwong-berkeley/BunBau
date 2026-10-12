#!/bin/sh
# Dev container entrypoint: sync dependencies, then start Next.js with hot reload.
set -e
sh scripts/ensure-deps.sh
exec npm run dev -- -H 0.0.0.0 -p 3000
