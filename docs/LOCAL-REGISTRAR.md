# Local registrar — work that needs a machine this session cannot reach

Every cloud Project thread runs in an ephemeral Linux container with the
repository, GitHub and Drive, and nothing else. This file is the standing list
of work that therefore cannot be finished from a cloud thread, written so that
whoever is at the Mac — Lamontae, a local Claude, Codex, or ChatGPT reading it
back — can execute an entry without asking what was meant.

Each entry says what is blocked, the exact commands to run, and what to check
afterwards. Numbers are claimed as entries are written, so a gap means an entry
was finished and removed. An entry is deleted when it is done. This file is not
an archive of resolved items; if it is still here, it is still outstanding.

Several lanes write here, and each entry names its owner. Add your entry at the
end; do not edit someone else's except to correct a fact you have measured, and
say so in the entry when you do.

Last reconciled: 2026-09-22, from the people and life thread — the union of
`claude/current-art-source` (L1 to L7, L9) and
`claude/art-bench-requests-sbi892` (L8), with L1 expanded into runnable steps
and corrected.

---

## L1 — Assemble the private art pack, and commit it

**Owned by the art, client and release lane; the step-by-step below was
supplied by the people and life lane on 2026-09-22.** Generation 16, pack
`modular47-gen16-postmerge-65f7704b6f35`, 18,138 assets, about 1.89 GB.

**Why no cloud session can do it.** The payload is sixteen Drive parts plus a
10,057,140-byte metadata archive. The Drive connector fails reproducibly above
roughly 7 MB per file — the art bench lane measured it on this exact connector:
plates under 5.3 MB came through, three at 7.14, 7.86 and 7.88 MB failed on
every retry. It is a per-file ceiling, not an access problem, so no amount of
container disk helps. Any plan that assumes a large single file arrives through
Drive is wrong.

**Correction to an earlier version of this entry.** This was previously written
up as the thing blocking the retired-cast deletion, on the reading that the
player's own figure is drawn out of Visual4's catalogue. Measured at main
`7869561e`, that is not so: `PRODUCTION_CHARACTER_LIBRARY`
(`src/presentation/visual-integration.ts:784`) is built from
`art/manifest/asset_manifest.json`, whose 126 assets resolve to zero paths
under `people-visual4*` or `wave-a-*`; `WardrobeFigure` takes its libraries as
a prop and `CreatorAppearanceStep` renders it only when
`artPreviewLibraries(mode)` is non-null, which it is only in `candidate-review`
mode. `engine-people29-review.ts` is itself one of the three review-only
modules. The retired cast can therefore be deleted without this entry being
done first; the two jobs are independent.

**The decision on committing it.** Asked whether 1.9 GB should go into
permanent repository history, the owner answered "commit". Step 6 does that.
Read the cost note at the end before running it.

### What you need first

- Python 3.9 or newer (`python3 --version`).
- About **8 GB free disk**: 1.5 GB of chunks, 1.5 GB of reassembled archive,
  1.9 GB extracted base, 1.9 GB assembled output, plus the repository.
- A clone of `lamontaes/Political-Game-Git` containing main `7869561e`.

### Step 1 — Download the sixteen chunks

All sixteen into one directory, exact names kept:

```sh
export PACK="$HOME/civic-pack"
mkdir -p "$PACK" && cd "$PACK"
```

