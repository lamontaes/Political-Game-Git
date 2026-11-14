---
id: words-paper-storm-damage-record-for-a-town-story
title: "A storm or flood that damaged a town is a record the paper can tell"
area: world
kind: feature
priority: 3
size: M
status: open
standard: 2
claimed-by:
pr:
blocked-on:
after:
lead: world
model: opus
effort: medium
root: none
source: added on branch claude/project-thread-aqtryq (brief M, Nov 14)
checked: m3 2026-11-14
---

**What.** The owner's side stories include trouble that is not politics. The paper prints only a federal disaster declaration, one line. No record holds the damage in a place (homes, roads, dollars). Seen: News, a story naming the storm, the homes damaged and the cleanup in the player's town.

**Cause.** Found in code: src/core2/modules/press.ts `schoolResults` neighbors, the hazard kind (a declaration only); no per-place damage row exists.

**Fix.** The hazard engine keeps a damage row per place (homes damaged, cost) the week the event ends; the paper tells it with the declaration.

**Time box.** 3 hours.

**Rules.** No dice. A story says only what a reporter could know from a record the world holds; every line is the Words lead's.

**Done when.** In a drawn place with a hazard, a second session reads the story with the damage figures matching the housing records.

**Waits on.** Nothing.

**Files.** src/core2/modules/press.ts
