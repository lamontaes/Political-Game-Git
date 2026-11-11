---
id: play-honor-headline-reads-school
title: "The paper's school-honors headline reads the school from its record, so it names who won instead of a count of nobody in particular"
area: words
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr: #8133
blocked-on:
source: owner's batch 3 voice grades (Nov 9), the honors headline ("for what? For Lexingtonians?"); traced by the Words line Nov 10
lead: play-first
milestone: play-first
merged-at:
claimed-at:
---

**What.** The headline "{number} {place} seniors sign with Division I programs" (data/english/parts/headlines.json, `headlines.honor.*`, and news.json) names no school, so the owner could not tell who won. The `school.honor` record from src/core2/school-honors.ts already carries the school's name in `facts.school`, but the `honor` builder in src/bench/printed-words.ts (about line 2933) reads only `place`, `number` and a single named student, and never reads `f.school`. Played years show it: Opal, Virginia (seed h1:1), `school.honor:spelling-bee-local:jurisdiction_7a86b8261e03ad36:2025-02-07`, school "Opal Public Schools"; Bowie, Arizona (seed h2:0), `school.honor:spelling-bee-local:jurisdiction_3343ab66493cf07b:2025-02-07`, school "Bowie Public Schools".

**The change (lane's file).** In the `honor` builder, add `...(f.school ? { school: read.fact(f.school, f.record ?? "") } : {})` to the facts it hands the bank. Then the Words line rewrites the honor headlines and news lines to use `{school}` (gated on it, with the count in words), declares the slot, and adds a played-year test.

**Rules.** No hand-written player text: the builder passes only the record's school fact and the words come from the headline bank. One rule, all 56 places: every place's honor names its own school from its own record, never a place name typed in code.

**Done when.** In a played year drawn from all 56 places, a `school.honor` record's headline names the school from the record's `school` fact (for example "Opal Public Schools"), shown in a test that prints the headline with the place, seed and record id, and the English guards pass.

**Time box.** 2 hours; if not done, push what exists, open the draft PR, write the handoff.

**You will see.** You see the paper's honors headline name the school, such as "Four Opal Public Schools seniors sign with Division I programs", instead of a count of nobody in particular.

**Screenshot.** The News screen's honors headline before and after, in a drawn place.

**Files.** src/bench/printed-words.ts, data/english/parts/headlines.json, data/english/parts/news.json

**Notes.** Needs from others: play-first, the one-line builder change in src/bench/printed-words.ts; Words will follow with the bank pieces on the same branch or a stacked one. The school on record is the district; naming a high school needs a school row the school engine does not keep yet.

Not seen in the game (2026-11-11, sonnet-8597 (Claude Sonnet 5.5, Claude Code cloud)): read of main, no played year, seed none, main 64988a4b3de: Not seen: PR #8133 changed only the item file and a release note. The honor builder in src/bench/printed-words.ts (line 2932) still reads only honor, place, count and the first student, never f.school, and no test prints an honor headline with its school. src/core2/school-honors.test.ts (13 of 13 pass, drawn place) covers the engine, not the headline. The one-line builder change and the Words bank rewrite are both still to do.
