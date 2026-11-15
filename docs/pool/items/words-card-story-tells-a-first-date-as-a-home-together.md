---
id: words-card-story-tells-a-first-date-as-a-home-together
title: "A person's story on their card tells a couple who just started dating as having built a home together"
area: words
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: words
source: "Family life thread, Nov 15, 2026, card walk on #9256 at a22c57b1 (Bridgeville, Delaware, created adult, seed 9ea5d2f8-7322-40f2-8059-c79ef247d828)"
model: sonnet
effort: medium
root: none
---

**What.** The player asks Grace Collier out by phone and she says yes. Her card then reads "Partner · Age 18", "You barely know each other", and under her story "In 2025, she built a home with you." The two have not met in person and do not live together. Seen: the People card after the yes (picture 78 of the walk).

**Cause.** Found in code: src/bench/card.ts, the history line for a `partner/partnered` event (about line 580), tells every partnered event with the `partner.home` wordings ("built a home with", "set up house with", "settled down with"). The partnerships engine starts a couple at `union: "dating"` (`UNION_FACT`, src/core2/modules/partnerships.ts, the Ask out yes and the monthly review's own pairings), so a first date is told as a home.

**Fix.** The card reads the event's union fact: a couple started at `dating` is told with wordings for starting to see someone, and `partner.home` stays for a couple that started living together (the opening's made couples). The Story session writes the dating wordings in data/english/parts/person-history.json; the card picks the kind from the fact. One history writer, no second path.

**Time box.** 2 hours, Sonnet at medium effort. When it runs out, push what passes, set the state honestly and stop.

**Rules.** An effect is a read, not a record: the card's one history path reads the couple's union fact when it words the start, so a dating start is told as dating and never as a shared home. Replace, never layer: no second history writer.

**Done when.** In a drawn place named with its seed, a player who is asked out and says yes, or whose Ask out is answered yes, sees the other person's story say they started seeing each other, never that they built a home, and a second session sees it on the card.

**Waits on.** Nothing.

**Files.** src/bench/card.ts, data/english/parts/person-history.json