| #   | File                                        | Bytes     | Drive                                                                  |
| --- | ------------------------------------------- | --------- | ---------------------------------------------------------------------- |
| 01  | `private-candidate-3eaa20fe.tar.gz.chunk01` | 100663296 | https://drive.google.com/file/d/1rMHo1cKndEhL8dRiPctxzLbn9yRIswh-/view |
| 02  | `private-candidate-3eaa20fe.tar.gz.chunk02` | 100663296 | https://drive.google.com/file/d/1af21YymUMikBo8ZzgfoKhboTDhK6PRg4/view |
| 03  | `private-candidate-3eaa20fe.tar.gz.chunk03` | 100663296 | https://drive.google.com/file/d/1gb9WrYR1jZaRtTQEr6TGrgnLwBetF1wf/view |
| 04  | `private-candidate-3eaa20fe.tar.gz.chunk04` | 100663296 | https://drive.google.com/file/d/1J9e-EXnE38-z1syYXyxiJHZiK2jQJZRA/view |
| 05  | `private-candidate-3eaa20fe.tar.gz.chunk05` | 100663296 | https://drive.google.com/file/d/1A9Q0fB2F2kMwv7IcVBiOp3FpQshiPshW/view |
| 06  | `private-candidate-3eaa20fe.tar.gz.chunk06` | 100663296 | https://drive.google.com/file/d/1k7UWFJAJpY8DcQP5oiVzyKHgnIKnUlu6/view |
| 07  | `private-candidate-3eaa20fe.tar.gz.chunk07` | 100663296 | https://drive.google.com/file/d/1U7XyGpFsCPBickzlLbnofMEnhbwVFtz2/view |
| 08  | `private-candidate-3eaa20fe.tar.gz.chunk08` | 100663296 | https://drive.google.com/file/d/1qAmaI8zfYM1m8XAbS6dfRLtH9PgfaXZf/view |
| 09  | `private-candidate-3eaa20fe.tar.gz.chunk09` | 100663296 | https://drive.google.com/file/d/1Q3Ia4pq7AM-tUknJ56EbiLpdKlz1txSE/view |
| 10  | `private-candidate-3eaa20fe.tar.gz.chunk10` | 100663296 | https://drive.google.com/file/d/1oS0SMK5XP1WiQQMdws7zsw8fZ547_KKy/view |
| 11  | `private-candidate-3eaa20fe.tar.gz.chunk11` | 100663296 | https://drive.google.com/file/d/1enGPij8hFcJIo6T7cB0bLk5P8ktt2XRo/view |
| 12  | `private-candidate-3eaa20fe.tar.gz.chunk12` | 100663296 | https://drive.google.com/file/d/1WmsiP5Ime4fRDl_mDOPrJ2MQm3obd5hR/view |
| 13  | `private-candidate-3eaa20fe.tar.gz.chunk13` | 100663296 | https://drive.google.com/file/d/1wjflKX1O8cvN-bbwZaSDDylU5pA7RdzT/view |
| 14  | `private-candidate-3eaa20fe.tar.gz.chunk14` | 100663296 | https://drive.google.com/file/d/1y8D2q8efk3-duvN3fMQqNkwG59fwSEBT/view |
| 15  | `private-candidate-3eaa20fe.tar.gz.chunk15` | 100663296 | https://drive.google.com/file/d/1oCX8udiq2fmQ3929vxsogRx5b2WnS3nU/view |
| 16  | `private-candidate-3eaa20fe.tar.gz.chunk16` | 11839157  | https://drive.google.com/file/d/1JyqJ5pS4LNzbN1fNoof_NbGBv6nstNQ9/view |

Into the same directory, also:

- `MODULAR-3eaa20fe-PRIVATE-PACK-TRANSPORT.json` —
  https://drive.google.com/file/d/1eH3Hyq37hgchGkyaSPBfD6GE5fWU2lSL/view
  (4.6 KB; it holds the per-chunk SHA-256s, so no hash has to be retyped)
- `modular65-pack-metadata.tar.gz` —
  https://drive.google.com/file/d/1XPXN--QSVwa356lENWlhV4mCtSlRmjps/view
  (10,057,140 bytes)

### Step 2 — Verify every chunk before joining anything

```sh
cd "$PACK"
python3 - <<'PY'
import hashlib, json, os, sys
m = json.load(open("MODULAR-3eaa20fe-PRIVATE-PACK-TRANSPORT.json"))
bad = []
for p in m["parts"]:
    n = p["name"]
    if not os.path.exists(n):
        bad.append(f"{n}: missing"); continue
    if os.path.getsize(n) != p["bytes"]:
        bad.append(f"{n}: wrong size, re-download"); continue
    h = hashlib.sha256()
    with open(n, "rb") as f:
        for b in iter(lambda: f.read(1 << 20), b""):
            h.update(b)
    if h.hexdigest() != p["sha256"]:
        bad.append(f"{n}: wrong hash, re-download")
    else:
        print(f"{n}: ok")
print("\n".join(bad) if bad else "all 16 chunks ok")
sys.exit(1 if bad else 0)
PY
```

