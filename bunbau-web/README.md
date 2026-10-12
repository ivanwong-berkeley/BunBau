# BunBau web

## Docker dev: adding or updating dependencies
The dev container keeps `node_modules` in a named volume that Docker fills only once. The container start script
(`scripts/dev-entrypoint.sh` -> `scripts/ensure-deps.sh`) now compares a hash of `package-lock.json` with the one stored
in that volume and runs `npm ci` automatically when it changed (it also clears the webpack cache).

So after pulling or adding a package, just restart:

```
docker compose --env-file .env.local --profile dev up --build
```

If the container ever looks stale anyway, reset the two cache volumes (your source and `.env.local` are not touched):

```
docker compose --env-file .env.local --profile dev down -v
docker compose --env-file .env.local --profile dev up --build
```

A unit test (`tests/unit/dependency_guard.test.ts`) fails if code imports a package that is not in `package.json`.
