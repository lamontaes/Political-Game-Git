---
id: release-main-red-card-history-service-kind
title: "The card history check rejects a military service line, a kind the card has worded since the service record"
area: release
kind: bug
priority: 1
size: S
status: in-pr
standard: 2
claimed-by: claude/red-main-card-history-service
pr: 8970
after:
blocked-on:
lead: cto
model: opus
effort: low
root: none
source: Red desk, Nov 13 (merger codex-4629 and the CTO on #8928, comments 6840076941 and 6840105210)
---

**What.** `src/bench/card-history.test.ts` fails on clean main eeec8770 and 0fe39561 at GOLDEN_PATH_SEED=ff1d275d927d964b0ed490723a9dc664f646476d (Madisonville, Louisiana). A card line "He joined the armed forces in 1995." has the kind `service`, and the check's list of the kinds a history line may name leaves it out. Any drawn place where a met person served before the start fails the same way. Seen: a person's card tells of their military service among their other history.

**Cause.** Found in code: `lineOf` in src/bench/card.ts words a person's `service/enlisted` and `service/discharged` past events with the bank's `person-history.story.service` pieces (lines 512 to 514, from the military past record src/core2/past-military.ts added by #8944 on Nov 12), so the line's kind is `service`; the kind list at line 71 of src/bench/card-history.test.ts was written before that record and was never given it.

**Fix.** Test only: add `service` to the kinds a history line may name, the same list as the bank's `person-history.story.*` moves. No other assertion changes.

**Time box.** 0.5 hours

**Rules.** One rule, all 56 places: the check keeps drawing its place from the run seed and names it. No assertion is loosened; the list matches the kinds the card's bank words.

**Done when.** A second session runs card-history.test.ts on main at GOLDEN_PATH_SEED=ff1d275d927d964b0ed490723a9dc664f646476d and at two fresh seeds, each naming its drawn place, and all four cases pass; on the bench, a card of a met person who served tells it among their history.

**Waits on.** Nothing.

**Files.** src/bench/card-history.test.ts
