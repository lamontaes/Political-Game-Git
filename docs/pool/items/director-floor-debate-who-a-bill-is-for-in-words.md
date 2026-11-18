---
id: director-floor-debate-who-a-bill-is-for-in-words
title: "A floor speaker cannot say who a bill is for: its reach has no said form"
area: director
kind: feature
priority: 3
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
root: none
source: filed by hand by the meetings and floor builder, Nov 14 2026
checked: meetings and floor builder 2026-11-14
---

**What.** In a floor debate the player cannot ask "Who is this for?", because the game has no words for whom a bill reaches. The Words lead ruled (rule 108) that the answer must come from the bill's reach record, so the question was cut from the floor debate on Nov 14. Seen: the floor debate scene at Delta City, Mississippi, seed meet-a1:0, offers only "What does it do, exactly?".

**Cause.** Found in code: `reachScopeOf` in src/bench/bill-stage.ts returns the law-reach data's selectors and the dev bill card shows counts (src/bench/ui/dev-bill-card.mjs); no function words a bill's reach as a phrase a person would say.

**Fix.** Add one said-form function that turns a section's reach row (people, organizations, enforcer) into a short phrase from the bill's own sections, expose it as a fact on the floor debate packet, and restore the question with its answers in the bank. One reader for the bill card and the floor.

**Time box.** 8 hours.

**Rules.** One engine per mechanic; no new stopgaps; no figures or counts in any line; plain American English.

**Done when.** A second session seats a member at a drawn place, plays a floor debate, and "Who is this for?" is answered in words from the bill's reach record. Names place and seed.

**Waits on.** Nothing.

**Files.** src/bench/bill-stage.ts, src/director/floor-debate-facts.ts, data/english/parts/scene-talk.json

**Notes.** Seen: floor debate scenes at Delta City MS, seed meet-a1:0, after #9194.
