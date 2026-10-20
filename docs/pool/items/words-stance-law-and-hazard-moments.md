---
id: words-stance-law-and-hazard-moments
title: "A threat over a law's effect and an alarm for a hazard need person-level moments"
area: words
kind: wiring
priority: 3
size: M
status: open
claimed-by:
pr:
blocked-on:
source: "words.md line 50 (Arrogance, anger and fear); found Oct 19"
claimed-at: 2026-10-19T23:16:32.971Z
---

**What.** The English engine has threats and alarms (the `warning` and `accusation` situation types, tagged threat), but nothing fires them: both have `causes: []` in `src/director/data/situation-types.json`, and the records they would read are not person-level. A disaster begins as one public `hazard.disaster` event with no people in it (`begin` in `src/core2/modules/disasters.ts`), so no person is warned; a law's effect on a person is recorded only for Social Security (`law.effect-learned`, `budgets-treasury.ts`), so no person threatens over it. Add person-level records the director can match: a warning a person receives from someone who heard the disaster story (read from the press story the person heard, so a person is warned only if they learned of it), and a threat from a person whose recorded loss from a law they learned of is large against their means. Each fires its situation with the cause record id.

**Rules.** Ask why: nobody is warned of a hazard or threatens over a law unless a record shows they heard of it (news received or a talk), and the line cites that record. No dice: who warns, and who threatens, follows traits, relationships and the size of the recorded loss, never a share. An effect is a read, not a record: each new record counts only once the director fires a scene or a line from it. One rule, all 56 places: the hazard and the law come from place data. No hand-written player text: the words come from the banks through the English engine.

**Done when.** In a one-year played world (`buildBenchWorld`, a drawn place from all 56, place and seed named in the PR body) a disaster declared in the town produces a `warning` scene whose cause is a named person-level hazard record and the press story that person heard, and a law that cut a person's recorded income produces a threat line citing the law-effect record; both are shown by record ids, and `src/director/*.test.ts` covers each. The owner plays it: a flood is declared and a neighbor tells you to move your car.

**Files.** src/director/data/situation-types.json, src/core2/modules/disasters.ts, src/core2/budgets-treasury.ts, src/director/scheduling.ts

**Notes.** Read Oct 19 (claude/stance-moments-g08lgv), not built. `storiesHeard(api, personId)` in `budgets-treasury.ts` is how a person's heard news is read today. The disaster emit is `begin` in `disasters.ts` (about line 172, `personIds: []`). Core files here belong to the core and world areas; a words session adds the director side and asks for the records.

Oct 20: PR #5256 merged only the spec; the person-level law and hazard records it describes are not built.
