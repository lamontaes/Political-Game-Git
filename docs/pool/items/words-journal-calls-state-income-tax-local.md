---
id: words-journal-calls-state-income-tax-local
title: "The Journal says the local income tax changed my costs in a town with no local income tax"
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
model: sonnet
effort: medium
root: rc9-place-facts-one-default
source: "Playtester P3, Nov 13, 2026 (crew line #8928)"
checked:
claimed-at:
---

**What.** From June 11 on, the Journal toast in a Vermont town reads 'I learned the law on the local income tax rate changed my costs.' Vermont bars local income taxes, and the town has no income tax law at the township or city level. The only income tax rows in force are the state's 8.75 percent and the federal 37 percent top rates, so the line names a tax the town does not have. Seen: the Journal toast after each Week press, June 11 to July 9, 2025.

**Cause.** Found in code: lawTopic in src/director/journal.ts (line 198) words a law.effect-learned record only by its law's series (topicInSentence(law.series)). For series 'income-tax', storyTopicName in src/english/policy-names.ts reads the 'amounts' subject in data/english/bill-sections.json (line 481), and that subject is always 'the local income tax rate', whatever level the law row sets. Sales tax ('the local sales tax rate') takes the same route. Measured: North Hyde Park, Vermont, seed a6b481a5-c6c9-432b-8cca-c0463c518da8, main 9ebc7c89. /api/dev/laws on July 9, 2025 shows income-tax rows only at the federal and state levels (law:US-VT:state:income-tax:general:2025-01-01) and local-income-tax-authority 0 for US-VT (Playtester P3, Nov 13, 2026). This is the same root as politics-issues-taxes-named-by-level (Issues), on the Journal's route.

**Fix.** Have lawTopic name the law's government along with the topic. Read the law row's level and jurisdiction (federal, the state, the county or the town) and ask the English engine for that level's subject, so the line says 'the state income tax' or 'the federal income tax'. Keep 'local' for a law that is really local. The words for each level come from the Words session (Fable A), never typed in code.

**Time box.** 2 hours for one session. When it runs out, push what passes, set the item's state honestly with a one-line note, and stop.

**Rules.** One rule, all 56 places: the level comes from the law row, never a named state. No hand-written player text: the subject for each level is a bank or bill-sections entry the Words session writes. Ask why: the line cites the law row the effect came from.

**Done when.** A second session starts a new life on main in a drawn place in a state with no local income tax (named with its seed), plays until a law.effect-learned record for an income or sales tax lands, and finds that the Journal line names the government whose law it is. A test over drawn places finds no law.effect-learned line that calls a state or federal row local.

**Waits on.** Words for the level subjects from the Words session.

**Files.** src/director/journal.ts, src/english/policy-names.ts, data/english/bill-sections.json

**Notes.** Iowa case (Account lead T25, Nov 13, 2026; Danville, Iowa, seed 4b0fc31d-ba59-4168-8b84-d7c0e3f826b6, train c39bbb71): Danville has no city income tax, and the Journal said 'I learned the law on the local income tax rate changed my costs' (May 10 and Aug 12, 2025) and 'That law on the local income tax rate is behind what I pay now' every week in November 2025.
