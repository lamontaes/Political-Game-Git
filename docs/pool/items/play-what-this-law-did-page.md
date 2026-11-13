---
id: play-what-this-law-did-page
title: "After a law passes, its page shows who it reached, per person and in dollars, and shows a repeal the same way (Davenport, North Dakota: no screen shows the people a law reached)"
area: play
kind: feature
priority: 1
size: M
status: merged
claimed-by: claude/pool-play-what-this-law-did-page
pr: #8368
after: play-dev-reach-reads-every-effect-record
blocked-on:
standard: 2
model: opus
effort: high
root: rc8-law-judged-by-paperwork
lead: screens
source: Fable audit, Nov 9, 2026 (docs/audits/fable-vision-2026-11-09.md on branch audit/fable-vision, Pillar 2, "What a player sees" and "Size of the fix", root cause 7)
checked: fable 2026-11-10
claimed-at: 2026-11-11T00:03:09.946Z
merged-at: 2026-11-11T16:34:11.883Z
---

**What.** A player can pass a law and never see what it did. The audit found on Nov 9 that after a law passes, no screen shows the people it reached (Davenport, North Dakota, three seats taken through Advanced, Play as; no seed given). A law's page shows what is in force at each level, the statute, the measure that enacted it, what changed and how members voted, and nothing on it reads a reach record. Build one "what this did" section on the one law page, also opened from the bill's page once the bill is law, built from the same records dev mode's reach reads: the people the law reached, named for full people and by their count for counted groups, each with what it changed for them in dollars from the payments on the journal, and a repeal shown the same way. It is a view only.

**Cause.** Found in code: `lawPage` in src/bench/play.mjs (line 5065) reads no reach record; the only place that counts who a law reached is `reach` in src/bench/dev-mode.ts (line 618), which reads the law-reach and raise records that name the law, and names a full person for 9 of the audit's 147 state laws (stopgap SG-PLAY-dev-law-reach-full-only).

**Fix.** Add a "what this did" section to the one law page, read from the same law-reach and journal-payment records, per person for full people and by count for counted groups, in dollars, with a repeal shown the same way (what stopped, for whom, how much). Build it on the page that play-issues-law-page-and-what-shows redraws and agree the layout with whoever holds that item. Leave `lawEffects` in the person card's data (src/bench/card.ts, line 190) alone: no screen reads it today, and gov-m3-04-person-card-law-effects is the item that makes the card a click opens show it.

**Time box.** 8 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** An effect is a read, not a record: the page shows a person only through the reach record and the journal payment that name them, by record id, and a law with no such record shows that it has reached no one yet, not an estimate. One model, two tiers: a counted group is shown by the same rule as a full person, times its count. The chain is the acceptance: one dollar is followed from the bill to the law in force, to the payment, to a named person, and back out through the repeal. No hand-written player text: names, dates and sums are worded labels and rounded money.

**Done when.** A second session (not the builder) starts the bench (`npm run bench`, play at /play), begins a new game with the Place field empty so it is a drawn place, writes down the place and seed, and through Advanced, Play as takes a council seat. It drafts a change to the town's property tax rate, passes it with dev mode's bill card, and runs until the next collection. On the law's page it opens "what this did" and takes a screenshot: the people reached, each with dollars, and the totals for full people and for counted households. The page agrees to the dollar with dev mode's reach and trace for the same law, with the journal payments by account for three named people, and with a twin world without the bill (`scripts/dev-tests/twin.ts`, same seed). It repeals the law, runs to the next collection, and the page shows what stopped for the same people. It repeats this in Marion, Mississippi (seed 7df73e53cd67), raising the town's rate from 0.921% to 1.381%, and reports the page's groups beside the audit's twin figures ($1,900 from full people in town, $31,100 from its counted households, $197,700 from officials elsewhere), explaining any gap by record. A bench test fails when the page shows a person or a sum that dev mode's reach does not hold, or when the page's code writes a record.

**Waits on.** Nothing. (play-dev-reach-reads-every-effect-record, which it once waited on, is done.) Build on the law page of play-issues-law-page-and-what-shows; its part 1 is on main.

**Files.** src/bench/play.mjs, src/bench/dev-mode.ts, src/bench/legislature.ts, src/bench/handler.ts, src/core2/law-reach/host.ts, scripts/dev-tests/twin.ts

**Notes.** From the Fable audit, Pillar 2 ("After a law passes, no screen shows the people it reached") and its fix list: "Medium: after any law passes, one 'what this did' page built from the same records, per person and in dollars, with the repeal shown the same way. Make dev mode's reach and trace read every effect record, and say why a bill failed." The second sentence is the item this one waits on (play-dev-reach-reads-every-effect-record, filed from the same audit).

The Marion figures are from the audit's law sweep (Pillar 2, "The property tax result repeats"): all 170 laws in dev mode's list at four bodies in Marion, Mississippi, seed 7df73e53cd67, each bill compared with the same world without it. The audit says the result was the same to the dollar whether the town board or the county board passed it, and that the first place drawn had no town board, so Marion was the second. The audit did not say how many days after passage it read these three figures; ask the audit's author or read them at the first collection after the bill.

The night Coordinator's call (docs/coordination/OWNER-DECISIONS.md, Nov 8 to 9): the bill page before enactment shows the law row's scope and the change, "with no counts or projections. Counts come from law reach after enactment." This page is the after-enactment half.

Not a second law page: play-issues-law-page-and-what-shows (open, lead play-first, mock first) redraws the law page and already asks for "who it reaches here" from a record id. This item is that section made exact (per person, in dollars, the repeal the same way) and gated on the reach being complete; build it on that page and agree the layout with whoever holds that item. Related: gov-m3-04-person-card-law-effects (open; the same reach on a clicked person's card), play-law-on-your-record-unreachable (open; the player's own record), laws-end-to-end-proof (open), play-repeal-action-on-every-law-page and play-bill-menu-for-mayors-and-governors (filed with this one).

Not verified: I did not open the screens or run a bill on Nov 10's main; the reading of `lawPage` and `reach` is from the code. Which of the audit's two proof tools is right where they disagree (dev mode's reach against the test harness's search, "Duplicate systems" item 6) is the upstream item's question, not this page's.
