#!/usr/bin/env bash
# BunBau (資本寶) — Smart Docker Dev Launcher
# Automatically checks if port 3000 is occupied (by another container or host process)
# and falls back to the next available port (e.g. 3001, 3002).

set -e

START_PORT="${DEV_PORT:-3000}"
TARGET_PORT="$START_PORT"
MAX_PORT=3020

is_port_in_use() {
  local port=$1
  # Check if any Docker container has mapped this host port
  if command -v docker >/dev/null 2>&1; then
    if docker ps --format '{{.Ports}}' 2>/dev/null | grep -qE "(:${port}->|0\.0\.0\.0:${port}->|\[::\]:${port}->)"; then
      return 0
    fi
  fi

  # Check with lsof (macOS / Linux)
  if command -v lsof >/dev/null 2>&1; then
    if lsof -iTCP:"$port" -sTCP:LISTEN -n -P >/dev/null 2>&1; then
      return 0
    fi
  fi

  # Check with nc (netcat) as fallback
  if command -v nc >/dev/null 2>&1; then
    if nc -z 127.0.0.1 "$port" >/dev/null 2>&1; then
      return 0
    fi
  fi

  return 1
}

echo "🔍 Checking port availability starting at $START_PORT..."

while is_port_in_use "$TARGET_PORT"; do
  echo "⚠️  Port $TARGET_PORT is already in use by another service/container."
  TARGET_PORT=$((TARGET_PORT + 1))
  if [ "$TARGET_PORT" -gt "$MAX_PORT" ]; then
    echo "❌ Error: Could not find an available port between $START_PORT and $MAX_PORT."
    exit 1
  fi
done

if [ "$TARGET_PORT" -ne "$START_PORT" ]; then
  echo "✨ Smart Port: Switched from port $START_PORT to available port $TARGET_PORT"
else
  echo "✅ Port $TARGET_PORT is available."
fi

export DEV_PORT="$TARGET_PORT"
echo "🚀 Starting BunBau container on http://localhost:$DEV_PORT ..."
exec docker compose --env-file .env.local --profile dev up "$@"
