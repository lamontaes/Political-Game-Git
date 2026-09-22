# 96 Modular character generation triage

Status: engineering findings, measured on branch
`claude/character-rendering-triage-19kvvz`, based on
`codex/build-6146df3-source` at `6146df35`. Nothing here releases a pixel,
approves an anchor, or changes a production character catalog. Every body
discussed is a candidate awaiting the owner's own look.

The assignment was: triage modular character generation, put hero poses on the
main menu, and make people sit in seats the right way.

## What was actually wrong

The short version is that almost none of it was a rendering bug, and none of it
was a shortage of art.

**Nobody sat down because the pipeline had no word for an angle.** Nineteen
seated figures had already been cut from the wave-a source sheets. Eleven were
correctly refused for having furniture painted into them. Six were propless,
complete, and read high-confidence — and were refused only because they are
drawn three-quarter while every registered pose family declared `facing:
"front"`. That was never a decision anybody made. It was simply true of all six
families that existed, and the admission gate encoded it as a rule. The same
collapse happened independently in the intake dispositions, which is what makes
it the vocabulary's fault rather than one script's.

**The main menu showed an empty room because nothing called the code that fills
it.** `resolveTitleLecternHero` was complete. `AmbientTableau` dropped the
figure it returned instead of handing it to the backdrop. One missing call.

**The seat contact was measuring the wrong thing, and had been all along.** See
below; this is the finding with the longest reach.

**The layered assembly is not broken.** This was checked because it looked
broken, and it is worth stating plainly so nobody spends a day on it.

## The seat contact was a leg-separation walk

`seatedPelvis` came from `measureBodyRig`'s `crotchRow`, which walks down from
the waist to the first row where the silhouette parts into two runs. That is leg
separation. On a square seated figure it happens to coincide with the seat,
which is why it survived unexamined for as long as every seated figure was
square. On a turned figure the near leg covers the far one, the silhouette never
parts at the hip, and the walk runs past the seat, past the knee, and stops at
the ankle.

One plate measured **0.777** — inside every plausibility band anyone would
think to write, and visibly at mid-shin.

This is the shape of defect that recurred all night: **a number that is correct
about something nobody asked.** It appeared three separate times in this lane —
the crotch-row shin, a `crotchSplit` flag that is true when the silhouette parts
anywhere including the ankle, and the garment landmark function deriving its hip
search from a range whose upper bound silently falls back to its lower one. A
number like that is worse than a missing one, because nothing downstream can
tell it is wrong.

Replaced with the lowest point of the hip mass on the side away from the knees.
Twelve propless seated crops across two source sets and four builds land at
**0.632 to 0.644**, against the **0.62** the pose family registry declares from
its own authoring, arrived at independently. Seated candidates carrying a usable
seat contact went from **two of nine to nine of nine**.

Full method, measured values and the refusal rules:
[Seated Pose Facing and Seat Contact](./systems/seated-pose-facing-and-seat-contact.md).
The direction convention is **D-086** in
[the decision log](./decisions/DECISION-LOG.md).

## Eight drawn people that nothing could reach

Eight `ocd_body_adult_fem_*` bodies existed on disk, chopped and despilled, and
were in **no manifest at all**. Nothing in the game could reach them. They are
now admitted through the same measurement pass, with the intake to despill to
on-disk digest chain checked per body — any break is recorded as
`retained-broken-lineage` rather than waved through.

Six admitted: three seated three-quarter-right, one standing conversational, two
standing neutral. `lineageIntact: true`.

Two refused and left refused, with reasons recorded rather than dropped: one
seated three-quarter-**left** and one turned standing, neither of which any pose
family declares. No seat and no family was invented to absorb them.

## The chair painted into the men's plates

Four wave-a seated plates have a chair drawn into them. A deterministic
subtractive pass now recovers a chairless body from each: it clears alpha below
the seat plane wherever a pixel is connected to the chair's own neutral fill and
lies outside the outline reach of the figure's own line work. **It adds no pixel
and invents no colour.** That nothing above the seat plane changed is asserted
per plate rather than assumed, and each output is read back off disk and checked
for any opaque region left touching nothing else. All four left no stray component at all, and nothing above the seat
plane changed. Between 24,014 and 39,325 pixels
cleared per plate, of which 261 to 4,764 were stranded fragments the protection
band had orphaned.