Re-download only the chunks it names, and do not continue while any line says
`re-download`. A truncated Drive download is the usual failure here, and it
leaves a file of plausible size.

### Step 3 — Join and extract

```sh
cd "$PACK"
cat private-candidate-3eaa20fe.tar.gz.chunk{01..16} > private-candidate-3eaa20fe.tar.gz
shasum -a 256 private-candidate-3eaa20fe.tar.gz
stat -f %z private-candidate-3eaa20fe.tar.gz
```

Expect exactly

```
0c179f907899a5b956440d5d2cc6d4a1244f4bd10d7b33233f85bbcb3d1e45b9
```

and `1521788597` bytes. Then:

```sh
mkdir -p "$PACK/old-extracted"
tar -xzf private-candidate-3eaa20fe.tar.gz -C "$PACK/old-extracted"
ls -d "$PACK/old-extracted/private-candidate"

shasum -a 256 modular65-pack-metadata.tar.gz
# expect 22a17b92e19fdf3ba59569821d8b5591db6aa3f708c430b311def0008a10a0e3
mkdir -p "$PACK/meta"
tar -xzf modular65-pack-metadata.tar.gz -C "$PACK/meta"
```

Once the archive has extracted cleanly the sixteen chunks can be deleted; they
are recoverable from Drive.

### Step 4 — Build generation 16

`assemble-private-pack.py` ships inside the metadata archive. It verifies all
18,138 assets, refuses to write into a directory that already exists, and does
not modify the base it reads.

```sh
cd "$PACK/meta"
python3 assemble-private-pack.py \
  --base   "$PACK/old-extracted/private-candidate" \
  --output "$PACK/private-candidate-65f7704b"
```

**Verify:** it reports pack `modular47-gen16-postmerge-65f7704b6f35`,
generation 16, 18,138 assets, all 38 source hashes matching the received
`65f7704b` tree, and all 2,730 old-generation files preserved. Then the two
manifests:

```
51d54a72ec27cd0fd5e64f0420f82b91d2ba80432e542781b328695fae8972a0   Python pack manifest
6ac6ad0bddd06eb50425a6267bdf7817b69f86dcf0c2fd56ca64ed22ca530254   hub asset manifest
```

If either differs, stop and say so rather than staging it. A pack that is not
the one the engine side was built against would connect the creator to artwork
nobody has verified.

### Step 5 — Stage into the checkout

The pack ships its own staging script; use it rather than copying by hand,
because it places each file where `private-candidate-manifests.ts` resolves it
by glob.

```sh
cd /absolute/path/to/your/Political-Game-Git
git fetch origin && git status --short      # must be clean before staging
"$PACK/private-candidate-65f7704b/stage-into-worktree.sh" "$PWD"
```

It needs the matching source checkout — the branch carrying PR #273's 102
source files. If it reports a source mismatch, check that branch out and run it
again.

### Step 6 — Commit

These paths are ignored today, so committing them is deliberate:

```sh
git checkout -b registrar/gen16-pack
git add -f art/generated/candidates art/manifest
git status --short | wc -l          # sanity: expect roughly 18,000 lines
git commit -m "art: stage the generation-16 private candidate pack"
git push -u origin registrar/gen16-pack
```

Its own branch, not main and not a lane branch, so the size change lands in one
reviewable place.

### What committing 1.9 GB costs, in measured numbers

Measured in a full checkout on 2026-09-22, so this is chosen rather than
discovered later:

- `.git` today is **881 MB** (`size-pack` 879.19 MiB). The working tree, not
  counting `.git` or `node_modules`, is **1.5 GB**.
- The pack adds roughly **1.5 GB of already-compressed blobs to history** and
  about **1.89 GB to the checkout**. These are PNG and SVG bytes that are
  already compressed, so Git will not shrink them, and delta compression
  between generations will save little.
- A fresh `git clone` therefore goes from about **0.9 GB downloaded** to about
  **2.4 GB**, and from about **2.4 GB on disk** to about **3.4 GB**.
- That is paid by **every future clone, every CI job that clones, and every
  worktree**, permanently — not only by whoever wants the artwork.
