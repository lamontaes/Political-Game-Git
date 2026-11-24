---
id: director-circumstance-news-keeps-five-rows-lose-it
title: "Five circumstance rows lose their scene when the day it is due goes to another scene; each can keep its news"
area: director
kind: bug
priority: 3
size: S
status: open
claimed-by:
pr:
after:
blocked-on:
source: found while carrying #7965 (PR #9328), the study-formed row
lead: words
standard: 2
model: sonnet
effort: medium
root: none
---

**What.** A circumstance row with one `afterDays` comes on that one day or never. The director stages one circumstance per controlled person per day, so when another scene takes the day the news is lost. #9328 adds `keepsDays` (src/director/circumstance.ts, ledger.ts) and marks `study-formed-member` with it. Five rows in src/director/data/circumstances.json can lose their news the same way and have not been marked: lobby-remembers (afterDays 2), office-doubt (1), bribe-accused (1), mentor-weighs-in (1), away-evening (1). Seen: a player who lobbied, saw a protest, or was asked by the party never gets the scene on a busy day.

**Cause.** Found in code: src/director/ledger.ts `produceCircumstances` takes one pick per person per day. By reading, and not yet measured, lobby-remembers (office.voted, day 2) loses to the vote's own floor debate scene; office-doubt (civic.protest, civic.strike) loses to the day's work or household scene; bribe-accused (scandal.reported) loses to the scandal's own reaction scene; mentor-weighs-in (party-asked) loses to the party ask's own scene; away-evening (public-meeting) loses to the meeting scene.

**Fix.** For each row, find by staging what it loses to in a played world, then add `keepsDays` with a stale age that fits the news (a week for a protest, a few days for a party ask), with a test that stages the cause through the game's own path and sees the scene on a later morning, once.

**Time box.** 3 hours for a Sonnet session at medium effort.

**Rules.** No new stopgaps. Tests pinned to a named place and seed, with explicit limits. Never loosen a test.

**Done when.** A second session, at a drawn place and seed it names, stages each of the five causes in a played world, sees the scene play on a later morning than the scene that took its day, and sees it play once. Seen:

**Waits on.** The `keepsDays` field in #9328.

**Files.** src/director/data/circumstances.json, src/director/ledger.ts
