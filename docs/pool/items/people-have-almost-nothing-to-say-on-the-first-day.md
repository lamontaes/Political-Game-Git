---
id: people-have-almost-nothing-to-say-on-the-first-day
title: "On day one a call to almost anyone has nothing to say, and nobody opens on their own work or home"
area: director
kind: bug
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: words
source: "Words builder A, Nov 14, 2026, from #9247 and the readers' notes"
model: opus
effort: medium
root: none
---

**What.** On the opening day of a generated town, the room's own check (`openConversation(..., { byPhone: true, look: true })`) finds something to say for almost nobody, so a call is not offered, and a person met in the room opens on little. A town already in motion has people with jobs, homes, rent and views on record on day one. Seen: at Cranston, Rhode Island (seed b550a10bcd3bf708) 1 of 14 people had something to say by phone on day 0, 6 on day 7 and 14 on day 30. Seen: the player rings a relative or friend on the first evening and the call is offered and has something in it.

**Cause.** Measured: at Cranston, Rhode Island, seed b550a10bcd3bf708 (and Sumiton AL 18661a5958abacd3, Deepstep GA 5c1b2e77d3a94f10): src/director/conversation-phone.test.ts at the pinned places Cranston RI (b550a10bcd3bf708), Sumiton AL (18661a5958abacd3) and Deepstep GA (5c1b2e77d3a94f10), calls to the 14 people on days 0, 10, 30 and 300 (`PHONE_DAYS` run, Nov 14): calls with words on day 0 are 1 of 14 at Cranston. Two parts, both in src/director/conversation.ts: (1) the subjects an acquaintance can raise are news from the days that pass (`recentDays`, the moments of a ledger), and none exists before days pass; (2) the order of the opening topics (`OPENING_ORDER`, `mainTopic`) does not open on a person's own work or home subjects, which exist on day one (the employer, the shift, the rent due), so the person has something they could say and the talk does not reach it.

**Fix.** In `mainTopic` and `OPENING_ORDER`, let a person who has no news raise their own work or home subject from the records that exist on the first day (their job from `jobs`, the rent from the finance contract, their household), once, by the same `raiseSubject` path. No new subject kinds and no new lines: every subject already has words. Calls then open for people whose day-one records hold something.

**Time box.** 4 hours for one Opus session at medium effort. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Wire to the world: every feature moves money, people or places, proven in a generated world, from the records of that town. One engine per mechanic: reuse `raiseSubject` and the existing subjects. Nobody is cast for the player without their press. A person says how it feels, never the figure.

**Done when.** A second session, in a drawn place with its seed named, plays the case on main through the screens a player reaches and sees the result in the player's words, by record id.

**Waits on.** nothing.

**Files.** src/director/conversation.ts, src/director/conversation-phone.test.ts
