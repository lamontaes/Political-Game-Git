# Art Desk first usable slice

Owner packet: `00_MODULAR41 — ART DESK FIRST USABLE SLICE`. Base
`fed321f7667bbe5c3570679554a2f6b88d3bf8b1` (origin/main at fetch time).
Branch `claude/artdesk-first-usable-slice`. LAND handshake: Drive doc
"ARTDESK FIRST USABLE SLICE — Fable handshake to LAND (2026-09-16)".

## Findings repaired (director's source findings at the tested head)

1. `ArtDeskView` hardwired `privatePackPath: undefined` and
   `privatePackInputState(null)`, so the pack-missing banner was an assumption.
   Now the identified server answers `GET /__dev/art-desk/inputs` with a receipt:
   pack `not-configured | missing | invalid | incomplete | verified` (from
   `PG_PRIVATE_ART_PACK`, pack.json, manifest hash, file presence, sampled
   hashes) and a per-candidate byte state. The browser renders the receipt and
   shows `unknown` until it arrives. Environment requests carry their own style
   authority; only people requests reference the pack, with its real state.
2. `projectArtDesk` said "Candidate bytes present" when only metadata existed.
   Candidates now carry `bytes: unchecked | verified | missing | hash-mismatch |
   not-a-raster`; coverage notes and thumbnails say which. The doorstep JPEG
   `b0ced60c…7266` stays recorded as history with its bytes reported missing;
   no bounded local source held a retained copy, and nothing was invented.
3. Decisions bound a recorded hash without verifying bytes. `decisionBlocker`
   gates the UI, `decide` re-reads the receipt and binds the server-verified
   hash, and the bridge refuses (`422 candidate-unverified`) any new review
   whose bytes are absent, changed or undecodable at the write boundary.
   Existing reviews in the file are history and are left alone. Decision-write
   tests use fixture authors, never `lamontae`.
4. Uploads persisted bytes but kept the request↔candidate map in React state.
   The bridge now validates the raster (magic bytes, dimensions, path hash equals
   content hash) and the view records the association in the private, gitignored
   sidecar `art/generated/candidates/art-desk/candidates.json` with If-Match.
   Reload reads it back through the receipt.
5. Rows without a thumbnail collapsed the copy into the 72px column. Every row
   is the same two-column grid with a labelled empty slot. Approval and
   navigation keys are ignored while typing in a field.

## QA proof

A disposable QA request lives only in the private sidecar
`art/generated/candidates/art-desk/qa-requests.json`; the e2e test creates it,
uploads an existing tracked raster, checks full-size preview, reloads, checks
the same hash and preview, then restores both sidecars and removes the bytes.
It is bench proof, not coverage or acceptance of any production art.

## Not done here

No image generation, no provider, no people/appearance edits, no owner-save
changes, no doorstep recovery. LAND merges.
