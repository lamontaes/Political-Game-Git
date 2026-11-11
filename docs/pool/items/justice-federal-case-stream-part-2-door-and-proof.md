---
id: justice-federal-case-stream-part-2-door-and-proof
title: "A door opens a federal case, the stock is shown against the Bureau of Prisons table, and an enacted mandatory-minimum bill moves the floor"
area: world
kind: feature
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
after: justice-federal-case-stream-part-1-case-on-open
blocked-on:
lead: governing
model: sonnet
effort: medium
root: rc1-world-outside-town
source: split from justice-federal-case-stream in the pool redo, Nov 10, 2026
checked: fable 2026-11-10
---

**What.** With a federal case that can be opened (part 1), the player or dev mode needs a door that opens one, and the federal courts need their proof: the stock after ten years shown next to the Bureau of Prisons table by offense group, and an enacted mandatory-minimum bill changing the sentencing floor a case reads. The stock is produced by the flow and the stay shares, so the comparison is a report, not a target. Nothing is steered to the Bureau's figures. Feeds: justice-federal-case-stream.

**Cause.** Design: docs/design/country-tier.md (the rest of the country as counts stepped by the same rules, built into people when opened). Found in code: `openFederalCourts` (src/core2/modules/federal-courts.ts, line 251) installs the flow; no screen or dev control opens a federal case, and SG-LAWS-federal-position-no-reader in src/core2/data/stopgaps/laws.json still lists federal mandatory minimums.

**Fix.** Add a dev-mode control (and the player's door if the Government screen has a courts line) that opens a federal case through part 1's function. Run ten years in a test, print the stock by offense group next to the Bureau's table, and show that enacting the reduce-mandatory-minimums bill through the real bill route changes a later case's sentence. Remove this question from SG-LAWS-federal-position-no-reader.

**Time box.** 6 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** No dice: nothing in the proof is steered to the Bureau's table; it is reported beside the result. The chain is the acceptance: the bill, the law in force, the case's sentence and the stock are followed by record id. Replace, never layer: the stopgap row loses this question in the same change.

**Done when.** A second session, not the builder, plays two drawn places (names and seeds in the PR body), opens a federal case from the door and sees its defendant, judge and sentence, runs ten years and reads the federal stock next to the Bureau of Prisons table by offense group, and passes the reduce-mandatory-minimums bill through the real bill route to see a later case's sentence change, by record id. The law checker grades the question's reach.

**Waits on.** justice-federal-case-stream-part-1-case-on-open.

**Files.** src/core2/modules/federal-courts.ts, src/core2/modules/laws.ts, src/core2/data/stopgaps/laws.json, src/bench/dev-mode.ts, src/core2/federal-courts-proof.test.ts (new)
