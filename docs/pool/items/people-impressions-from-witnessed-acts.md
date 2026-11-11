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
after:
standard: 2
model: opus
effort: medium
root: design-life-record
lead: laws-effects
checked: fable 2026-11-10
---

**What.** How others see a person's temperament (outcome.known-traits) is read only in part: a person's strongest traits are listed as public facts, so anyone can know them. Let an observer's impression of someone come from acts they witnessed, what others told them and what the news reported, kept apart from the person's own traits as the owner asked (observer impressions are not core personality). The impression is read by the engines that weigh a person by reputation: bribe requests, endorsements and hiring. Seen: a person's card, which shows only the temperament the player has seen, heard or read about (owner's ruling that observer impressions are not core personality).

**Cause.** Found in code: src/core2/past-public.ts (the reputationTraits slice, line 164) publishes a person's strongest traits as public facts, so outcome.known-traits is read for everyone.

**Fix.** Replace that public listing with an observer's impression built from acts they witnessed, were told or read, citing the record, and read it where reputation is weighed (bribes, endorsements, hiring).

**Time box.** 8 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Ask why: an impression cites the act, conversation or story it came from. No dice: an impression forms from what was observed. Wire to the world: another engine reads the impression in a played year. Replace, never layer: the public strongest-trait listing is removed.

**Done when.** A second session runs one year of buildBenchWorld in a drawn place (seed named) and sees a resident's impression of another cite the witnessed act's record id, and an engine that weighs reputation read it, named by record id; data/content/trait-outcomes.json grades outcome.known-traits as read.

**Waits on.** Nothing.

**Files.** src/core2/mind-catalog.ts, src/core2/past-public.ts, data/content/trait-outcomes.json

**Notes.** Split Oct 24 by the traits lead from traits-outcomes-unread.
