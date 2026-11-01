# GlobeTrek coding instructions

## Authority and scope

- Read `HANDOFF.md` for current status and the next task. Read `PRODUCT.md`, `CONTEXT.md` and the relevant API/domain records before changing behavior.
- Follow `DESIGN.md` for visual decisions and `UX-CONTRACT.md` for cross-screen behavior. Preserve the approved ten-country travel-planner scope; do not reduce it to the hotel foundation without discussing the tradeoff with the user.
- Keep dated progress/results in `HANDOFF.md` and `docs/PROGRESS.md`, not in this instruction file. Treat checkpoints and older review records as history when a newer delivery record supersedes them.

## Permissions and preservation

- Obtain explicit user permission before access approvals, downloads requiring access, account connections, infrastructure changes, Git staging/commits/pushes, deployment or publication. Never approve an access request yourself. A GitHub username or existing repository is not authorization for remote actions.
- Routine authorized workspace edits and local read-only inspection can proceed. Use the environment's approval prompt when sandboxed execution requires escalation; do not bypass it with another tool.
- Parent-folder journal writes require explicit access approval. Until granted, keep learning content and `GlobeTrek-Learning-Journal.docx` inside `docs/` in this workspace.
- Preserve unrelated working-tree changes. Do not reset, discard or overwrite the user's work. Inspect running processes before restarting a demo: its temporary database disappears when stopped.
- Update `.gitignore` before introducing secrets, caches, dependency folders, builds or generated local artifacts. Commit only placeholder environment examples; never expose `.env`, credentials, cookies or tokens in output/logs.

## Implementation conventions

- Keep JavaScript/ES modules, npm workspaces, React/Vite and the Express/Mongoose modular monolith. Use the lockfile (`npm ci`) for reproducibility. Add dependencies only for a concrete purpose and respect access approval boundaries.
- Controllers handle HTTP; domain services own pricing, dates, booking rules and database transactions. Reuse shared validation/date/money helpers rather than duplicating rules in React.
- Keep destination-native integer minor-unit money authoritative, including zero-decimal currencies. Use decimal arithmetic/explicit rounding; distinguish zero from missing data. INR values are dated informational estimates.
- Preserve authentication cookies, origin validation, ownership, redacted structured logs, rate limiting and request IDs. Log count/status/duration without sensitive bodies.
- Preserve atomic shared inventory, held plus booked capacity checks, idempotency/fingerprint behavior, persisted expiry checks and exactly-once release. Never rely on TTL deletion or an always-awake timer to release inventory; avoid external side effects inside retried transactions.
- Preserve owned-trip revision checks, serialized autosaves, guest recovery and authentication return intent. Draft edits must not mutate reservation snapshots. Estimates must remain read-only and never reserve stock.
- Reuse the trip reducer, TanStack Query, shared UI primitives, place previews and price presentation. URL state owns public navigation; private draft contents stay out of URLs. Cancel stale reads and prevent outdated responses from replacing current selections.
- Keep stop occurrence IDs, day colors/labels and separate daily routes. Meshes, pins and routes share projection/inset transforms; never relocate a place to hide an alignment problem.
- Use accessible links/buttons, linked field errors, keyboard alternatives, visible focus and reduced-motion handling. Preserve lists when WebGL/maps fail, and mount only the active geographic engine.
- Preserve image/font/map/terrain provenance and provider-specific licenses. Fictional properties/tours and simulated payments stay clearly labelled. Never invent destination facts, ratings, partnerships, prices or performance claims.

## Verification and learning

- Run checks appropriate to changed behavior; use `HANDOFF.md` for commands. Meaningful booking/ownership/pricing changes need integration tests against a replica set and direct database assertions where relevant. UI changes need affected browser flows and relevant viewport/theme/failure checks.
- Record actual commands, results and limitations. A static audit, scoped independent review or localhost observation is not whole-application certification. Do not rerun unrelated expensive checks without a reason.
- Keep source imports and ordinary builds separate. Existing relief builds need no terrain download. Ask before refreshing source caches or connecting services; update `docs/SERVICES.md` with actual usage and honest unknowns.
- Explain important topics in learning notes: what, why, location, verification and an interview explanation. Preserve prior journal content; render and visually verify Word changes. Review critical authentication, inventory, draft concurrency, expiry, money/time and performance decisions with the user.
- Do not read or write outside approved workspace roots except through explicitly approved access. No Git, hosting or parent-folder write is implied by finishing a code change.
