# MORNING23 B — frozen return and visual evidence

Standalone identity repair: `c0a662f4bc2c2489756a487efb5f2948a1b52462`.
Its parent is #206 `0d4ffcba5b987cf6ea313687a3672591ff51c911`, preserving #183.
The repair does not depend on the later wardrobe controls. Cherry-pick the
bounded commits after those donors; do not take the donor's whole root.

The subsequent UI delta owns only SavedAppearance/WardrobeFigure and its
browser proof. PlayerGame and navigation remain untouched. An NPC dossier is
read-only and offers an explicit **Your wardrobe** disclosure, naming the
controlled character. Saved preferences come from that character's context,
not the inspected NPC. C/A can mount these same controls directly in Personal
when integrating their navigation. There is no new gallery, renderer or art
promotion. The original and masked polo are existing bank assets.

## Continuity

The donor's unpinned v2 and pinned gen2 snapshot fixtures demonstrate both
failures: a moving current generation and new families placed in old gen2 can
change resolved components. Published Visual4 memberships and definition
signatures are now frozen. New entries enter a later generation; freeze its
ledger before the next expansion. The old v2 fallback remains gen2, while
v1/missing appearances and unpinned explicit selections retain their prior
behavior. New coherent production-world creation persists a pin.

Migration is person-owned and nondiegetic. Browser/SQLite loads validate the
original snapshot first, migrate the returned World, and persist it on normal
save. Original bytes remain available until that save. Browser durable-content
tracking continues to identify the old bytes until the new write succeeds.
**#197 adapter:** apply the same helper after portable-import validation, keeping
that feature's original backup and per-slot interface state; do not migrate
inside deserializeWorld, whose callers require exact raw byte roundtrips.
The #206 donor has no #197 portable import UI, so the browser import proof uses
its validated BrowserSaveStore record seam. It is not a claim that #197's full
portable-import journey has been tested here.

## Actual evidence and acceptance

Artifact root: `/private/tmp/morning23-b-evidence` (outside tracked history).
`morning23-b-final-routes`: three fresh lives with pointer room selection,
card, NPC read-only dossier, actual conversation portrait, own wardrobe,
explicit body selection, masked-polo choice, seated refusal, Keep/reopen and
exact component equality. Two old donor fixtures also open as distinct slots.
`morning23-b-old-routes`: both old lives additionally traverse card, supported
conversation, own wardrobe, save/reopen and exact component equality.
Each run has harness source/browser/origin provenance. The old fixtures were
captured from #206; the browser fixture harness explicitly assigns control to
one existing person and creates disposable slots, never edits owner saves or
injects a new person. Fresh-life tests use normal creator controls.

Original and masked outfits are captured at the same 200px-wide, aspect-ratio
preserving full-body preview. Neck, sleeve ends, arms, shorts and feet can be
seen. Screenshots show the same selected face/hair/body across the clothing
change and reload. This is visual inspection, not human art acceptance.
The room capture still shows oversized placement and an opening panel covering
the figure's center hit target; exposed pointer coordinates and keyboard work.
Room calibration / opening-panel layout belongs to A/G/C, not this identity fix.

Exact pose gap: selected family
`wave-a-average-woman-standing-neutral-front-a-v1-pv4` plus
`pv4-wave-a-female-top-burgundy-short-sleeve-polo-v1-armmasked` has no same-family
`seated-guest-neutral` body/garment counterpart, so it refuses. The source
`art/generated/candidates/recent-drive-sweep/fat-man/wave_a_fat_man_seated_conversational_open_hand_v1.png`
exists and was inspected; it is a seated angled bare-body source with a gesturing
arm. It is not a front-view clothed counterpart for this selected identity.
It needs view-compatible head/hair, garment sleeve/torso, bent-leg bottoms,
footwear and authored contacts/fit before this compositor can use it faithfully.
No whole-bank missing-pixels claim, source deletion, fit-limit relaxation,
seed weighting, new paid generation or minor/adult substitution was made.
Working/speaking expansion beyond this inspectable standing outfit remains open.

Checks executed: focused continuity, browser persistence and selection suite
(78 tests); coherent-v2/legacy and catalog suites; TypeScript; scoped ESLint and
Prettier; validate:art, inventory:art and qa:art. Art outputs are preserved under
art-checks in the external evidence root rather than refreshing historic tracked
contact sheets. The full combined integration gate is A's responsibility.

## LEARN

Two durable mechanisms address the recurring bugs: a committed generation ledger
rejects edited published definitions, and old-save component fixtures exercise
actual persisted lineage. Browser source identity caught generated QA output
changing during a run; subsequent proof waited for artifact generation to finish.
Keep art generation and frozen browser runs sequential. Do not solve this by
adding another intake inventory or a larger instruction itinerary.

The attempted cross-task reply to A was rejected by automatic approval review
as an unverified destination. User authorization was requested; this local
handoff remains reviewable without sending private repository content elsewhere.
