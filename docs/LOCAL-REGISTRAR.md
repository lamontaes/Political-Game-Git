# Local registrar — work that needs a machine this session cannot reach

Every cloud Project thread runs in an ephemeral Linux container with the
repository, GitHub and Drive, and nothing else. This file is the standing list
of work that therefore cannot be finished from a cloud thread, written so that
whoever is at the Mac — Lamontae, a local Claude, Codex, or ChatGPT reading it
back — can execute an entry without asking what was meant.

Each entry says what is blocked, the exact commands to run, and what to check
afterwards. L8 and L11 are the art bench lane's; numbers are claimed as entries are
written, so a gap means an entry was finished and removed. An entry is deleted
when it is done. This file is not an archive of
resolved items; if it is still here, it is still outstanding.

Last reconciled: 2026-09-22, from the `claude/current-art-source` thread.

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

## L10 — WITHDRAWN: the packaging failure was not Windows-specific

**This entry asked for something that turned out not to be needed. Nothing
here is owed. It is kept only so the wrong reasoning is visible.**

It claimed the mac-arm64 and mac-arm64-art-review packaging failures were
explained by `7f74a2b9`, that win-x64 was a separate, Windows-only defect, and
that diagnosing it needed a Windows or Mac run because a cloud container has
no Electron and no Windows runner.

All three claims were wrong, and a macOS log settled it. On 2026-09-22 the
mac-arm64 **production** job failed identically to win-x64: every smoke check
passing, then `transfer-test.mjs` timing out on
`getByTestId('shell-nav-cluster')`. A failure reproducing on macOS is not a
Windows defect, and it is readable from any checkout.

The cause is the same on all three platforms. A new, unsaved life opens on the
world introduction, which the shell's nav is deliberately not drawn behind. The
smoke test was taught to dismiss it; `transfer-test.mjs` and
`hub-continuity-test.mjs` were not, so both sat on a control that is not on
screen yet until Playwright's thirty-second timeout.

`768f0dfa` fixed it and said so in its own message. The reason it looked
unfixed is that `768f0dfa` was committed onto `claude/current-art-source`
while the failing branch was `codex/client-content-delivery`, so the branch
the fix was written for was the one branch that never received it. Its desktop
portion is now applied there unchanged.

**What the wrong entry cost:** it named the platform in its title, which made
"needs a Windows machine" look like the finding rather than an assumption. The
check that would have caught it was cheap — read one macOS log before
concluding a failure is Windows-only.

**Retirement condition:** already met, unless the packaging jobs fail again at
a head that carries the ported fix, in which case this becomes a new entry
with a new diagnosis rather than a revival of this one.

## L12 — Seated male bodies need to exist drawn free of furniture

This is a requirement, not a repair, and there are two ways to satisfy it.
Pick whichever is cheaper; nothing here is owed.

**The requirement.** No man in the bank can currently sit, because every
seated male crop has furniture drawn into the same raster as the person. The
compositor has no way to separate them, so it refuses the pose rather than
seating a man in a chair he is welded to. What unblocks seated men is the
existence of at least one seated male body drawn with no furniture in it.

**Route A, the cheap one: generate them.** A new seated male plate drawn
without a chair satisfies this outright, and lamontae has said plainly that
new people are fine — the goal is that modular generation works, not that
these particular figures are rescued. This is the preferred route.

**Route B, the expensive one: repair these four.** Four existing plates carry
a baked chair:

```
art/generated/candidates/wave-a-morphology/average-man/wave_a_average_man_seated_front_neutral_v1.png
art/generated/candidates/recent-drive-sweep/fat-man/wave_a_fat_man_seated_front_chair_v1.png
art/generated/candidates/recent-drive-sweep/skinny-man/wave_a_skinny_man_seated_front_chair_v1.png
art/generated/candidates/wave-a-morphology/older-woman/wave_a_older_woman_seated_front_neutral_v1.png
```

Separating the chair in the layered source, or painting it off by hand, would
also satisfy the requirement. Only what touches the body remains — a sliver of
seat between the thighs and a stub of chair leg against each shin. Everything
floating free is already removed by `npm run derive:seated-chairless`, whose
derivatives land in `art/generated/candidates/wave-a-chairless` and stay on
disk as ordinary candidates whether or not anyone acts on this entry.

**Why code cannot do Route B.** Both numbers were measured off these plates.
Chair touching a thigh is inside the protection band by definition, so
connectivity cannot reach it. And the chair's mid-tones run 96–150 while the
figure's own sub-knee edge pixels run 64–240, so every value the chair uses the
figure uses too. Raising the body-tone floor to 160 takes the feet and shreds
the older woman's shins — that was tried, rendered and reverted. The wave-a
source sheets are in no cloud checkout, only the ocd sheet, so the
higher-resolution route is unavailable to a cloud session either way.

**Retirement condition:** a seated male body exists in the bank with no
furniture in its raster, by either route.

## L13 — The art-review build's pack-present behaviour needs a Mac run

`configuredArtConsumers(true)` — the audit that the `internal-art-review`
build profile runs inside `npm run build:steps`, via
`scripts/stamp-client-provenance.mjs` — used to throw whenever it found no
prepared standing body. That is the ordinary case on a public runner, which
is forbidden to contain a private character pack, so the build lamontae uses
to look at artwork was red everywhere except his own Mac, for having no art
rather than for anything being wrong with it.

`src/presentation/compiled-art-consumers.ts` now separates the two: no
prepared body at all records a gap and returns, and a composition that cannot
be completed when material IS present still throws, because there the
renderer's inability to use the material is exactly what the audit is for.

```
if (!bodies.length) {
  gaps.push(
    "No prepared standing body in the candidate library: this checkout has no private character pack, so no creator composition was verified here.",
  );
  return { consumers, gaps, generation, completePlans: 0 };
}
```

**Why code cannot finish it.** Only the absent-pack half is testable here.
`src/presentation/compiled-art-consumers.test.ts` covers it — the gap is
recorded, `completePlans` is 0, and the consumers already collected are not
discarded by the early return. The other half, that the throw at
`"No complete configured creator compositions could be verified."` still
fires when a pack IS present and a composition genuinely fails, cannot be
proved in a cloud container, because no cloud checkout has a pack to put in
front of it (see L1).

**What would settle it,** on the Mac, with the private pack installed:

```
VITE_OCD_BUILD_PROFILE=internal-art-review npm run build
```

Then, to prove the throw is still live rather than merely unreached, make one
prepared body fail to compose — the cheapest way is to move a single garment
file listed in the newest generation out of the pack directory — and run the
same command again.

**Acceptance condition:** the first run completes and its recorded gaps do
NOT contain "no private character pack" (the pack was seen). The second run
fails with "No complete configured creator compositions could be verified."
Put the moved file back afterwards. If the first run reports the
no-pack gap, the pack was not visible to the build and nothing about the
throw has been established either way.
