---
id: research-guide-address-policy-terms
title: "The Guide has no entry for the policy terms the addresses say, so none is underlined (right-to-work, collective bargaining, rent stabilization, term limits, the debt limit)"
area: play
kind: research
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: screens
model: sonnet
effort: medium
root: none
source: Owner, Nov 16 playtest, on the Governor's address ("right-to-work, that should be something that's underlined as well"), through the Story lead's read of #9840
---

**What.** The game underlines any Guide term in player text, but the Guide holds 46 terms and none of the policy terms the addresses say. A player who does not know right-to-work or collective bargaining gets no help where the Governor says them.
Seen: Big Lake, Alaska (0207070), seed press-1117:0, and Grundy, Virginia (5133648), seed press-1117:1, pressed addresses at f03511eb19 on claude/story-addresses-unit4.

**Cause.** Found in code: src/bench/ui/term-mark.mjs `markTerms` underlines only the terms `/api/guide` returns (src/bench/guide-terms.ts `searchGuideTerms`, read from data/research/glossary/terms.json); that file has no entry for right-to-work, collective bargaining, rent stabilization, term limits or the debt limit.

**Fix.** Add one researched entry for each of the five terms to data/research/glossary/terms.json (term, short definition, explanation, related keys, a fetched and quoted source), so `markTerms` underlines them in every address, talk and news line that says them.

**Time box.** 3 hours, one Sonnet session at medium effort.

**Rules.** Research before building: each definition is written from a page actually fetched and quoted, with its source on the entry. No hand-written player text outside the Guide's own researched entries.

**Done when.** A second session starts a new game at a drawn place it writes down with its seed, plays to the Governor's address, and sees right-to-work or collective bargaining underlined where the address says it, with the Guide's entry on hover; and each of the five terms has an entry with its source in data/research/glossary/terms.json.

**Waits on.** Nothing.

**Files.** data/research/glossary/terms.json, src/bench/guide-terms.test.ts

**Notes.** Area is play because the pool check lists no screens area; the lead is screens as asked. Filed from the addresses thread (#9840, unit 4 of Story #9750 part 4), as the Story lead asked, instead of writing entries there.
