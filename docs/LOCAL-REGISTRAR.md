# Local registrar — work that needs a machine this session cannot reach

Every cloud Project thread runs in an ephemeral Linux container with the
repository, GitHub and Drive, and nothing else. This file is the standing list
of work that therefore cannot be finished from a cloud thread, written so that
whoever is at the Mac — Lamontae, a local Claude, Codex, or ChatGPT reading it
back — can execute an entry without asking what was meant.

Each entry says what is blocked, the exact commands to run, and what to check
afterwards. An entry is deleted when it is done. This file is not an archive of
resolved items; if it is still here, it is still outstanding.

Last reconciled: 2026-09-21, from the `claude/current-art-source` thread.

---

## L1 — The private art pack cannot be received into a cloud container

**Blocked, for two independent reasons.** Generation 16, pack
`modular47-gen16-postmerge-65f7704b6f35`, 18,138 assets. The payload is 16
Drive parts totalling about 1.89 GB plus a 10,057,140-byte metadata archive.

1. A cloud session's writable disk is a fixed per-session allowance and the
   transfer does not fit, so the pack cannot be extracted, verified or served
   from here.
2. The Drive connector itself fails reproducibly above roughly 7 MB per file.
   The art bench lane measured it on this exact connector: plates under 5.3 MB
   came through, and three at 7.14, 7.86 and 7.88 MB failed on every retry,
   while the catalogue and smaller files were fine. It is a per-file ceiling,
   not an access problem, so no cloud session can pull these parts however much
   disk it has. Any plan that assumes a large single file arrives through Drive
   is wrong.

**This is what blocks the retired-cast deletion.** The retired Visual4 records
are not merely a fallback: `src/presentation/engine-people29-review.ts` builds
the character library the player's own figure is drawn from out of Visual4's
catalogue slots, generations, garment fit and skin tone, and
`src/presentation/bundled-art.ts` bundles every PNG under
`art/generated/candidates/`, which includes the Visual4 pixels. Deleting them
before the generation-16 kit supplies those same four things would leave the
figure renderer resolving to nothing. The deletion is written and waiting; it
runs once the pack is in, which is this entry.

**Run, at the Mac:**

```sh
# 1. Fetch and verify the existing 16-part payload per its own instructions.
#    Drive 1n0sKy378xpBDV-Y3pQAN6XP3dw34mxaI
#    Concatenated archive SHA-256:
#    0c179f907899a5b956440d5d2cc6d4a1244f4bd10d7b33233f85bbcb3d1e45b9
#
# 2. Fetch the corrected metadata and assembler.
#    Drive 1XPXN--QSVwa356lENWlhV4mCtSlRmjps, 10,057,140 bytes, SHA-256:
#    22a17b92e19fdf3ba59569821d8b5591db6aa3f708c430b311def0008a10a0e3
#    Verify the hash, then extract into its own directory.
#
# 3. Assemble the new pack (Python 3.9+), from that directory:
python3 assemble-private-pack.py \
  --base   /absolute/path/to/old-extracted/private-candidate \
  --output /absolute/path/to/new/private-candidate-65f7704b
```

**Verify:** the assembler reports 18,138 assets; Python manifest SHA-256
`51d54a72ec27cd0fd5e64f0420f82b91d2ba80432e542781b328695fae8972a0`; hub asset
manifest SHA-256
`6ac6ad0bddd06eb50425a6267bdf7817b69f86dcf0c2fd56ca64ed22ca530254`. It refuses
an existing output directory and does not modify the base.

---

## L2 — Serving that pack to a browser needs the cache built locally

