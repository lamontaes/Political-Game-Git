---
id: words-leaning-shown-by-a-record
title: "A leaning on a person card gets a sentence only where a record shows it"
area: words
kind: feature
priority: 3
size: M
status: open
claimed-by:
pr:
blocked-on:
source: "Words builder W2, Nov 12, from Fable A's read of #8937 on #8928"
lead: words
claimed-at:
after:
standard: 2
model: opus
effort: medium
root: none
---

**What.** Since #8937, a person card shows each leaning by its label alone ("Reserved", "Follows through"). The player's own card also shows how strong it runs. The sentence under each label was deleted because it only said the label again ("I keep to myself."). Fable A's ruling (#7365, Nov 12) is that a sentence comes back only where something on the person's own record shows the leaning, said as a fact: "a long run at one employer for steadiness, a promise on record kept for keeping their word, an office sought twice for persistence". The You screen now reads thin: three or four labels, each marked STRONG. Seen: the You screen's "What I'm like" and a relative's "How I see him" on the person card.

**Cause.** Found in code: `leanings` in src/bench/card.ts reads only the trait values on the person record. No reader joins a leaning to a record that shows it. The card's own life list (`lineOf` in src/bench/card.ts: work runs, offices won, moves, partners) already holds the facts that could. A job row (`JobInput` in src/core2/types.ts) has no start date, but the life list's work events carry their years.

**Fix.** In src/bench/card.ts, for each leaning the card shows, look in the same life events the story tells for one record that shows that pole. Examples: the longest work run for "Follows through", an office sought more than once for persistence, a business opened or a move across states for "Takes chances". Word it through one new person-history key per pole, with the record's own facts as inserts ({employer}, {span}, {office}). A leaning with no such record keeps its label alone.

**Time box.** 3 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Every line through the English engine, with inserts from the world's records (owner, Nov 11). An insert must carry the fact the line is about, never the town or the employer stuck onto a trait sentence (Fable A, Nov 12). Ask why: the sentence cites the record it reads.

**Done when.** A second session, not the builder, starts a new life in a drawn place (place and seed named) and opens the cards of three relatives and its own You screen. At least one leaning shows a sentence naming a record fact (an employer and a span, an office, a move), and that fact matches the person's story on the same card. Every leaning without such a record shows its label alone.

**Waits on.** #8937.

**Files.** src/bench/card.ts, data/english/parts/person-history.json

**Notes.** Filed Nov 12 by Words builder W2.
