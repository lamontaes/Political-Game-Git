---
id: words-past-fact-renderings
title: "English renderings for household, public and archive past facts"
area: words
kind: feature
priority: 2
size: M
status: open
claimed-by:
pr: #8484
blocked-on:
source: "split from core-needs-opus-core-23; docs/coordination/OPUS-CORE.md"
claimed-at:
after:
standard: 2
model: sonnet
effort: medium
root: design-life-record
lead: words
checked: fable 2026-11-10
branch: claude/pool-words-past-fact-renderings
---

**What.** The past module writes three kinds of dated facts the English engine has no words for: `household:*` past facts on a person (livelihood, moves), the `public:*` knowledge of a public figure (party, service, positions, reputation) and the `archive:*` news stories from the year before day one. Today the person card shows the public knowledge as record fields (party, since, votes) and the past as record summaries; the player should read sentences. Author the pieces to the calibrated patterns, wire them through the English engine, and have the card, the journal and the news read them.

**Cause.** Design: docs/design/life-record.md (each life keeps a short list that every screen reads). The past module writes household:* past facts, public:* knowledge of a public figure and archive:* news from the year before day one; the card (src/bench/card.ts) words some through history lines and the person card still shows public knowledge as record fields (party, since, votes) with labels taken from record field names in src/bench/play.mjs (showPerson).

**Fix.** List which household past facts, public-figure facts and year-before archive stories still show as raw record fields on the card, in the journal or in the News, and word those through the English engine's banks; this item also takes the work of words-past-public-and-archive-renderings.

**Time box.** 4 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** No hand-written player text: the pieces live in `data/english/parts/`, authored to patterns, graded in a words batch. An effect is a read: a rendering counts once a card, journal line or news story shows it. Ask why: each sentence cites the past record it came from.

**Done when.** A second session, not the builder, plays a one-year world (buildBenchWorld) in a drawn place from all 56 (seed named), clicks the president, whom the player has not met, and reads sentences composed from the public figure's record id; sees a household past fact worded in the journal; and sees a year-before archive item worded in the News, each by record id. A bank test composes each through the real engine.

**Waits on.** Nothing.

**Files.** data/english/parts, src/english, src/director/journal.ts, src/bench/card.ts, src/bench/card-public.test.ts

**Notes.** The card's public-knowledge rows (src/bench/play.mjs showPerson) use record field names as labels until this lands.

Sent back 2026-10-20 from PR #5194 (branch claude/words-past-fact-renderings): data/english/parts/journal.json adds an origin authored livelihood line with shippable true, without grading proof. Keep authored text held until graded. The body also says no played-world year was run for this slice; provide the year/record proof named by the item, and keep the split remaining renderings as explicit open work rather than completing the umbrella on a partial slice.; finish on that branch, merge main into it first.

Claimed by next for sonnet-a266 (Claude Sonnet 5.5 in Claude Code (cloud session), tier mid) (2026-11-11 02:37 UTC) on branch claude/pool-words-past-fact-renderings.

Released by next (2026-11-11): no push to claude/pool-words-past-fact-renderings since 2026-11-11 02:38 UTC, more than twice its 4-hour time box. Continue on branch claude/pool-words-past-fact-renderings and pull request #8484.
