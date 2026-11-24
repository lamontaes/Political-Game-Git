---
id: lives-how-often-a-husk-death-reaches-a-household
title: "How often a relative's death builds them and reaches the house they are kin to"
area: core
kind: research
priority: 3
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: words
model: sonnet
effort: medium
root: rc3-thin-life-record
source: Account lead thread, relative-news carry #9124, Nov 14, 2026
checked: s3 2026-11-14
---

**What.** Needs cause. The three drawn places (two years each) had no death among the 19 relatives of the house's adults living elsewhere (expected about 0.2 to 0.3 a place by their ages, 8 to 91), so how often a player would ever hear `death-news` is not yet a number. Seen: a played life where a relative elsewhere dies and the house tells it.

**Cause.** Measured: `node --import tsx scripts/words/relative-news-rate.ts --seed fam-b --draws 3 --days 730` (San Isidro TX, North Vacherie LA, Spearman TX) shows no relative death in two years; see `lives-husk-relative-illness-never-reaches-the-house` for the counts. Not measured: how often a husk's death, which builds the husk (`hearBookedDay` death branch, `personOrFillIn`), reaches an adult of a player's house as a moment the talk can tell.

**Fix.** Measure only: run the rate script over at least twelve drawn places (a fresh seed) for five years and report, per place, relatives elsewhere, their deaths, and whether each reached the house as a `death-news` subject (`subjectsBetween`); say what rate a player meets in a typical term. Do not tune any rate.

**Time box.** 2 hours, Sonnet medium, one heavy run at a time.

**Rules.** No dice; real rates check totals and never pick one actor's outcome.

**Done when.** A table of twelve or more drawn places (fresh seed, each named with its seed) with counts and a one-line rate per player per year, written into this item's Notes. A second session, on main, plays one of those places and sees a relative's death told at home, or the item says no place showed one.

**Waits on.** Nothing.

**Files.** scripts/words/relative-news-rate.ts

**Notes.** Filed on the #9124 branch.
