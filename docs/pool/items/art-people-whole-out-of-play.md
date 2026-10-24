---
id: art-people-whole-out-of-play
title: "The whole-figure people leave play; people stand generated from the Codex v2 figure set or show no figure"
area: art
kind: cleanup
priority: 1
size: M
status: claimed
claimed-by: art/people-whole-out-of-play
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-24T04:30:20.875Z
---

**What.** The owner, Oct 24: I don't know how many times I have to say it, I want the current people completely removed from the game, the ones with the airplane; I just want people standing, generated. The figures the game draws now are the 81 whole figures in art/people-whole (Oct 12 and 13), picked by src/bench/whole-figures.ts. The newer Codex set, art/people-engine/v2/figures, was saved on Oct 19 (#5123). This item takes every art/people-whole figure out of play and draws people from the v2 set standing, or draws no figure where none fits, keeping the originals in the repository.

**Rules.** Replace, never layer: the whole-figure picker and its styles leave play in the same change, and the PR body counts what was removed. Preserve asset originals, hashes and lineage: the art files stay in the repository, only their use in play is removed.

**Done when.** In the bench's played world (buildBenchWorld) in a drawn place, a browser screenshot of the play screen shows no art/people-whole figure, people drawn standing from art/people-engine/v2/figures or no figure, and a test fails if src/bench loads an art/people-whole file.

**Files.** src/bench/whole-figures.ts, src/bench/appearance.ts, art/people-engine/v2/figures/, art/people-whole/

**Notes.** TODO
