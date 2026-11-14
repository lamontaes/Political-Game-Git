---
id: core-local-official-signature
title: "A town's, township's or county's officeholders get causes of their own, as state and federal officials do"
area: core
kind: feature
priority: 3
size: M
status: open
claimed-by:
pr:
after:
blocked-on:
source: words builder, Nov 12 (PR 8878)
lead: m0-m2
standard: 2
model: opus
effort: medium
root: none
---

**What.** A mayor, a council member, a county commissioner or a township trustee is a full person whose view on each question comes from the one stance engine (src/core2/campaign-stances.ts `stanceReader`), but unlike a governor or a legislator they have no causes of their own (the officials engine's `signature` issues), so what a local speaker talks about is picked only from how strongly they hold each view and their traits. Two council members who lean the same way give speeches on the same theme. Seen: the theme and asks of a mayor's or a council member's address, floor speech and campaign speech differ by who is speaking.

**Cause.** Found in code: src/core2/modules/officials.ts `specs` skips every term whose holder is already a person (`if (term.personId) continue;`), and the town's own seats are held by residents from the opening, so no officials row (and no `signature`) is drawn for them; src/director/speech-outline.ts `standsOfPerson` marks SG-WORDS-local-speaker-no-signature for it.

**Fix.** When a resident takes or holds a town, township or county seat, draw their signature issues with the officials roster's own rule (src/core2/officials-roster.ts `drawOfficial`, from their traits and lean, seeded by world and person) among the questions their body decides (src/core2/contest-positions.ts `contestPositions`), keep them on the person's record, and have `standsOfPerson` read them as `signature`. Clear SG-WORDS-local-speaker-no-signature.

**Time box.** 4 hours.

**Rules.** No dice: the draw is seeded generation of who exists, never an outcome. One model, two tiers: the rule reads the same for every local officeholder.

**Done when.** A second session composes the local address and two council members' campaign speeches in two drawn places (`node --import tsx scripts/words/speech-outline-proof.ts <seed>`) and sees each speaker's theme come from causes of their own named on their record.

**Waits on.** Nothing.

**Files.** src/core2/modules/officials.ts, src/core2/officials-roster.ts, src/director/speech-outline.ts, src/director/local-address.ts
