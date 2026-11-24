---
id: integration-scene-lead-fits-its-setting
title: "A scene's opening line fits the place it is set: no 'waiting for you to get home' on Main Street"
area: director
kind: bug
priority: 1
size: S
status: done
claimed-by: claude/integration-scene-place-from-purpose
pr: #6439
blocked-on:
source: "Owner's screenshot, Oct 27, 6:10 PM Eastern (Berry, Kentucky, v0.59.0), relayed by the CTO"
lead: director
milestone: play-first
claimed-at: 2026-10-27T23:30:00.000Z
---

**What.** The owner saw "Elizabeth Page has been waiting for you to get home" over a Main Street storefront at 12:00 AM. The circumstance producer stages news met on the street (price-moved-street, death-known-street, rent-news-street, national-news-street, race-result-known) and at work as the news-arrives situation type with setting public or workplace, but two of that type's leads were written for home, and the director picked a lead by type alone. A lead written for one kind of place carries that place on its use, and the director says it only in a scene set there. The midnight half is integration-day-lands-on-morning-and-places-keep-hours (#6397).

**Rules.** scene-standard (a scene's words fit its records: its place comes from its purpose and setting); one rule for all 56 places; no hand-written player text. The banks are the words lead's: this tags two existing pieces with their setting and adds no text (Review: words).

**Done when.** src/director/scene-lead-fits-setting.test.ts passes: every circumstance's place has a lead that fits it, and 200 renders of the news-arrives lead at a public setting never say a home line while home still does; the test fails with the setting filter removed.

**Time box.** 2 hours; if not done, push what exists, open the draft PR, write the handoff.

**You will see.** News someone tells you on the street opens "Elizabeth Page has news for you", never "has been waiting for you to get home".

**Screenshot.** Before and after, from a drawn place, in the PR body.

**Files.** data/english/parts/scene-words.json, src/english/scene-words.ts, src/english/mined/scene-bank.ts, src/director/scene.ts, src/director/scene-lead-fits-setting.test.ts

**Notes.** Read: OWNER-DECISIONS (Oct 27, evening: "A scene's place comes from its purpose and its people"), LAW; searched: waiting for you to get home, setting, circumstance.
