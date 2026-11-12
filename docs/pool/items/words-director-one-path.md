---
id: words-director-one-path
title: "One director and one English engine: the plan's sections 1 to 4, each unit its own PR, every line in play the day it lands"
area: words
kind: feature
priority: 1
size: L
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on: words-director-one-path-part-1-filing-scene-situation-type,words-director-one-path-part-2-one-presence-decider,words-director-one-path-part-3-stakes-and-endings,words-director-one-path-part-4-opening-address-by-events,words-director-one-path-part-5-ten-missing-producers
lead: words
model: sonnet
effort: low
root: design-story-director
source: added with npm run pool -- add
checked: fable 2026-11-10
---

**What.** The words and director plan (docs/reports/words-director-plan-2026-10-28.md), approved by the owner Oct 28 2:10 PM Eastern with all six decisions yes. Sections 1 to 4: the duplicates deleted (two tree builders, two bespoke visits, three who-is-present deciders, two narrators, eleven bank loaders, two held flags, three journal-past writers, five typed-string entries, the batch tooling); the owner's voice notes of Oct 15, 23 and 24 folded into the one grade file and the sitting bans into the English guard; stakes read from the engines that own them and endings written back to them; the opening address assembled in parts by party, traits, stances and world events; the filing conversation; news bodies; the ten missing producers and the four typeless scenes. First PR is big: the voice notes applied everywhere at once.

**Cause.** Design: docs/reports/words-director-plan-2026-10-28.md (owner approved Oct 28, 2:10 PM, all six decisions yes), sections 1, 3 and 4; its section 2 (grading) is superseded by docs/design/words-machine.md.

**Fix.** Check the plan's 'What you would see first' lines 1 to 8 against main, close what holds, and build what is left in the five parts below, one PR each. Words' Nov 1 and Nov 2 notes say the duplicates (second tree builder, narrators, parts' held flag, batch tooling, address.json banks) are already gone; what is left is the bespoke filing and polling visits, the bench's own presence list, two small pickers, stakes and endings, the opening address and the producers. The filing parts take in words-filing-clerk-scene-where and words-filing-clerk-line-after-filing.

**Time box.** 16 hours across the five parts; this item is done when all five are merged and seen.

**Rules.** AGENTS.md first bullet and step 0; scene-standard; words-engine; the plan's section 5 ownership table: no screens, no kit, no elections rules. Replace never layer; every cut corner a registered stopgap; no dice; one rule all 56 places; npm run guards green; played-world proof per unit.

**Done when.** A second session replays the plan's 'What you would see first' lines 1 to 8 on main in two drawn places (named with seeds): each is a merged PR naming place, seed and record ids; the duplicates in section 1 are gone (grep named); the clerk's filing conversation reads each place's rules; a played year fires the ten producers at least once each.

**Waits on.** Its parts: words-director-one-path-part-1-filing-scene-situation-type, words-director-one-path-part-2-one-presence-decider, words-director-one-path-part-3-stakes-and-endings, words-director-one-path-part-4-opening-address-by-events, words-director-one-path-part-5-ten-missing-producers (listed in blocked-on).

**Files.** src/director/filing-visit.ts, src/director/polling-place.ts, src/director/purpose-scene.ts, src/bench/filing.ts, src/bench/story.ts

**Notes.** lead: words. Filed by the CTO on the owner's go (Oct 28). Signatures: mostly natural, with some scenes where the player earns them; signatures are the game's way of introducing campaigning (owner, 2:10 PM). Oct 28, 20:40 UTC (elections wire session): the petition record the signature scenes read is on branch `claude/elections-petition-filing` (PR to come): `petitionOf(api, filingId)` gives the signatures needed and each signer with the day and how they were asked (door, event, circle), and the clerk's check is the public record `petition-checked` (facts: status, signatures, valid, needed, filedWith). Oct 30, 10:05 UTC (Words): section 1's duplicates checked on main df0b52bde1. Gone: the second reply-tree builder (ask-talk.ts), two narrators per scene, the parts' own held flag, double trait weighting, address.json, the interview, minutes and notice banks, data/english/batches and the batch generators and page builders. Left: the bespoke filing visit (src/director/filing-visit.ts, from src/bench/filing.ts) and polling-place visit (src/director/polling-place.ts, its own ledger record) beside their situation types; the bench's own presence list for day scenes and place visits (src/bench/scene.ts presentIds, places.ts); two small pickers (screenLine in src/english/screen-words.ts, choiceName in src/bench/words.ts); src/bench/data/controls.json and play.mjs words() fallback (the lane's); nine bank-loading sites, all through admittedParts. desk-visit and desk-bill are two casts for one record (the sponsor or a lobbyist presses, else the aide or clerk brings it) and only one plays, so they stay. Nov 1, 16:20 UTC (Words): the filing duplicate traced in a played world (Monroe, Pennsylvania). The `filing` situation type stages a filing-clerk scene from candidate-filed that purposeScene can never word ("no narration for filing-clerk can be worded from the records given"). With a household stake the household talk leads; a player who lives alone gets it as an empty second visit to the clerk after the counter. Proposed to the CTO: the counter stays the action screen, and the clerk's after-filing talk (the petition) moves into the scheduled `filing` scene, worded from the filing and petition records. The lane (go ahead; proofs filing.browser.mjs, polling.browser.mjs, election-day.test.ts, jump-end.test.ts, M0-03) and the governing lead (keep openBenchFilingVisit and chooseAtCounter) agreed to the visits work. The polling-place producer is the elections wire session's (plan, section 6).

Words handoff, Nov 2 02:50 UTC (the account at its weekly limit): branch words/one-path-step6, head af0717e868, fully merged. Next step: check the done-when's plan lines 1 to 8 against main (the filing and polling visits and the petition scene landed), close what holds, and file what is left as its own items.
