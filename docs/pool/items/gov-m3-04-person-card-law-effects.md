---
id: gov-m3-04-person-card-law-effects
title: "A named person an enacted law reached shows it on their card when the player clicks them"
area: gov
lead: governing
kind: wiring
priority: 2
size: S
status: claimed
claimed-by: claude/pool-gov-m3-04-person-card-law-effects
pr:
blocked-on:
standard: 2
model: sonnet
effort: medium
root: rc10-screens-keep-own-facts
source: governing lead Oct 29
after:
checked: fable 2026-11-10
claimed-at: 2026-11-11T06:24:05.544Z
branch: claude/pool-gov-m3-04-person-card-law-effects
---

**What.** M3-04's test sentence says an enacted ordinance reaches specific named people who are clickable, with the law on their records. Clicking a person opens `knownCard` (src/bench/card.ts, about line 657, served as `/api/known` at handler.ts about line 1238 and fetched by play.mjs about lines 974 and 1690), which has no law field at all; the only reader of the law-reach rows is `lawEffects` in `personCard` (about line 158, from `reachOn`), and `personCard` is fetched only for the player and read only for the name. So no screen shows a reached person's law. Add the law effect to the card a click actually opens (`knownCard`), worded, and test that a person the law reached shows it there and that a repeal ends it. Seen: the card of any clicked person, which shows the law that reached them.

**Cause.** Found in code: src/bench/card.ts builds lawEffects from reachOn in personCard (line 190), while knownCard (line 1019), the card a click opens through handler.ts, returns no law field.

**Fix.** Add the reach row's law entry (worded, with record ids kept for Trace) to knownCard and end it after repeal. Test it with a town law reaching a named resident in a drawn place.

**Time box.** 4 hours for one Sonnet session. When it runs out, push what passes, set the item's state honestly with a one-line note, and stop.

**Rules.** An effect is a read, not a record: the card shows the law only by reading the person's reach row, by record id. No hand-written player text: the card's line about the law is worded by the English engine or a control name, never a raw key or id (`player-screen-text`). One rule, all 56 places: the place is drawn from all 56 and named with its seed.

**Done when.** A second session, in a drawn place built with buildBenchWorld and the seed it prints, enacts a town law that reaches a named resident, clicks that resident (the card knownCard serves as /api/known) and finds the law's entry naming the reach row and the law by record id, with words free of raw keys; after the law's repeal the entry is ended; the M3-04 command names the test file.

**Waits on.** Nothing (coordinate with core-life-record, which rewrites the card's history assembly).

**Files.** src/bench/card.ts, src/bench/card.test.ts, src/core2/law-reach/host.ts

**Notes.** Filed by the governing lead, Oct 29, from the M3-04 command (branch governing/m3-spec-commands). Related, not a twin: play-law-on-your-record-unreachable is the lane's item for the player's own record on Issues, which also reads only `lawEffects`; this is any reached person's clicked card. Review on the first pass found the item had pointed at `personCard`, which no click opens. src/bench is the lane's; ask before editing.

Released (2026-11-11): Needs worded lines: personCard's lawEffects (card.ts line 194) returns raw reach fields (question key, kind, what) that no screen reads, and the item requires the entry worded by the English engine with no raw keys; that needs bank lines under data/english/parts, which only the Story session writes. Lines needed: one line per reach kind naming the law and how it touches this person, and an ended-after-repeal form. The knownCard field and its test are buildable once the lines exist. Continue on branch claude/pool-gov-m3-04-person-card-law-effects.

Claimed by next for sonnet-2698 (Claude Sonnet 5.5 in Claude Code (cloud session), tier mid) (2026-11-11 06:20 UTC) on branch claude/pool-gov-m3-04-person-card-law-effects.

Released (2026-11-11): Not built: the plumbing is small (add lawEffects from reachOn to knownCard in src/bench/card.ts ~1019, as personCard does at 194, with endedOn kept so a repeal ends it), but the item wants it worded and today personCard returns raw keys (question: row.key, what: row.what, e.g. raised-to-pay-floor). Words for each reach what key and each series (controls.politics.seriesNames covers series only) are the Words line's, so a builder would be inventing hand-written player text; needs the Words session to name the worded form first. The test (a town law reaching a named resident, then repealed) is buildable beside it. Continue on branch claude/pool-gov-m3-04-person-card-law-effects.

Claimed by next for sonnet-2698 (Claude Sonnet 5.5 in Claude Code (cloud session), tier mid) (2026-11-11 06:23 UTC) on branch claude/pool-gov-m3-04-person-card-law-effects.

Released (2026-11-11): Re-claimed by my own next loop, not worked; see my earlier release note on this item (world-deposit-reserve-reads-unweighted-costs: the weighting is already applied at credit-deposits.ts ~122; what remains is a per-business proof at Census scale, and the spread it must sit inside is a number nobody has stated, so it needs that number first). Continue on branch claude/pool-gov-m3-04-person-card-law-effects.

Claimed by next for sonnet-2698 (Claude Sonnet 5.5 in Claude Code (cloud session), tier mid) (2026-11-11 06:24 UTC) on branch claude/pool-gov-m3-04-person-card-law-effects.
