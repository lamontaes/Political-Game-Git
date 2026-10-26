---
id: people-impressions-from-witnessed-acts
title: "Others learn a person's temperament only from what they saw, heard or read"
area: people
kind: wiring
priority: 3
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** How others see a person's temperament (outcome.known-traits) is read only in part: a person's strongest traits are listed as public facts (src/core2/past-public.ts:162), so anyone can know them. Let an observer's impression of someone come from acts they witnessed, what others told them and what the news reported, kept apart from the person's own traits as the owner asked (observer impressions are not core personality), and read by the engines that weigh a person by reputation (bribe requests, endorsements, hiring).

**Rules.** Ask why: an impression cites the act, conversation or story it came from. No dice: an impression forms from what was observed. Wire to the world: another engine reads the impression in a played year.

**Done when.** In one year of buildBenchWorld in a drawn place, seed named, a resident's impression of another cites the witnessed act's record id, and an engine that weighs reputation reads it, named by record id; data/content/trait-outcomes.json grades outcome.known-traits as read.

**Files.** src/core2/mind-catalog.ts, src/core2/past-public.ts, data/content/trait-outcomes.json

**Notes.** Split Oct 24 by the traits lead from traits-outcomes-unread.
