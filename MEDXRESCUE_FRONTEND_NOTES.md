# MedXRescue Nexus frontend integration notes

## Included routes
- `/medxrescue` — guest emergency intake; no patient account required.
- `/medxrescue/status?reference=...` — secure guest tracking using the access token kept in the same browser tab's `sessionStorage`.
- `/medxrescue/providers` — public ambulance-provider application. An application is not operational until reviewed.
- `/medxrescue/crew` — authenticated crew/provider inbox for accepting or declining pending dispatch offers.
- `/hms/medxrescue` — HMS-shell dispatcher queue, incident status/priority controls, map preview, provider vehicle lookup, dispatch offers, and backend route estimates.

## Backend integration
The module calls the existing `/api/v1/medxrescue` endpoints through the project's shared `apiClient`, preserving its base URL and auth token behavior. No additional npm dependencies were added. The HMS navigation includes MedXRescue Nexus using the existing teal accent (`#1b7b68`) and card/sidebar patterns.

## Map and routing notes
Map previews use OpenStreetMap's embedded map and display attribution. These are location previews, not a live fleet map or turn-by-turn navigation. The dispatcher requests road-route estimates from the backend only when a selected vehicle has GPS coordinates and an incident has coordinates. A missing/failed estimate is displayed as unavailable; no ETA is fabricated. OpenStreetMap's public services are best-effort and have usage policies; do not treat them as a production emergency service SLA.

## Current scope / remaining work
This first frontend pass does not yet include the provider verification/admin workspace, complete vehicle registration and GPS update screens, facility acceptance inbox, clinical handover forms, live fleet tracking, or crew-driven lifecycle/GPS updates. The current backend routes/role checks must be used to build those screens. WebSocket event subscription and end-to-end tests are also still needed; current screens use bounded polling as a fallback.

## Verification status
The ZIP archive was integrity-checked and the source paths and API contracts were reviewed against the supplied backend. A full Next.js/TypeScript build was **not verified** because dependency installation did not complete in this environment. Run `npm ci` and `npm run build` locally before deploying. Validate against a test backend and MongoDB replica-set/Atlas before operational use.
