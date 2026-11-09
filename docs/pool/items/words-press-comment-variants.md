---
id: words-press-comment-variants
title: "The reporter's call about a vote plays one of several arcs, picked from the vote, the town and the two people's records"
area: words
kind: feature
priority: 2
size: M
status: in-pr
claimed-by: story/press-comment-variants
pr: "#8034"
blocked-on:
lead: words
source: owner, Nov 8 ("they've gotta have like a variance ... you could get 30 different scenes within there") and Nov 9 ("add a bunch of different scenes and scenarios and variants")
claimed-at: 2026-11-09T09:00:00.000Z
---

**What.** The press-comment scene (a reporter asks the player about a vote) played one arc however the reporter came. It now has four variants beside the plain one (friendly, hostile, scandal, national), chosen by the one arc-variant engine from records the legislature, voting, record, press and scene engines already keep: the electorate's shares against the side the member's vote took, earlier talks between the reporter and the member that ended on the record, in a quarrel or with no comment, the tie's last contact, stories of scandal against the member, and the reporter's outlet tier with the bill's level. Each variant has its own arc and its own bank pieces under `press-comment.<variant>`.

**Rules.** One engine for every kind of scene (`arc-variant.ts`). No dice, no thresholds: scores slide. Weights are TUNABLE under SG-STORY-arc-variant-weights, whose notes list the gaps (a question the survey has no item for reads nothing; no outlet-lean record; no unprinted-accusation record).

**Done when.** src/director/press-comment-variants.test.ts, in a town of a drawn place and seed where a member votes against the town on a bill, shows the reporter's call playing the variant with the highest score with the member's vote record among its reads and the town-against read equal to the electorate's margin, and controlled causes on the same two people moving to hostile, friendly, scandal and national by the margin, the earlier talks, the stories against the member and the outlet's tier; src/director/arc-variant.test.ts composes every press-comment variant whole.

**Files.** src/director/arc-variant.ts, src/director/purpose-scene.ts, src/director/data/arc-variants.json, data/english/parts/scene-talk.json, src/director/data/stopgaps.json

**Notes.** Reads added to the engine: `town-against`, `quarrel`, `national-outlet`, `scandal`, `fact-map`, and `named` and `within` on `history`. A read that came to more than nothing is also a fact of the scene (`read-<name>`), so a line that says the town was against the vote plays only where the vote record shows it.
