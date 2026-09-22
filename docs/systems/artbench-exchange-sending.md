# Sending art into the Art Bench exchange

Status: **sender contract for every lane that puts artwork in front of the
owner.** It describes how a batch must be written so the bench actually
ingests it. It does not describe the bench's own storage, review or release
rules; those are `docs/systems/art-desk.md` and
`scripts/dev-lab/artbench-store.ts`.

## Which direction you are going

The two halves of the art pipeline travel by completely different routes, and
confusing them wastes a lot of time.

**A request goes out through the repository.** It reaches the owner by being
committed to `art/requests/asset-requests.json` and pushed.
`ArtbenchStore.registryRequests()` reads that file from its workspace
checkout, applying holds from `art/requests/art-desk-reconciliation.json`, and
the Art Desk workspace tracks the published head and re-pulls every minute. No
Drive, no inbox, no connector.

**Finished artwork comes back through the exchange**, which is what the rest of
this document is about. A batch in `01_INBOX` is images plus a manifest. A
request has no image, so a request put there is rejected as "missing or not an
image".

Filing a record under `art/requests/incoming/` does neither. See the last
section.

## The one thing to get right

A batch folder must never be visible in the inbox before all of its files are
in it. The bench treats `manifest.json` as the declaration that the batch is
finished, so a manifest that lands before its images declares a batch that does
not exist yet.

`importBatchFolder` in `scripts/dev-lab/artbench-store.ts` tests exactly one
condition: `manifest.json` exists, or a `COMPLETE` marker exists. A folder
with neither is skipped silently and reconsidered on the next pass. Nothing in
that path reads a timestamp, so when a folder was created does not matter — only
what is in it at the moment the scan sees it.

## Writing a batch

**From the Mac, into the local inbox:** write the image files first and
`manifest.json` last. The module header states this (`inbox/ — folder per
batch, manifest.json last`). A `COMPLETE` marker file works the same way if a
manifest is not wanted yet.

**From a cloud session, through the Drive connector:** writing the manifest
last is necessary but not sufficient. The bench reads a Drive-for-desktop
mirror, and the mirror does not preserve the order the files were uploaded in,
so a manifest can appear locally before the image it names however carefully it
was sent. Assemble the batch outside the inbox instead, and move it in whole:

1. Create the batch folder somewhere outside `01_INBOX`.
2. Upload every file into it — the images and `manifest.json`.
3. List the folder and confirm every declared file is present.
4. Move the finished folder into `01_INBOX`
   (`11NUdShqpptAYqttOhpVFaiNikOkyrZwE`) — with the Drive connector that is
   `update_file` with the inbox as the new `parentId`.

A move is atomic, so the folder arrives with everything or not at all. This is
the only method proven to work from a cloud container.

## A mistimed batch cannot be re-sent under the same id

When the bench reads a batch whose declared file is not there, it records that
item as `rejected: missing or not an image` in its per-batch done map, and
every later pass skips an item already in that map. Adding the file afterwards
changes nothing. Re-send under a **new `batchId`** and a new folder name.

Splitting deferral from rejection in the bench landed on the client line at
`cd7c7702`, which makes a late file recoverable. Until a sender is certain it
is running against a bench that carries that change, assume a mistimed batch is
lost and write the folder correctly in the first place.

## The bytes have to decode, and the sender is the one who has to prove it

The bench rejects an item it cannot decode with
`truncated-or-corrupt: PNG did not decode`. A file can carry a correct PNG
signature and a correct `IEND` and still be rejected, so checking those two is
not a check. Verify the whole file before sending: every chunk's CRC against
the chunk's own bytes, the IDAT stream inflating to exactly
`height * (1 + width * channels)` bytes, and nothing trailing after `IEND`.

Never hand-assemble a raster with `printf` and hex escapes. Use a real encoder.
A probe built that way on 2026-09-22 passed a signature-and-tail glance twice
and was still corrupt — two bad chunk CRCs and a truncated IDAT — and cost two
round trips to find.

Put the file's SHA-256 in the manifest's `sourceSha256` tag and download the
uploaded file back before declaring the batch. That way a later corruption
report can be settled against the local Drive mirror rather than argued about:
bytes that hash correctly in Drive and fail at the bench are a mirror problem,
and bytes that were wrong all along are the sender's.

## The manifest

Copy the shape of a batch the bench has already accepted rather than inventing
one. `batchId` matches the folder name, and `items[]` carries one entry per
file with at least `itemId`, `file`, `requestId`, `requestVersion`, `worker`,
`provider` and `promptRef`. Real batches also carry `editKind`, `nativeDetail`,
`referenceInputs`, a `note` addressed to the reviewer, and `tags` — including
`sourceSha256`, and `reviewQueue`, `deskTitle` and `deskSummary` keyed
`cand-<uuid>:value`.

If `items` is absent or empty the bench falls back to ingesting every image
file in the folder, using each filename as its item id. That fallback loses the
note, the tags and the provenance, so it is not a substitute for a manifest.

## Filing is not sending

A record written under `art/requests/incoming/` with `npm run intake:request`
is a file in the repository. That command writes, lists and validates; it has
no delivery step and nothing else reads the directory and forwards it. The
record becomes a request the owner can see only once it is promoted into
`art/requests/asset-requests.json` and pushed. Say "filed on branch X" until
then, and keep "sent" for something that actually moved.
