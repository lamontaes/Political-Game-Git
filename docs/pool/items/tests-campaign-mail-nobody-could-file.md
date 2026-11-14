---
id: tests-campaign-mail-nobody-could-file
title: "campaign-mail.test's mail and house-party cases fail where nobody can file in the drawn place"
area: core
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
after:
source: account lead thread "Give rivals more than one issue", Nov 14
lead: governing
standard: 2
model: sonnet
effort: medium
root: none
---

**What.** The mail and house-party cases in src/bench/campaign-mail.test.ts fail in some drawn places: "mail spends what the player set on mailers and reaches the households it buys" and "offers the house party by its control word and runs the engine's donor meeting", each stops with "nobody could file", so no mailer or house party is tested there. Guards: campaign mail and donor meetings. Reproduced on the unchanged train head 3076c608 (and on the same branch with PR #9155) at Fort Thomas, Arizona (0424950), GOLDEN_PATH_SEED=1ab6a38a29c7f0cc4dd7448eb7c0a906ee49fadfac09d591ef70fee40760fbf7; also seen at Canton City (Hensel), North Dakota (3812060), run seed 415078bb420946fc86d98de5781c20fb9d673da6e12c19c471758bb4d6a9218c. Guards: mailers and house parties in a played town.

**Cause.** Found in code: world() (src/bench/campaign-mail.test.ts line 70) builds the world at START and calls openContests without first moving the clock to the day a race opens for filing, which campaign-turn.test.ts does with advanceToFilingOpen (gov-test-clock); a place whose first race opens later has no open contest, so the filing loop ends with nothing. Read from the code, not yet run with the clock moved.

**Fix.** Move the clock to the first filing day (advanceToFilingOpen) before filing, and pin the place and seed the case runs at, chosen from a built world's calendar rather than drawn until one works.

**Time box.** 2 hours for a Sonnet session.

**Rules.** One rule, all 56 places: the case names its place and seed, and a place's facts are never named in logic. Never skip, disable or quarantine the test.

**Done when.** A second session runs the two cases at a pinned place and seed named in the test and sees them pass; the two cases pass at a pinned place and seed named in the test, and fail with the place, seed and reason if no one can file there.

**Waits on.** Nothing.

**Files.** src/bench/campaign-mail.test.ts

**Notes.** Found Nov 14 running changed-file tests for PR #9155.
