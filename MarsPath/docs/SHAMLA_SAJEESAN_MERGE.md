# Shamla + Sajeesan merge | 2026-11-14

## Source-of-truth and scope
- Original source ZIPs are never modified. `MarsPath_shamla.zip` is the baseline for all existing frontend, imagery, science API and GIS data.
- Sajeesan backend route-planning upgrade integrated into `backend/main.py`, keeping Shamla's science router.
- Slope-aware third route, separately optimized return route, and illustrative resource planning are connected to the existing Shamla frontend.
- No rock or temperature measurements were added, changed or invented. Existing data files are byte-identical to Shamla, except excluded ephemeral session DB.

## Source branch conflicts
- Conflict on 25 meaningful paths (including `backend/main.py`, `frontend/src/App.tsx`, UI pages, documentation, and `landing_area_ortho_preview.png`). Both branches cannot simply overwrite each other.
- Shamla's higher-resolution orbital preview and recent UI/CSS, science image/context features, zoom-aware map and graphs are preserved.
- Sajeesan's standalone `Home.tsx`, `Terrain.tsx`, `MapView.tsx`, styles and other overlapping UI were not wholesale adopted because they would undo Shamla's recent frontend work.
- Original GIS scientific rasters and candidate datasets are unchanged; the elevation/slope archive provenance remains pending.
- `backend/data/sessions.sqlite3`, Windows virtualenv, `node_modules`, `.git`, and local `.env.local` excluded intentionally. Backup the original session SQLite file before migration if historical saved sessions matter.
- Do not automatically push this folder as a replacement for Git history; copy reviewed files into your existing local Git checkout and commit.

## Safety and fidelity
- The `balanced` route is an illustrative, **unvalidated** slope-penalty planning model, not a safety-certified traverse. Verify the relative georeferencing of the navigation grid and slope raster before drawing scientific conclusions.
- Return routes are calculated independently but do not check communications, radiation, pressure or validated suit capacity. Oxygen and battery estimates are placeholders, not actual telemetry.
- Existing science photo is regional context only, not a verified destination photograph.

## Usage
Copy the `MarsPath` folder or inspect the separate `MarsPath_Fixes_Only.zip`. From `backend`, run `python -m pytest -q`; from `frontend`, run `npm ci && npm run typecheck && npm run build`.

## Verification (this package)
- Backend: `python -m pytest -q` → **41 passed**.
- Frontend: `tsc --noEmit -p tsconfig.json` → **passed**.
- Production Vite build in this Linux environment was blocked by the ZIP's Windows-specific `node_modules` missing the Linux Rollup optional native binding. Run `npm ci && npm run build` in your environment to verify.
- No browser interaction or deployment was verified.