**Blocked:** the loader and the dev/preview content route are in the repository
(`src/presentation/runtime-art.ts`, `scripts/dev-lab/runtime-content-origin.ts`,
PR #276), but the cache they read has to be built from the pack in L1.

**Run, at the Mac, after L1:**

```sh
node --import tsx scripts/content/validate-art-snapshot.ts \
  /absolute/path/to/new/private-candidate-65f7704b/manifest.json

node -e '
  import("./desktop/runtime-content.mjs").then(({ receiveContent }) => {
    const r = receiveContent({
      sourceRoot: "/absolute/path/to/new/private-candidate-65f7704b",
      manifestPath: "manifest.json",
      cacheRoot: "/absolute/path/to/ocd-content-cache",
    });
    console.log(JSON.stringify(r, null, 2));
  });
'

PG_RUNTIME_CONTENT_CACHE=/absolute/path/to/ocd-content-cache \
PG_RUNTIME_CONTENT_ID=<the id receiveContent printed> \
  npm run dev
```

**Verify:** the dev server starts (it refuses to start on a corrupt cache),
`/__content/manifest.json` returns JSON with that id, and the creator and room
draw generation-16 people rather than the bundled fallback. Report the id.

---

## L3 — Playwright trace and video artifacts cannot be collected here

**Blocked:** the cloud container's outbound network goes through an agent
proxy. Browser runs work, but uploading or downloading large trace and video
artifacts is unreliable through it, so a failing browser case cannot be
inspected frame by frame from a cloud thread.

**Run, at the Mac:**

```sh
npx playwright test tests/e2e/<the failing spec> --trace on --video on
npx playwright show-trace test-results/<run>/trace.zip
```

**Verify:** the trace opens and shows the failing step. Paste the failing
assertion and the last screenshot into the thread; that is enough for a cloud
thread to write the fix.

---

## L4 — Merging is the owner's button

**Blocked:** no Claude session can approve or merge. Four pull requests are
open and none can land without Lamontae.

- **#275** `claude/project-thread-w3zsrg` — skills receipt, date and trait fixes.
- **#276** `claude/current-art-source` → `codex/client-content-delivery` — the
  shared art identity fix and the first retired-cast deletion.
- **#277** `claude/release-0-3-0` → `main` — accepts 0.3.0, releases 0.4.0.
- **#278** `codex/client-content-delivery` → `main` — the client line
  integration branch.

**Verify:** #276 merges into #278's branch first, then #278 into main. #277 is
independent and can go any time.

---

## L5 — The installed client, its saves and its port

**Blocked:** `/Applications/Our Civic Duty Private.app`, the Art Desk, the
saved games and any local server are on the Mac. A cloud thread cannot install,
launch, screenshot or inspect them, and must not be told that a passing test
means the installed build works. Native activation is separate evidence from a
cloud preview.

**Run, at the Mac:** launch the app, open Settings, and read back the host,
game, client and content identities it reports.

**Verify:** they match the head the cloud thread names in its report. A
mismatch means the build predates the change being discussed.

---

## L6 — Git history purge: the parts a cloud session cannot reach

**Blocked:** a history rewrite of this repository is authorized, but some of
what it is meant to remove is not reachable from a cloud session even with the
rewrite done. Specifically: GitHub's own `refs/pull/*` refs are read-only and
survive a force-push; Actions artifacts and caches have their own retention;
and any fork or local clone keeps the old objects until it is re-cloned.

**Freeze list — every branch must be re-based onto the rewritten history, not
force-pushed over.** A rewrite rewrites every reachable commit, so any branch
that is not accounted for at the moment of the rewrite either loses its work or
reintroduces the purged objects when it is next pushed. At the time of writing
that is 324 branches, and these are the ones carrying live, unmerged work:

- `claude/current-art-source` (#276), `claude/release-0-3-0` (#277) and
  `codex/client-content-delivery` (#278) — this lane's own.
- `claude/nationwide-government`, `claude/modular-legislation`,
  `claude/people-and-life` (#273) and `claude/nationwide1-measure-bundle`.
- `codex/systemic-modular-repair` — separately watched; not this lane's to move.
- `claude/art-bench-requests-sbi892` (draft PR #281, based on main, head
  `1038869b`) — the art bench lane's regional plates under
  `art/families/regional-opening/`. New paths, no collision with this lane's
  deletions, but it must be frozen and re-based like the rest. It also writes
  to this registrar file, so expect to share it.

**Run, at the Mac, after the rewrite lands:**

```sh
# Every existing clone must be re-cloned, not pulled. An old clone will
# reintroduce the purged objects on its next push.
mv ~/Documents/<each existing checkout> ~/Documents/<name>-preserved-old
git clone https://github.com/lamontaes/Political-Game-Git.git <name>

# Then delete the preserved copies once their unmerged work is recovered.
```

**Verify:** `git log --all --oneline -- art/generated/candidates/people-visual4`
returns nothing in the fresh clone. In the GitHub UI, check Actions → Caches
and delete any cache entry older than the rewrite. Expect `refs/pull/*` to
still contain the old objects; that is a GitHub retention fact, not a failed
purge, and it should be reported as such rather than claimed clean.

---

## L7 — Drive deletions the cloud connector may refuse

**Blocked:** permanent removal covers Drive mirror items, old packed archives,
review bundles, thumbnails and obsolete task documents. The Drive connector can
trash files it can reach, but it cannot empty the Trash, cannot touch items
owned by another account, and cannot pause a sync client that would recreate
them.

**Run, at the Mac:** after a cloud thread reports which items it trashed, empty
the Trash for exactly those items, and pause the Drive sync client for the
affected folders while doing it.

**Verify:** the named items are gone from Trash and do not reappear after the
sync client resumes. Anything the connector could not reach stays listed here
with its Drive id until it is gone.
