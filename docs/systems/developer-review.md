# Disposable developer review and isolated local proof

DEV-LAB2 extends existing diagnostics; it adds no simulation, office, travel,
calendar, person or persistence engine. The supported launcher is:

```sh
PG_CACHE_DIR=/private/tmp/dev-lab-cache npm run dev:identified -- --port 5297 --seed owner-review
```

Open `/review.html?seed=owner-review` on the printed origin. The banner remains
visible while scrolling. Exact identity includes absolute checkout, branch,
HEAD, dirty state and source digest. The digest combines Git's committed tree
with actual changed/untracked bytes, independent of staging. The identity
endpoint refuses a changed source tree until the server restarts. The static
build carries the same identity in `build-identity.json`; a release version is
not substituted for source identity. A dev server is not a production release.

## Review worlds

The hub starts by serializing/deserializing the existing generated World.
Inspect saved worlds lists BrowserSaveStore slots; selecting one uses
`inspectSnapshot`, which validates/decodes the existing save format without
updating timestamps or taking write ownership. The source slot is never passed
to a writer. This needs no World schema change or save migration.

People/world and causal trace inspect the actual clone. Control selection is
presentation-only review state; it grants no office, presence, trip, history,
time or legal authority. Existing canonical work/seat queries describe a
selected person's supported context, and missing prerequisites remain visible.
Institution records and room registry entries are selected by stable identity.
Room selection is visual inspection only, never normal travel.

Office, floor, legislation and character/pose proof surfaces reuse their
existing authored prerequisites. Entering those contexts is explicitly a
fixture switch, never a claim that the source save reached it. Their exact
World seed is reported, including a scenario whose fixed seed differs from the
requested seed. Asset-only viewers do not introduce a new simulation world.
Candidate art, released art and normal-route availability keep their existing
separate dispositions. Review is not human visual acceptance.

Storage used by embedded character proof, legislation snapshots and office
learning is an in-memory Storage adapter. Reset clears it; exit/unload drops it.
No review autosave exists. The source save remains byte-for-byte unchanged,
including metadata. Existing standalone routes retain their established storage
behavior; the marked hub is the disposable review boundary. A review export is
not a normal-player save or normal-player reachability proof.

## UI-core integration handoff

Owner: **UI-CORE-RELEASE**. The exact, checked registration patch is
[`docs/integration/dev-lab2-ui-core.patch`](../integration/dev-lab2-ui-core.patch).
It adds only `?view=review`; App/PlayerGame/production navigation remain owned by
UI-core and are not edited here. The independently reachable `review.html`
entry is included in the ordinary static build for immediate owner inspection.
Until UI-core lands the registration, that optional App route is
**awaiting integration**. The working review entry is already executable.
PEOPLE1-R1/ENV-ALL1 compositor, anchors, registries and visual acceptance are
consumed unchanged. EXEC-WORK2/JUD-WORK2 normal-work consumers are outside this
base; their missing registration is stated rather than replaced with fixtures.

## Harness configuration

| Setting                        | Contract                                                                                           |
| ------------------------------ | -------------------------------------------------------------------------------------------------- |
| `PLAYWRIGHT_PORT` / `PG_PORT`  | Explicit integer port; strict binding, never silently increment                                    |
| `PLAYWRIGHT_BASE_URL`          | Local HTTP origin matching the port                                                                |
| `PLAYWRIGHT_EXTERNAL_SERVER=1` | Deliberate external-server reuse; exact source/directory verification still required               |
| `PG_RUN_ID`                    | Safe run label; defaults to a UUID, use a new value for each invocation                            |
| `PG_ARTIFACTS_DIR`             | Parent directory; each run appends its ID; in-checkout output must be under ignored `test-results` |
| `PG_CACHE_DIR`                 | Vite cache override; default is per-checkout `test-results/cache/<run-or-dev>`                     |
| `PLAYWRIGHT_WORKERS`           | Defaults to 1; maximum 2; unique ports do not remove CPU/RAM contention                            |
| `PG_SEED` / launcher `--seed`  | Seed in the printed review URL; actual fixture seed always comes from World                        |

```sh
PLAYWRIGHT_PORT=5297 PG_RUN_ID=review-001 npm run test:e2e -- tests/e2e/dev-lab2.spec.ts
PG_RUN_ID=types-001 PG_ARTIFACTS_DIR=/private/tmp/dev-lab-proof npm run typecheck
```

Ordinary screenshots use `test.info().outputPath`, never historical proof
paths. Global teardown checks all tracked historical evidence hashes. Per-test
attachments report exact browser version, build identity, URL seed and visible
world identity; unreported seeds stay unreported rather than guessed. There is
no implicit baseline/evidence update mode. To bank evidence deliberately,
review and copy the run's selected artifacts together with its provenance in a
separately authorized change; ordinary tests never perform that operation.

The launcher retains a direct handle to its Vite child and signals only that
child on exit/failure. It neither kills by port/name nor adopts another server.
The integration regression verifies Vite PID, listener port and cwd on macOS,
stops one of two owned servers and proves the other survives. A missing Vite
installation fails instead of spawning an untracked package-manager tree.

On this shared machine, reserve heavy browser/full-validator windows with
other active owners and hand the slot onward explicitly. Do not install a
scheduler. Keep unique outputs and ports even during sequential runs. Never
clean shared dependency caches or another owner's worktree to free space.

LEARN: dependency symlinks share writable caches unless cache/build-info paths
are moved out of node_modules. Source identity must include dirty bytes, save
inspection must avoid load bookkeeping, and screenshot safety belongs in the
runner/tests rather than a recurring reminder.
