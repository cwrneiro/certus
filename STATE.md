# STATE — session handoff

## Current focus
No feature in flight. Certus is deployed and stable — see `README.md` for
architecture/deploy and `CLAUDE.md` for the working contract.

## Last completed
Use the real clock for dates (`011d004`).

## Next step
Awaiting the next task.

## Gotchas / in-flight decisions
- Keep `src/data/types.ts`, `server/app.py` (row mapping + inserts), and
  `server/seed.json` in sync when types change.
- Deploy-first: the app's service principal must own the `certus` Lakebase
  schema before local DB work (`README.md` → Deployment → Gotchas).
