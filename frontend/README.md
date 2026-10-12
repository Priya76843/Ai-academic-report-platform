# frontend
React + Vite + TypeScript + React Router + TanStack Query + Tailwind. Mock-first: MSW handlers from `docs/api/api-contracts-v1.md`.
```
npm install
npm run dev                        # mock API (default), http://localhost:5173
VITE_API_MODE=real npm run dev     # proxy /api → backend on :8000 (same-origin cookie)
npm test -- --run · npm run lint · npm run typecheck · npm run build
npm run gen:api                    # regenerate src/lib/api/generated.ts from ../docs/api/openapi.json
```
Rules: server state lives in TanStack Query, not in local stores; every error body goes through `ApiError`;
job progress comes from `useJob`, never from timers; no business rules in the frontend.
