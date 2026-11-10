---
id: core-memory-heard-knowledge-keys
title: "A big town's people hold 1.5 million heard facts by the spring primary, and none of them is ever forgotten"
area: core
kind: bug
priority: 1
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
model: opus
effort: high
root: rc5-full-detail-every-day
lead: speed
source: added with npm run pool -- add
---

**What.** In the world `npm run speed:year` plays for Arcadia, California (0602462, seed app-heap-1), core.knowledgeByPerson grows from about 1.05 million keys in January 2028 to 1.55 million by March 21, about 1,900 full people, while the heap after collection goes from 2,569 to 3,074 MB. At the desktop app's 4,096 MiB limit the fourth year dies there. The keys are heard promises (one per listener per statement, campaigns.ts), speeches and campaign messages heard, news read, and people met and named, and only bare event:...:experienced keys are ever forgotten (knowledge-retention.ts). This item also takes the Nov 4 finding of core-memory-experienced-key-window: shortening experiencedKeyRetentionDays (parameters.json line 5596, read in knowledge-retention.ts line 112) to 45 days did not help (year 3 heap 2,444 MB against 2,436 MB), so that window is not the lever.

**Cause.** Measured: Arcadia, California (0602462, seed app-heap-1), `npm run speed:year` over 4 years at --max-old-space-size=4096: core.knowledgeByPerson grows from about 1.05 million keys (January 2028) to 1.55 million (March 21), heap 2,569 to 3,074 MB, out of memory in year 4. Most keys are heard promises (one per listener per statement, src/core2/modules/campaigns.ts). Only bare event keys are ever forgotten (src/core2/knowledge-retention.ts).

**Fix.** Re-measure Arcadia on main first, because core-long-run-demoted-knowledge and core-long-run-forgetting-queue landed after the Nov 4 numbers. Then store a heard promise as an id in a per-voter set instead of a full fact object with its own source string, keep it until the candidate's next election (the window that src/core2/modules/voting.ts line 800 and src/core2/modules/record.ts line 202 read, Nov 8 ruling) and fold it into the candidate's kept or broken record by area after that. Drop each other key kind after the window its readers use; the readers are listed in the Notes below. Agree each window with the lane that owns the reader.

**Time box.** 10 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Speed: memory stays flat; old records fold into summaries once play no longer reads them, with each reader's window agreed with its owner. Ask why: a stance that cites a heard promise or story must still find its source while it is read. An effect is a read, not a record: a key no engine reads after its window goes. One model, two tiers: a counted voter's heard promises fold by the same rule as a full person's.

**Done when.** A second session, not the builder, runs `npm run speed:year` for Arcadia, California (0602462, seed app-heap-1) over 4 years at --max-old-space-size=4096 in the played world and it finishes all four years without running out of memory, or the report names the next table by size with its key count. The same second session plays to the next election in a drawn place and seed it chose and opens a candidate's record: the kept and broken promises voters hold against them still show, with the heard source readable. The PR body lists every reader of each folded key kind with its window, and the knowledge-retention test passes.

**Waits on.** Nothing.

**Files.** src/core2/knowledge-retention.ts, src/core2/state.ts, src/core2/modules/campaigns.ts, src/core2/modules/record.ts, src/core2/modules/voting.ts

**Notes.** lead: speed. Measured by Lane 5, Nov 4 (unit 7 card in docs/lanes/state/lane-5.md). Owners to agree windows with: Lane 1 (campaigns, promises), Lane 2 (news, views), Lane 3 (director reads).

Reader sweep, Nov 4 10:15 UTC (Lane 5), every reader of `knowledgeByPerson` outside state.ts on main: heard promises are read by `modules/record.ts:202` and `modules/voting.ts:800` (a voter holds a kept or broken promise against the speaker at the next election), so they must last a term and can't go by age. News keys (`newsKey`) are read by `voting.ts:789,1237`, `place-prices.ts:629,691` and `news.ts:485`, the director's `conversation.ts:818` and `bring-it-up.ts`. Organization and role keys are read by `people.ts:614`, `drives.ts:2049,2078` and `life.ts:77,331`. Whole-store scans: `conversation.ts:542,2156`, `bring-it-up.ts:268`, `campaigns.ts:5293`, `corruption.ts:332`. Proposal: keep each key kind its readers need, but store a heard promise (value "heard") as an id in a per-voter set, not a full fact object with its own source string. That is about three quarters of a promise key's memory; the record and voting reads become a set lookup. That touches Lane 1's campaigns.ts, record.ts and voting.ts and needs Lane 1's agreement (asked on docs/lanes/state/lane-1.md).
