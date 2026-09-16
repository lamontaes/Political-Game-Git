# Art Desk → Artbench: the owner's asset-production workspace

Owner packets: `00_MODULAR41 › ART DESK FIRST USABLE SLICE` and
`ARTBENCH COMPLETE WORKFLOW`. Base `fed321f7` (origin/main). Branch
`claude/artdesk-first-usable-slice`. LAND (Codex) receives; Drive thread in the
MODULAR41 packet folder; desktop hub embeds the bench.

## What exists now

- **Event contract** `src/authoring/artbench.ts` (`artbench-events/v1`):
  request.created, candidate.ingested, candidate.selected, review.decided,
  tags.set, integration.queued, integration.received, batch.completed. Stable
  ids: assetId (logical), candidateId (bytes ingested), sha256 (exact bytes),
  parentCandidateId (edit lineage), eventId (immutable fact). Projection is
  rebuildable; lanes are per candidate row; tags carry versions and conflicts
  are surfaced, never last-writer-wins.
- **Store** `scripts/dev-lab/artbench-store.ts`: data root outside any worktree
  (`PG_ARTBENCH_DATA_ROOT`, hub alias `PG_ART_DESK_RECORD_ROOT`), fsynced
  `events/events.jsonl`, immutable `bytes/<sha>`, `inbox/`, `outbox/`, `sync/`.
  Legacy sidecars migrate in as events with source `legacy`. Intake fully
  decodes PNG/JPEG (pngjs/jpeg-js) under ceilings, dedupes by request+hash,
  inherits tags/notes/lineage from a parent, marks derived detail and
  calibration rechecks. Decisions are owner-only, bound to the viewed candidate
  and hash, re-verify bytes, and enqueue one integration item on approval.
- **Bridge** `scripts/dev-lab/artbench-bridge.ts`: `/__dev/artbench/{state,
intake, events, original, brief, sync}` on the identified loopback server;
  honors the hub's `X-OCD-Art-Desk-Token` when `PG_ART_DESK_TOKEN` is set.
- **Exchange**: the sync worker polls the Drive-for-desktop mirror of
  `80_ARTBENCH_EXCHANGE` (`PG_ARTBENCH_DRIVE_ROOT` overrides): complete
  batches in `01_INBOX` (manifest.json last or COMPLETE marker) ingest with
  per-item dedupe; events export to `03_REVIEW_AND_INTEGRATION_EVENTS/<eventId>.json`;
  `02_CATALOG/{catalog.json,CATALOG.md,events-index.json,candidates/<sha>}`
  are rebuildable projections; foreign events (LAND receipts) are admitted once.
  No tokens; nothing leaves loopback.
- **Bench UI** `src/ui/ArtDeskView.tsx`: lanes (need generation, awaiting
  capable worker, claimed, needs review, revision requested, approved/awaiting
  integration, in game, history, inbox), facets + text search + untagged, new
  and related requests, copy/download brief, multi-file and drag/drop intake,
  alternatives strip with selected revision and parent compare, checkerboard
  alpha, download original, upload edited version (edit kind + note, optional
  upload-and-approve), revision dialog with exact text, tag editor, decision
  history, integration queue, sync panel with Sync now.

## Guards closed (director R1/R2 + manifest)

Real bounded decode at upload and decision time; review history append-only
(changed/deleted/duplicate ids refused); empty/malformed/undeclared pack
manifests invalid; sampled hashes labelled sampled.

## Proof

`tests/e2e/artbench.spec.ts` runs the combined journey on isolated roots:
needed request → brief → ten-item batch with one invalid file, manifest last →
duplicate retry → restart → filter → approve untagged → tags → revision text →
export/readback → download original → upscale and transparent reimports with
carried identity/tags and new hashes → approve the new revision → integration
items → stale/agent/conflict guards → typing safety. Unit: 27 store tests,
raster decode, inputs receipts, bridge boundaries.

## Remaining

- Drive for desktop syncing is paused on this Mac (its log says so); the mirror
  has not received `80_ARTBENCH_EXCHANGE`. Resuming is the owner's client
  setting; the worker picks the folder up automatically afterwards.
- No image generator is registered; lanes say "awaiting capable worker".
- LAND integration receipts arrive as `integration.received` events in the
  exchange; installed/published states come from those, never from approval.
