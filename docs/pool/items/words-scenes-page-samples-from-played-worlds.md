---
id: words-scenes-page-samples-from-played-worlds
title: "The owner's Scenes page is fed by one playable sample per scene type, written from a played world"
area: words
kind: feature
priority: 1
size: M
status: open
standard: 2
claimed-by: Story lead (claude/dazzling-wozniak-vgomoz-samples)
pr:
after:
blocked-on:
lead: words
model: fable
effort: high
root: none
source: owner, Nov 13 ("let me click through the conversation and choose my own dialogue and see the replies"); CTO, Nov 16, on #9750 (one JSON file per scene, kept in the repo, published by the CTO)
---

**What.** The owner grades scenes by playing them on a click-through page and sending voice notes, and the page the Account lead made did not work. The CTO publishes the page from scene files Story keeps in the repository, one per scene type, each holding the opening, every wording, the replies at each turn and what each pick leads to. Nothing on the page is written by hand; it is a view of scenes the director staged in a played world.
Seen: the Scenes page shows every type the director staged in a run, and the owner can press the replies as a player would.

**Cause.** Found in code: src/director/purpose-scene.ts `purposeScene` already composes a scene's whole exchange as a tree (`SceneTalk.tree`, src/director/scene-talk.ts `TreeNode`, with each line's tied wordings on `placed.ties`), but no script writes it as a playable file; the earlier batches were made by hand from the bank (scripts/dialogue-batch/make-batch.py), so they showed lines placed by nothing and left out the record-placed scenes.

**Fix.** Add scripts/words/scene-samples.ts, which plays a drawn world as a resident, a legislator or a mayor for a run of days, composes each staged scene through `purposeScene` and writes docs/scenes/samples/<typeKey>.json and INDEX.json (the newest sample of a type replaces the older). The owner sees the samples on the CTO's page; a Story session refreshes them after every words PR that merges.

**Time box.** 3 hours for the Story lead on Fable at high effort, then one refresh run per merged words PR.

**Rules.** Replace, never layer: the hand-made batch script and its batches are deleted once the page reads these files. No dice: the samples are what the director staged, drawn from all 56 by the seed, nothing picked by hand.

**Done when.** A second session, on main, runs the script at a drawn place and a seed nobody chose (`--seed <word> --as resident`, then `--as legislator`), finds one file per staged scene type under docs/scenes/samples with its place and seed in `world`, opens one on the CTO's page and presses a reply, seeing the line the file says it leads to; every `wordings` entry is a piece key that exists in data/english/parts/scene-talk.json.

**Waits on.** Nothing.

**Files.** scripts/words/scene-samples.ts (new), docs/scenes/samples/README.md (new), docs/scenes/samples/INDEX.json (new)

**Notes.** Filed by the Story lead, Nov 16. The CTO's page format is the "Dialogue Batch" page the owner liked; the CTO reads INDEX.json and the per-type files. A refusal or a no the player picks writes nothing here: the samples are read-only views.
