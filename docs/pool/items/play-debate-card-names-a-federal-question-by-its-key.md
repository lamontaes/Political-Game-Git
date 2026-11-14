---
id: play-debate-card-names-a-federal-question-by-its-key
title: 'A debate card asks "Transport water.expand passenger rail" and "Foreign affairs.increase foreign aid": a federal question with no spoken name shows its key'
area: play
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
after:
blocked-on:
standard: 2
model: sonnet
effort: medium
root: none
lead: screens
source: seen on the words-bar run of #8856, Fertile, Iowa (seed bill-words-d) and Winner, South Dakota (seed bill-words-g), Nov 14, 2026
---

**What.** In a council race in Winner, South Dakota (place 4672180, seed `bill-words-g`), the Campaign tab's debate card lists its questions as "Transport water.expand passenger rail", "Welfare and Medicaid", "Forgive student loans" and "Foreign affairs.increase foreign aid". Two of the four read as a key with a dot, not as words a person says. Seen: the debate card on the Campaign tab, after Go out on the trail and Debate invitation.

**Cause.** Found in code: `policyLabel` in src/bench/play.mjs reads `controls.policyNames[question]` and falls back to `words(question)`, which turns the key's last part into words but leaves the group before the dot. Some `us-federal-positions:` questions have no entry in the policy names the controls carry.

**Fix.** Give every question the debate can ask a spoken name in the data the controls read (the bill catalog's names), and make the fallback drop the group part; add a check that every question a debate may ask has a name.

**Time box.** 2 hours.

**Rules.** No hand-written player text: the names are data. One rule, all 56 places: the check covers every question key, not one place.

**Done when.** A second session, on main, in a drawn place, reaches a debate invitation and reads every question as ordinary words with no dot; the check passes.

**Waits on.** Nothing.

**Files.** src/bench/play.mjs, the policy names data the controls read.