- **Deleting the files later does not undo it.** The blobs stay in history.
  Taking them out means another force-pushing history rewrite across every ref,
  and this pack is about **five times the size** of what the Visual4 purge
  removes.
- The alternative, if you would rather: leave the pack out of Git and keep
  staging it into the worktree as today.
  `src/presentation/private-candidate-manifests.ts` resolves private manifests
  by _optional_ glob precisely so a checkout without the bytes composes only the
  published libraries and does not break. No code needs this commit.

You said commit, so the steps above commit. This note is here so the number is
in front of you at step 6 rather than afterwards.

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
  to this registrar file: it created the same path independently on main, then
  rewrote its own entries as L8 under this preamble and in this format. The
  merge is a mechanical union — keep the preamble once and keep both sets of
  entries, rather than picking a side.

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

---

## L8 — Three approved regional plates are too large for the Drive connector

**Blocked:** five regional scenes are owner-approved and integration-ready on
the Art Bench. Two were fetched into the repository and committed byte-exact.
Three could not be: the Google Drive connector available to a cloud session
fails with `MCP server "Google_Drive" session expired` on every file above
roughly 7 MB, reproducibly, across retries. The two that succeeded are 4.99 MB
and 5.29 MB; the three that fail are 7.14 MB, 7.86 MB and 7.88 MB.

This is a transport ceiling, not a permissions problem. The bench catalog, the
events index and the two smaller plates all came through the same connector.

**Effect on play:** `art/regions/regional-scene-places.json` records those three
regions with `"plate": null`, so the resolver reports
`matched-region-has-no-plate` and the introduction shows no picture for them
rather than a wrong one. Nothing is broken; three approved pictures are absent.

**Run, at the Mac:** the files are already in the Drive mirror.

```sh
cd /absolute/path/to/your/checkout
git fetch origin claude/art-bench-requests-sbi892
git checkout claude/art-bench-requests-sbi892

MIRROR=~/Library/CloudStorage/GoogleDrive-lamontaebilling@gmail.com/"My Drive"/00_OUR_CIVIC_DUTY_ASSET_FACTORY_ACTIVE/80_ARTBENCH_EXCHANGE/02_CATALOG/candidates
DEST=art/families/regional-opening

cp "$MIRROR"/7c46ac03d9f7fa3e545caf26a675cba1d2e710ceaa5573dd38be256b3c83bfcd.png \
   "$DEST"/env_regional_socal_inland_bungalow_neighborhood_v1.png
cp "$MIRROR"/0a82edbe6dbf9d0ef8c88f4ddb32917133ea57e4e823cb0a9c6e72a7c230ff0e.png \
   "$DEST"/env_regional_pacific_temperate_rainforest_v1.png
cp "$MIRROR"/c3cc8800440d77db4b63d563d7d48357629392f0db474b9c1526bae72fb0e818.png \
   "$DEST"/env_regional_norcal_oak_woodland_v1.png

shasum -a 256 "$DEST"/env_regional_socal_inland_bungalow_neighborhood_v1.png
shasum -a 256 "$DEST"/env_regional_pacific_temperate_rainforest_v1.png
shasum -a 256 "$DEST"/env_regional_norcal_oak_woodland_v1.png
```

Each hash must equal the source filename it was copied from. Then record the
three in the coverage document: each entry's `plate` goes from `null` to the
four facts the gate checks — the path, that sha256, the real pixel dimensions,
and the bench candidate id.

| region key                           | candidate id                                | pixels      |
| ------------------------------------ | ------------------------------------------- | ----------- |
| `socal-inland-bungalow-neighborhood` | `cand-8fd6953d-04f9-f787-19de-9b770bff7b96` | 2576 x 1616 |
| `pacific-temperate-rainforest`       | `cand-4163d8ca-7ad4-4853-86ce-ccd8e30aa889` | 2512 x 1664 |
| `norcal-oak-woodland`                | `cand-dee5a58b-5a28-e810-a8a6-fbe319f2f67b` | 2352 x 1760 |

```sh
npm run validate:regional-scenes -- --check
npx vitest run src/authoring/regional-scene-coverage.test.ts
git add art/families/regional-opening art/regions/regional-scene-places.json
git commit -m "regional-opening: receive the three remaining approved plates"
```

