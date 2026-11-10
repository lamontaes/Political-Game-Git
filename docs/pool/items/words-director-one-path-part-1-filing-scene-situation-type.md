---
id: words-director-one-path-part-1-filing-scene-situation-type
title: "The filing scene runs through the situation type"
area: director
kind: cleanup
priority: 1
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: words
model: opus
effort: medium
root: design-story-director
source: split from words-director-one-path in the pool redo, Nov 10, 2026
checked: fable 2026-11-10
---

**What.** Part of words-director-one-path. The filing counter is played by a bespoke visit while the scheduled `filing` scene cannot be worded, so the same filing has two paths. Move the visit into the one scene path and delete the duplicate. The counter's where, the clerk and the after-filing line must come from the filing and petition records.

**Cause.** Design: docs/reports/words-director-plan-2026-10-28.md (owner approved Oct 28, 2:10 PM), sections 1 and 3: two bespoke visits sit beside their situation types; src/director/filing-visit.ts still carries the filing visit while the scheduled `filing` type (src/director/data/situation-types.json) cannot be worded by purposeScene.

**Fix.** Make the `filing` situation type stage a filing-clerk scene that purposeScene can word (where, post and after-filing lines from the filing and petition records, the clerk cast from filingClerkFor), and retire the bespoke visit once the scene plays the same counter. Takes in words-filing-clerk-scene-where and words-filing-clerk-line-after-filing (the clerk says one line from a group meant for after filing, never the raw word 'on-ballot').

**Time box.** 8 hours for one Opus session.

**Rules.** Replace, never layer: the duplicate is deleted in the same change and the PR body counts it. A scene is staged from the record that causes it (scene-producers). No hand-written player text: words come from the English banks. One rule, all 56 places.

**Done when.** A second session files for office in two drawn places (named with seeds; Deer Park, Washington seed 393dad669a24a488:1 and Topsfield, Massachusetts seed 6a7f8264-ee6f-4845-854e-60ff289f587a among them) and sees the clerk's scene played from the situation type with the where, the post and an after-filing line each citing the filing record id, no raw status word spoken, and the bespoke visit code gone (grep named).

**Waits on.** Nothing.

**Files.** src/director/filing-visit.ts, src/director/purpose-scene.ts, src/director/data/situation-types.json, src/bench/filing.ts, data/english/parts/scene-talk.json
