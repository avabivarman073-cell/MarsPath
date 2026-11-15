# MarsPath 3.0.1 — Hour-matched historical Jezero temperature

## What changed
- Integrated original temperature-only backend API and unmodified Sol 15 CSV/JSON into MarsPath 3.0.1.
- Integrated hourly temperature card into Explorer and Navigate, plus a detailed Sol 15 history on Explorer.
- Uses **your laptop/browser local clock hour (0–23)** to select the **same-numbered LMST hour (0–23) from the historical Sol 15 dataset**. For example, device 10:xx shows historical LMST 10:00. It checks the local clock every 15 seconds, so hour changes automatically update the value. No page refresh required.
- Source data is never modified. A missing hour shows `Not available`, never a made-up value.
- API endpoints: `/api/science/thermal/sol-15` and `/api/science/thermal/sol-15/estimate?lmst_minute=720`. The extra estimation endpoint is retained for future Mars-local-clock features but is not used by the hourly device-clock card.
- If backend is offline, the hourly panel uses a bundled JSON snapshot, with a clear offline indicator.

## Scientific caveat
**This is NOT real-time Mars weather.** A Windows clock hour is only used as a demonstration time selector for historical Sol 15 rover observations. The Earth-local hour does not equal Mars LMST; we match the numerical hour intentionally at user request. It does not represent actual 2026 Mars temperature or any selected waypoint. Ground temperature is unavailable. Do not use it for astronaut safety decisions.

## Windows startup
Extract the ZIP completely, then double click `start_all_windows.bat`. Node.js 20.19+ or 22.12+ and Python 3.10+ with Internet connectivity for first-run dependency installation are required. Open the URL printed by Vite (normally http://127.0.0.1:5173).

## Verify
On the Explorer page, note your local Windows hour and compare the card to the corresponding hour in the history table. To test a different hour, change your Windows clock temporarily, then restore automatic time sync.