**Verify:** the coverage gate exits 0 and reports five regions with a delivered
plate. Do not re-encode, downscale or optimise these PNGs — approval is of
those exact bytes and the gate re-hashes them.

---

## L9 — Eight Art Desk plates the manifest names but Git does not carry

**No longer blocking CI.** The gate used to demand the bytes of every row,
so eight rows naming files under `art/generated/candidates/art-desk/playtest65/`
— a path `.gitignore` line 22 excludes on purpose — failed `npm run validate:art`
and `tests/art-asset-factory.test.ts`, and with them the `repository` job on
`codex/client-content-delivery` and everything based on it. The gate now reads an
unreleased row under that private root as a declaration rather than a promise,
and all eight rows say so themselves: `availability: production-candidate`,
`qa_status: pending`, `runtime_release_status: unreleased`. Released art is
unchanged and must still be present, hashed and measured.

The eight files, each named by `art/manifest/asset_manifest.json`:

```
art/generated/candidates/art-desk/playtest65/environment/white-house-wide-r1.png
art/generated/candidates/art-desk/playtest65/environment/white-house-wide-r6.png
art/generated/candidates/art-desk/playtest65/environment/resolute-desk-r1.png
art/generated/candidates/art-desk/playtest65/environment/civic-generic-r1.png
art/generated/candidates/art-desk/playtest65/environment/civic-generic-r3.png
art/generated/candidates/art-desk/playtest65/regional/pikeville-valley-street-firefly-434644-r1.png
art/generated/candidates/art-desk/playtest65/regional/wooded-valley-street-cleanup-r2.png
art/generated/candidates/art-desk/playtest65/regional/great-plains-pond-r1.png
```

**What is left is an art question, and it waits for the owner.** None of the
eight is retired, so none is a deletion target. Two of them are already
installed and selected by the runtime through the private pack; the rest are
production candidates. Nothing here needs doing for the repository to be green.

When the owner wants any of these plates actually shipped rather than held
privately, the row moves to a released path the way every other shipped plate
does — `art/generated/approved/` or `art/families/<family>/` — with its
`qa_status` and `runtime_release_status` raised to match. That is the route;
widening `.gitignore` to force megabytes of private candidate bytes into the
repository is not, and a peer session's go-ahead is not the owner's word for it.

They cannot come through the Drive connector, which fails above roughly 7 MB
per file — see L1 — so any trip that carries them is a trip to the Mac.

---

## L11 — Three regional scene records the Art Bench catalogue cannot settle

**Blocked:** three of the twenty-three regional scenes carry a catalogue defect
recorded as a `sourceNote` in `art/regions/regional-scene-places.json`. None of
them can be settled from a cloud thread, because each needs a look at the
source bank behind the bench rather than at the catalogue row.

- `appalachian-town-january` selects the same sha256 as
  `playtest65-region-pikeville-valley-street`. One of the two records is not
  what it claims. The question is what that shared file actually is: the parent
  both rows derive from, a reference image, or a finished winter output that
  one row is mislabelling.
- `subtropical-mangrove-wetland` selects a record that is 640x432.
- `lower-mississippi-delta-marsh` selects a record that is 688x456.

The last two are preview or reference sizes, not delivered plates. The other
approved regional originals are 2208 to 2576 px. **No enlargement**: scaling
these up and recording the result as native detail is not an option, and the
sizes above are measurements of the selected records, not of any original.

**Effect on play:** all three regions carry `"plate": null`, so the resolver
reports `matched-region-has-no-plate` and the introduction shows no picture for
them. Nothing renders wrongly; three scenes are absent. They are also among the
eighteen regions with no place selectors, so even a correct plate would reach
no player until the place IDs come back (`regional-scene-place-ids` in the
research queue).

**What is needed, at the Mac or from whoever can read the source bank:** for
each of the three, either the larger original with its sha256, or a statement
that the request was never finished and the row should stay without a plate.
For the Appalachian row, what the shared file is, in those three terms.

**Then, in a checkout:**

```sh
npm run validate:regional-scenes -- --check
npx vitest run src/authoring/regional-scene-coverage.test.ts
```

Record the answer by replacing that region's `sourceNote` with the finding, and
adding a `plate` only where a real original was found.
