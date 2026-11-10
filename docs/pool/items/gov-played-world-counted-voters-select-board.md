---
id: gov-played-world-counted-voters-select-board
title: "Golden path M0-13: counted voters cast no votes in a Massachusetts town's select board races (North Westport)"
area: gov
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
lead: governing
source: Story session, Nov 10, golden-path-year on PR #8162 (red twice); red on Fable's rules branch 2ff1b67353 at the same place and seed
claimed-at:
---

**What.** `tests/golden-path/played-world.node-test.ts` "counted voters vote in local races" fails at `GOLDEN_PATH_SEED=58286e55b54cd665cff6a4922fa234643040a00042155c688ac71302cb5eca8a GOLDEN_PATH_PLACE_KEY=2549710` (North Westport, Massachusetts). The test reads: "3 of 3 local races decided in the run had no votes from the counted population, 3 of them with no counted ballot record although the town has 3929 counted adults (for example Select board member; Select board member; Select board member)." The same failure shows on `claude/fable-words-reply-follows` (2ff1b67353), so it is not from the words PRs stacked on it. The earlier cases were fixed for other kinds of places (`gov-played-world-counted-voters-red`, #5865; `gov-played-world-counted-voters-township-board`, #6055); a New England select board race is a kind those fixes did not reach.

**Rules.** One rule, all 56 places: the counted population votes in every local race the same way, whatever the office is called or whether it carries party labels; no place or office named in logic. One model, two tiers: a counted group votes by the same rule as a full person, times its count.

**Done when.** At the place and seed above, every select board race decided in the year has counted ballots on record, the played-world test passes there, and it still passes at a second drawn place and seed.

**Files.** src/core2/modules/voting.ts (holdElection)
