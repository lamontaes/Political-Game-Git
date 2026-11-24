---
id: screens-person-history
title: "Clicking a person opens View person, which tells their history from the records"
area: play
kind: bug
priority: 1
size: S
status: done
claimed-by:
pr: #6503
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** The owner, Oct 28, on the People screen, relayed by the CTO at 01:05 UTC: clicking a person opens View person, and View person shows the person's history from the records. Today a click only selects, and the card has no history.

**Rules.** History only from records that exist (past facts, the tie's last change), each line on its record id; words from an English bank; Words reviews the bank; no new records.

**Done when.** A click on the People map opens the card, whose History section lists the person's dated records oldest first with the viewer's own birth as 'You were born', shown by card-history.test.ts on a drawn place, people.browser.mjs passing, and a screenshot from a drawn place.

**Files.** src/bench/card.ts, data/english/parts/person-history.json, src/english/screen-words.ts, src/bench/play.mjs, src/bench/people.browser.mjs

**Notes.** TODO