**What it cannot do, measured rather than assumed.** Chair that _touches_ the
figure survives — a sliver of seat between the thighs, a stub of leg against
each shin. It cannot be taken by colour: on these plates the figure's own edge
pixels below the knee run from value 64 to 240, and the chair's mid-tones sit at
96 to 150, inside that range on every plate. Raising the body-tone floor to
separate them starts eating the feet, which is a failure an earlier version of
this script actually shipped and which was only caught by rendering **only the
removed pixels**. Connectivity cannot take them either, because they are inside
the protection band by definition.

**Finishing it is optional.** The owner is not attached to these particular
figures and has said so; a newly generated seated body drawn free of furniture
answers the same need. What earns its place here is the method, not the four
plates: any chop can be checked for a baked prop the same way, and a subtractive
pass is verified by rendering what it removed, never by looking at what
survived.

## The candidate composites look wrong on purpose

Anyone opening the candidate contact sheet cold will see tops landing at the
nipple, trousers ending at mid-calf and shoes at the ankle, and will open the
placement code and start nudging anchors. **Do not.**

The candidate review library is deliberately built with no fit bank. Under the
pre-fit contract every non-body layer gets `fit: null` and is placed by declared
origin on declared anchor at 1:1 authored scale _within one body family_.
Putting production garments on wave-a bodies violates that precondition. Bottom
garments end at 59 to 92 percent of plate height against a feet anchor at 92 to
114 percent, and that gap is the contract refusing to stretch a garment onto a
morphology nobody has measured.

This is output that looks like a defect while being a protection working, which
is more dangerous than the ordinary kind, because the fix that suggests itself
is the damage. The route to dressed candidates is a measured fit profile per
morphology, not a nudged anchor.

The production library, separately, composes correctly: every body it holds,
hair-back at layer 10 through hair-front at 40, every garment carrying a real
fit, zero refusals. The reason play looks like blocky stand-ins is that the only
released bodies are two code-drawn development fixtures. That is a coverage
state, not a layering defect.

**Expect a refusal later and do not call it a regression.** The garment landmark
path had the same root defect as the seat contact. When the candidate bodies get
fit profiles, the turned seated ones will refuse rather than produce garments
fitted to a shin. That is the correct outcome.

## What is still genuinely missing

- **Seated bodies drawn free of furniture**, for the body families that have
  none. This is the one real art need this triage produced.
- **A measured fit profile per candidate morphology**, without which no
  candidate body can be dressed.
- **The owner's eye.** Every body here is a candidate; none is released, and
  none should be. Whether these figures look right is not a thing code can
  settle.

## Evidence

| what                                     | where                                                         |
| ---------------------------------------- | ------------------------------------------------------------- |
| admission report, eight recovered bodies | `art/qa/p76/ocd-admission-report.json`                        |
| wave-a admission report                  | `art/qa/p95-wave-a-morphology/wave-a-admission-report.json`   |
| chair separation report                  | `art/qa/wave-a-chairless/seated-chair-separation-report.json` |
| generated candidate registry             | `art/manifest/character_candidate_registry.json`              |
| declared pose families                   | `art/manifest/pose_families.json`                             |

## A note on the build's own checks

The `repository` check failed on this branch, and the cause was a missing
exclusion rather than anything in this work. `prettier --check .` exited 2 on 88
files: 52 under `public/data/state-voting/v1`, 30 verbatim page captures under
`docs/reference/regional-opening/raw`, and 6 ordinary markdown documents that
genuinely were unformatted.

The 82 data and capture files were never the repository's to format. The
captures are byte-identical first-party retrievals, and `retrieval-receipt.json`
records each one's exact byte length and SHA-256, so reformatting them would put
every recorded hash permanently out of step with the file it attests. Several
are malformed enough that Prettier cannot parse them at all, which is what a
verbatim capture of somebody else's page looks like. The state-voting files are
regenerated by `npm run export:state-voting-context` inside `build:steps`.

The exclusions for both already existed on `codex/client-content-delivery` and
had never been carried anywhere else. Main has neither the exclusions nor the
files, so main is internally consistent and passes; any branch built from the
client line's content without its `.prettierignore` fails on all 82. That
commit is now carried here byte-identically, so the two branches cannot drift
into different stated reasons for the same rule, and the six documents are
formatted.

One consequence worth recording, because it changes what a green-looking branch
means. `format` is the first link in `validate:ci-sharded`'s `&&` chain, so its
failure stopped every later check in the repository job from running at all.
This branch had not been failing one check; it had been failing the first and
never reaching the rest.
