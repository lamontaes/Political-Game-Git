---
id: words-out-on-bail-contradicts-more-than-i-have
title: "A housemate who says bail is more than they have also says out on bail"
area: words
kind: bug
priority: 2
size: S
status: merged
standard: 2
claimed-by:
pr: 9313
after:
blocked-on:
lead: words
model: sonnet
effort: medium
root: rc3-thin-life-record
source: Account lead, from the played housemate court case at Cinco Bayou FL (court-h:1), Nov 14, 2026
checked: s3 2026-11-14
---

**What.** At Cinco Bayou, Florida (draw court-h:1) the housemate says "They set bail. It's more than I have." and, asked "What happens now?", answers "Out on bail." The two lines contradict each other. Seen: the talk at home after a housemate's charge.

**Cause.** Found in code: `caseFacts` in `src/director/conversation.ts` set `bailOver` or `bailCovered` by comparing the accused's cash at the time of telling against the bail. The justice engine had already posted the bail (`decision: "posted"` on `justice.pretrial:<case>`; `holdBail` moves the sum out of the accused's hands), so their cash then always reads short of it. The bank's "Out on bail." required only `bail`, so it also played for a person the engine held for want of bail, who has the `held` mark and no `bail` fact at all, and for a no-bail-law release.

**Fix.** Read the pretrial decision, not the cash: `posted` gives `bail`, `bailCovered` and `bailPosted`; `held` gives `held`, `bail` and `bailOver`; a release under a law that ended cash bail gives no bail fact. "Out on bail." requires `bailPosted`. The other answers to "What happens now?" were read against the same record and need no change.

**Time box.** 2 hours, Sonnet medium.

**Rules.** No dice; plain American English; a person says how it feels and never a figure; replace never layer.

**Done when.** In a drawn place (Cinco Bayou FL, draw court-h:1, and North Druid Hills GA, draw court-h:0, named) at Cinco Bayou FL (court-h:1) the housemate who says the bail is covered may answer "Out on bail."; at North Druid Hills GA (court-h:0) the housemate the engine held never does; a test pinned to both places holds it. A second session plays Cinco Bayou on main and sees no contradiction.

**Waits on.** Nothing; built on the train head.

**Files.** src/director/conversation.ts, data/english/parts/conversation.json, src/director/court-bail-talk.test.ts (new)

**Notes.** Filed on the court-case carry branch. The same PR says every length in talk in words (`lengthSaid`): months under two years, years to the half year after (Words lead ruling, Nov 14).
