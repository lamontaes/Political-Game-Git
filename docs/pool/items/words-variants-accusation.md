---
id: words-variants-accusation
title: "An accusation after a complaint to the prosecutor plays one of four arcs (witness, hearsay, taken, friend), picked from the complaint, the crime and the tie"
area: words
kind: feature
priority: 2
size: M
status: done
claimed-by: story/variants-accusation
pr: #8079
blocked-on:
lead: words
source: owner, Nov 8, 9:50 voice note ("they've gotta have like a variance"); the Nov 9 brief to widen variants
claimed-at: 2026-11-09T23:00:00.000Z
---

**What.** The `accusation` scene has two causes. The justice engine's `justice.accused` (a complaint to the prosecutor after an official refused a bribe, or someone who was told of one reported it) played the "threat" lines, which are a conflict-of-interest question about a firm on a bid list ("Is there a firm on the bid list for the bill that you have money in?"), and did not fit a bribery complaint. The other cause, a printed story of a bribe, keeps its own lines (key `bribe-reported`), which fit. The complaint now plays a variant family, `conflict-accuse`, through the one arc engine (`src/director/arc-variant.ts`, `data/arc-variants.json`): `witness` (the accuser is the official the player offered money to and refused), `hearsay` (the accuser was told of it by someone who knew), `taken` (the crime record shows the money was taken, so more than one person is named) and `friend` (the accuser is close to the player and asks instead of confronting). Each is scored from the records: the complaint row's basis, the corruption crime's `taken` field, the tie's closeness, times one plus the speaker's pull. The old bid-list lines are gated with `excludesFacts: read-complaint`, so a complaint never plays them; they stay for the plain arc. A new read form, `equals` on a record read, looks at a field that is a value, not a number (a basis, a taken bribe).

**Rules.** No new engine. The lines say only what the records show; the accuser's reasons (duty, traits, tie) are the justice engine's and are never claimed. A reply is written by record id; no dice.

**Done when.** src/director/accusation-variants.test.ts, in worlds drawn from all 56 places, plays the engines' own complaint after a hand-staged offer, finds the variant with the highest score and the basis the justice engine wrote, checks every reachable line is the variant's, writes a reply by record id, and proves with labeled hand-made rows that a told complaint plays hearsay, a taken bribe plays taken, a close accuser plays friend and a cause with no complaint plays plain; src/director/arc-variant.test.ts composes every variant whole.

**Files.** src/director/arc-variant.ts, src/director/data/arc-variants.json, data/english/parts/scene-talk.json, src/director/data/stopgaps.json, src/director/arc-variant.test.ts, src/director/accusation-variants.test.ts

**Notes.** Stopgaps: SG-STORY-arc-variant-weights (extended), SG-WORDS-accusation-promise-unread. Stacked on story/variants-apology (PR #8077). The justice engine's complaints are made by the official who refused (basis witness) in a played year, so `witness` plays most often; the others are proven by hand-made rows. Voice read: council-meeting accusations and confrontations in local news.
