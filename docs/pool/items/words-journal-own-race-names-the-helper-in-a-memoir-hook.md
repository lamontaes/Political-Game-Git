---
id: words-journal-own-race-names-the-helper-in-a-memoir-hook
title: 'A candidate''s journal line about their own lost race names a helper as "the last I''d see of"'
area: words
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: words
model: sonnet
effort: medium
root: none
source: Found while gating #9279 (Nov 14); red the same on the clean train 9ed4bf9c
---

**What.** Seen: a candidate who lost, whose race moment is shared with someone who is not a candidate (a helper who walked doors), gets "We lost. That wasn't the last I'd see of Kimberly." in their journal instead of "We lost. I didn't realize it at the time.": the race is told as if it were about the helper.

**Cause.** Measured: `GOLDEN_PATH_SEED=c637de7e8a6df4af4a071b290b962823128a48d1 npx vitest run src/director/journal-own-race.test.ts` draws Tomás de Castro, Puerto Rico (7282875), world seed 9f832a924ca8799c80d6acaa46ae93aa88c63d990ff375edd6d390f04940c2df; person_12aa6b59bfd8cbba's race moment with person_12aa6c59bfd8cd6d added as a counterpart composes the memoir hook `journal.memoir-hook.that-wasn-t-the-last-i-d-see-of-name` (data/english/parts/journal.json) with the helper as {name}, failing the test's "the race stays theirs" check (src/director/journal-own-race.test.ts line 139). Red the same way on the train 9ed4bf9c and on #9279 bd376e36, about 750 s.

**Fix.** In `composeJournal` (src/director/journal.ts), the own-race line's follow-on (the memoir hook) does not take a counterpart who is not a candidate in that race as `{name}`: the race record names the candidate, as the Storrs, Connecticut fix ruled for the line itself. Where the player sees it: the Journal the day after a count.

**Time box.** 1 hour for one Sonnet session at medium effort.

**Rules.** No line changes in the bank; the fact the hook reads changes. Ask why: the fix names the record that made the helper the hook's {name} before changing it.

**Done when.** A second session, on main, reruns the test with the seed above and it passes, and in a drawn place a lost race shared with a door-walker never names the door-walker in the race's journal line.

**Waits on.** Nothing.

**Files.** src/director/journal.ts, src/director/journal-own-race.test.ts
