---
id: tests-counted-vote-share-split-first-place-glencoe
title: "The counted vote-share test is red at Glencoe, Minnesota: a record's people all went to one candidate where the share rule gives a third"
area: elections
kind: bug
priority: 2
size: S
status: in-pr
standard: 2
claimed-by: claude/fable-b-counted-share-block-votes
pr: #9488
after:
blocked-on:
root: design-electorate-one-model
lead: governing
model: opus
effort: medium
source: views thread, Nov 14 (seen while gating views cut 3b)
---

**What.** In a played council race at Glencoe, Minnesota, a counted record's people are all counted for one candidate, while the share rule the test applies gives that candidate about a third of them. Either the count took first place where the ballot carries no party labels, or the test reads the ballot's labels differently from the count. If the count is wrong, a town's council result leans further to the front-runner than its voters do. Seen: election night results for a council race.

**Cause.** Measured: Glencoe, Minnesota (2723948), world seed c3a4a781467791bd848ee7f0b8de51031278f5ba68a7fe8f7e8c66376933b904, `COUNTED_SHARE_SEED=3e755ead4b7c2887 npx vitest run src/core2/counted-vote-share.test.ts` on the train at 53e4b29fe8: red before, 6 of 6 after pull request #9488. The cause is the one written in `elections-counted-vote-share-test-red-magnolia`: the race fills several seats, so the count gives each person up to that many votes and the test gave one; and the ballot read back lacked two inputs the count used. This item is that item's twin.

**Fix.** Built in pull request #9488; see `elections-counted-vote-share-test-red-magnolia`.

**Time box.** 3 hours, Opus at medium effort.

**Rules.** One model, two tiers: a counted record's people divide by the share rule unless the ballot carries party labels (CTO, Nov 1, 22:10). Never loosen a test to get green.

**Done when.** The test passes at seed 3e755ead4b7c2887 and at two other seeds named in the PR; a second session, on the train or main in a drawn place it names with its seed, reads a council race's counted split in dev mode and sees each record divided by the rule its ballot calls for.

**Waits on.** Nothing.

**Files.** src/core2/modules/voting.ts, src/core2/counted-vote-share.test.ts

**Notes.** Nov 14 (claude, views thread): found while gating views cut 3b; red on the clean train at the same seed. Where to look: how the count decides a ballot is labeled (`countedShareRule` and `countedChoice` in src/core2/modules/voting.ts) against the test's `labeled` (any field entry with a side). Nov 15 (views thread): red the same way at `COUNTED_SHARE_SEED=b1c797aabcbd8a47` (Courtland, Minnesota (2713582), world seed 226cdca9ce46725a9dce17dec6f92c7d875e69fd79e222ee13a92a642ad9e228, draw b1c797aabcbd8a47:1, contest contest:seat:gus2025:138621:council:0:2026-11-03, "expected 1 to be close to 0.3480") on the train at e9ecbfad, before the counted-carry change. Nov 15 (counted-carry thread): not the kept-ballot fault in elections-kept-counted-ballot-drops-life-and-popularity; this test stays red at both seeds above with that fix.
