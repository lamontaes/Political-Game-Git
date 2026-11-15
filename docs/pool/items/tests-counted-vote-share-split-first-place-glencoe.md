---
id: tests-counted-vote-share-split-first-place-glencoe
title: "The counted vote-share test is red at Glencoe, Minnesota: a record's people all went to one candidate where the share rule gives a third"
area: elections
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
root: design-electorate-one-model
lead: governing
model: opus
effort: medium
source: views thread, Nov 14 (seen while gating views cut 3b)
---

**What.** In a played council race at Glencoe, Minnesota, a counted record's people are all counted for one candidate, while the share rule the test applies gives that candidate about a third of them. Either the count took first place where the ballot carries no party labels, or the test reads the ballot's labels differently from the count. If the count is wrong, a town's council result leans further to the front-runner than its voters do. Seen: election night results for a council race.

**Cause.** Needs cause. Measured: `COUNTED_SHARE_SEED=3e755ead4b7c2887 npx vitest run src/core2/counted-vote-share.test.ts -t "(d)"` fails at Glencoe, Minnesota (2723948), world seed c3a4a781467791bd848ee7f0b8de51031278f5ba68a7fe8f7e8c66376933b904 (draw 3e755ead4b7c2887:1), contest contest:seat:gus2025:211760:council:0:2026-11-03: "record person_00a9071d490f1ef0 for person_04d18fdb3241b8b1: expected 1 to be close to 0.3264194198807234". Red on the train at 214e6a6e, with no views-from-life cut 3 change; the record named differs between runs, the split of 1 against a share near a third does not.

**Fix.** None until the cause is found.

**Time box.** 3 hours, Opus at medium effort.

**Rules.** One model, two tiers: a counted record's people divide by the share rule unless the ballot carries party labels (CTO, Nov 1, 22:10). Never loosen a test to get green.

**Done when.** The test passes at seed 3e755ead4b7c2887 and at two other seeds named in the PR; a second session, on the train or main in a drawn place it names with its seed, reads a council race's counted split in dev mode and sees each record divided by the rule its ballot calls for.

**Waits on.** Nothing.

**Files.** src/core2/modules/voting.ts, src/core2/counted-vote-share.test.ts

**Notes.** Nov 14 (claude, views thread): found while gating views cut 3b; red on the clean train at the same seed. Where to look: how the count decides a ballot is labeled (`countedShareRule` and `countedChoice` in src/core2/modules/voting.ts) against the test's `labeled` (any field entry with a side). Nov 15 (views thread): red the same way at `COUNTED_SHARE_SEED=b1c797aabcbd8a47` (Courtland, Minnesota (2713582), world seed 226cdca9ce46725a9dce17dec6f92c7d875e69fd79e222ee13a92a642ad9e228, draw b1c797aabcbd8a47:1, contest contest:seat:gus2025:138621:council:0:2026-11-03, "expected 1 to be close to 0.3480") on the train at e9ecbfad, before the counted-carry change. Nov 15 (counted-carry thread): a likely cause is in elections-kept-counted-ballot-drops-life-and-popularity: the kept row is read back without the voter's life stake and the country's view, so the test's share rule works from an appeal the vote did not use; not yet shown at this seed.
