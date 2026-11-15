---
id: director-two-noes-no-third-ask
title: "A person told no twice about the same thing does not come to the player a third time"
area: director
kind: wiring
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
after: director-relation-passed-between
blocked-on:
lead: words
model: sonnet
effort: medium
root: none
source: Words lead ruling, Nov 15 (class H: the person says "All right. I won't ask a third time.")
claimed-at:
checked: words builder A 2026-11-15
---

**What.** Two refusals on the record between the same two people about the same subject mean the scheduler does not stage that ask a third time. The person's last answer to the second no is the line "All right. I won't ask a third time." The Words lead ruled it as part of class H, and the arc-variant history read owns the count. Seen: after the player turns someone down twice, that person never comes back with the same ask.

**Cause.** Found in code: `refused-before` is already counted by the arc-variant history read (`kind: "history"` in src/director/arc-variant.ts, rows in src/director/data/arc-variants.json) for bribes, and the scene packet now carries `refused-before` from the same `scene.reply` records (`passedBetween` in src/director/relation-facts.ts), but nothing asks that read before staging an ask, so the same person can be staged again.

**Fix.** One copy of the rule, in the arc-variant history read: before a scene of an ask purpose is staged for the same asker, asked and subject, the scheduler asks it for the count of refusals in `scene.reply` records; at two, no scene is staged. The closing line is a bank piece placed by the count. No second counter in the ask scenes.

**Time box.** 3 hours for one Sonnet session; push what passes and stop.

**Rules.** No dice: the count of refusals decides, not a roll. Replace, never layer: no counter beside the arc-variant read. Seen: a person the player refused twice does not appear at the player's door with the same ask.

**Done when.** At Sheridan WY, seed 7 (named in the test), a person asks, is refused, asks again, is refused, and a third staging does not happen; the played file shows the closing line and the record ids of both refusals. A second session checks the same on main at a drawn place from all 56.

**Waits on.** director-relation-passed-between (#9444).

**Files.** src/director/arc-variant.ts, src/director/scheduling.ts, src/director/data/arc-variants.json, data/english/parts/scene-talk.json
