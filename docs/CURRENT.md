# What is current

Written from `docs/current.json` by `node --import tsx scripts/current/write.ts`. Change the JSON, never this page.

Owner, Nov 11, 2026: "updates all documents so that nothing is pointing at anything old, and have somewhere as like a master updater or something, to where in the future old things aren't pointing at all different things at all different times."

**The rule.** Whoever replaces or removes something adds its old path to the replaced list below and fixes every pointer to it, in the same pull request. A guard (`tests/guards/current-pointers.test.ts`) fails when a document, rule, skill or code comment names a path that is not in the repository, and when something new appears at the top of the repository with no row here. The skill `current-pointers` says how.

## The current thing, by kind

| Kind | Where |
| --- | --- |
| The repository guide every agent follows | `AGENTS.md` |
| The standing rules' own pages | `.agents/rules` |
| The skills | `.agents/skills` |
| The skills' mirror for Claude | `.claude/skills` |
| The owner's rulings, the only rulings log | `docs/coordination/OWNER-DECISIONS.md` |
| The decision register | `docs/coordination/DECISION-REGISTER.md` |
| Earlier rulings, by subject | `docs/coordination/prior-rulings` |
| Who is running and what each owns | `docs/coordination/CREW.md` |
| The leads' channel | `docs/coordination/LEADS-2026-10-24.md` |
| The merge order | `docs/coordination/MERGE-FIRST.md` |
| The two-branch plan (work branch and main without test files), the map and the way back | `docs/coordination/TWO-BRANCHES.md` |
| The roadmap | `docs/ROADMAP.md` |
| What The Political Process does, mapped to our specs | `docs/roadmap/political-process-baseline.md` |
| The map of the docs | `docs/README.md` |
| The map of the code | `ARCHITECTURE.md` |
| The pool: the backlog | `docs/pool` |
| The pool's items | `docs/pool/items` |
| The order work is taken in, and the cap | `docs/pool/order.json` |
| The builder brief | `docs/pool/START-A-BUILDER.md` |
| The cause finder brief | `docs/pool/FIND-A-CAUSE.md` |
| The play-first lane's law | `docs/play-first/LAW.md` |
| The play-first lane's order | `docs/play-first/ORDER.md` |
| The play-first lane's handoff log | `docs/play-first/PROGRESS.md` |
| The engine's state and module registry | `src/core2/state.ts` |
| The election engine | `src/core2/modules/elections.ts` |
| The election engine's count of votes | `src/core2/modules/voting.ts` |
| The body engine (every council, board, legislature and Congress) | `src/core2/modules/legislature.ts` |
| The executive engine | `src/core2/modules/executive.ts` |
| The budget engine | `src/core2/modules/budgets.ts` |
| The law store | `src/core2/modules/laws.ts` |
| The country tier | `src/core2/country-model.ts` |
| The life record | `src/core2/life.ts` |
| The registered stopgaps | `src/core2/data/stopgaps` |
| The daily register (what may run or be kept every day) | `docs/design/daily-register.md` |
| The scene engine (the director) | `src/director/scene.ts` |
| The talk engine | `src/director/conversation.ts` |
| The English engine's composer | `src/english/english-composition.ts` |
| The words banks | `data/english/parts` |
| The owner's notes as rules for lines | `data/english/line-rules.json` |
| The play screen | `src/bench/play.mjs` |
| The screen parts, and how to add a screen | `src/bench/ui/README.md` |
| The game's server for the play screen | `src/bench/server.ts` |
| The bust bank (how every person is drawn) | `art/busts/v1/manifest.json` |
| The bust bank's spec | `docs/art/busts-spec.md` |
| The backdrops | `art/backdrops/manifest.json` |
| The approved menu mocks | `docs/mocks/2026-11-07-approved` |
| The approved front mocks | `docs/mocks/2026-11-08-front` |
| The approved play mocks | `docs/mocks/2026-11-08-play` |
| The research data that calibrates the world | `data/research` |
| This file's readable form | `docs/CURRENT.md` |

## The top of the repository

| Path | What it is |
| --- | --- |
| `.agents` | Rules and skills for every agent |
| `.claude` | The skills' mirror and helpers for Claude |
| `.codex` | Settings for Codex |
| `.cursor` | Settings for Cursor |
| `.devcontainer` | The cloud container's setup |
| `.gitattributes` | Git's file rules |
| `.github` | The checks that run on pull requests, and the pull request template |
| `.gitignore` | What git leaves out |
| `.openai` | Settings for OpenAI tools |
| `.prettierignore` | What the formatter leaves alone |
| `.shot-travel.mjs` | A stray screenshot script; the slim-down removes it |
| `AGENTS.md` | The repository guide |
| `ARCHITECTURE.md` | The map of the code |
| `CLAUDE.md` | The bridge from Claude to the repository guide |
| `PATCH_NOTES.md` | The patch notes, written by the release machinery |
| `README.md` | The front page |
| `art` | Every picture the game draws |
| `calendar-day.png` | Written by the calendar browser check; the slim-down moves its output out of the top level |
| `calendar-holidays-hidden.png` | Written by the calendar browser check; the slim-down moves its output out of the top level |
| `calendar-today.png` | Written by the calendar browser check; the slim-down moves its output out of the top level |
| `data` | The words banks, the research data and the source files the world is built from |
| `deployment` | How a build is published |
| `desktop` | The desktop build |
| `docs` | Every document |
| `eslint.config.js` | The linter's rules |
| `package-lock.json` | The exact packages installed |
| `package.json` | The commands and the packages |
| `public` | Files the web build serves as they are |
| `scripts` | Tools run at development time |
| `src` | The game's code |
| `tests` | Guards and suites that are not beside their code |
| `tooling` | Build and editor tooling |
| `tsconfig.app.json` | TypeScript settings for the game |
| `tsconfig.json` | TypeScript settings |
| `tsconfig.node.json` | TypeScript settings for tools |
| `vite.config.ts` | The bundler's and test runner's settings |

## Records, which are never rewritten

These keep what was said or shipped. A path they name may be long gone, and the guard does not read them.

- `docs/coordination/OWNER-DECISIONS.md`
- `docs/coordination/DECISION-REGISTER.md`
- `docs/coordination/prior-rulings/`
- `docs/coordination/playtest/`
- `docs/coordination/LEADS-2026-10-24.md`
- `docs/play-first/PROGRESS.md`
- `docs/release/changes/`
- `PATCH_NOTES.md`
- `docs/current.json`
- `docs/CURRENT.md`
- `docs/words-lead-handoff-2026-11-16/`

## Replaced or removed, kept forever

| Old path | Now | When | Why |
| --- | --- | --- | --- |
| `src/core2/data/moves/destinations.json` | src/core2/modules/counted-moves.ts destinationWeights: a leaver with no relative elsewhere goes to the state the one destination weighing ranks highest for their pay and tenure (moves.ts destinationFor) | 2026-11-17 | Pins family 29: a leaver's destination comes from the simulation's own weighing, not the IRS county most movers went to. |
| `data/research/renewal/derive-destinations.py` | nothing stands in its place: it wrote src/core2/data/moves/destinations.json, deleted with it | 2026-11-17 | Pins family 29: the file it derived is gone. |
| `src/core2/fast-forward.ts` | src/core2/life.ts results mode (runResultsDay); nothing else stands in its place; restore it from commit 33e38d44bc6769d37caed26d66722a9137e7b3c6 | 2026-11-12 | The fast clock, part 4: skipped time is counted from the voters in results mode and the campaign-stride switch is deleted. |
| `scripts/speed-years/fast-forward.ts` | nothing stands in its place; restore it from commit 33e38d44bc6769d37caed26d66722a9137e7b3c6 | 2026-11-12 | The campaign-stride switch it ran with was deleted with the fast clock, part 4. |
| `src/simulation` | `src/core2` | 2026-10-28 | The old core was deleted (pull request 6659); the new core is the engine. |
| `src/bench/scene-check.ts` | nothing stands in its place; restore it from commit e83ccf5d83e67e48df658367b55fade2f1e6453d | 2026-11-11 | Removed with the painted people (owner's call 11, PR 8643): the room's people are a strip of busts; the check of painted people in a room has nothing to check. |
| `src/bench/art-check.ts` | nothing stands in its place; restore it from commit e83ccf5d83e67e48df658367b55fade2f1e6453d | 2026-11-11 | Removed with the painted people (owner's call 11, PR 8643): the painted full-body people left the rooms; their art check went with them. |
| `src/bench/people-pack.test.ts` | nothing stands in its place; restore it from commit e83ccf5d83e67e48df658367b55fade2f1e6453d | 2026-11-11 | Removed with the painted people (owner's call 11, PR 8643): the people pack's room figures are not drawn any more; the bust tests cover faces. |
| `src/director/scene-occasions.test.ts` | nothing stands in its place; restore it from commit e83ccf5d83e67e48df658367b55fade2f1e6453d | 2026-11-11 | Removed with the painted people (owner's call 11, PR 8643): it tested where painted people stood in a room. |
| `src/bench/framing.browser.mjs` | nothing stands in its place; restore it from commit e83ccf5d83e67e48df658367b55fade2f1e6453d | 2026-11-11 | Removed with the painted people (owner's call 11, PR 8643): it checked how painted people were framed in a room. |
| `src/bench/ui/headshot.mjs` | src/bench/ui/face.mjs (the one face part) and src/bench/ui/person-card.mjs (the one person card) | 2026-11-11 | One face part and one person card (play-one-person-shows-two-faces; Fable audit, Nov 9: "six ways to draw a person card and three ways to draw a face"). |
| `src/bench/ui/member-card.mjs` | src/bench/ui/face.mjs (the one face part) and src/bench/ui/person-card.mjs (the one person card) | 2026-11-11 | One face part and one person card (play-one-person-shows-two-faces; Fable audit, Nov 9: "six ways to draw a person card and three ways to draw a face"). |
| `data/english/parts/person-sketch.json` | nothing stands in its place: the person card shows each leaning by its label (and its strength on the You screen); restore it from commit 354fa017bdc126990eaec3a30367173e519bcfc2 | 2026-11-12 | Every line in it only said a trait's label again in other words, with no fact from the world's records (owner, Nov 11: every line through the English engine; Fable A on #7365, Nov 12: a line that only restates the trait's name beside it is deleted). |
| `src/director/concession-night.test.ts` | docs/design/scene-inventory.md says why; restore it from commit c7880ba20abc55778808870af7b56586dcd708ce | 2026-11-12 | It played concession-received and concession-taken, deleted by the scene inventory; the loser’s call stays in concession-reported.test.ts. |
| `src/director/concession-received.test.ts` | docs/design/scene-inventory.md says why; restore it from commit c7880ba20abc55778808870af7b56586dcd708ce | 2026-11-12 | It played concession-received, deleted by the scene inventory (nothing read its reply). |
| `src/director/desk-scene.test.ts` | docs/design/scene-inventory.md says why; restore it from commit c7880ba20abc55778808870af7b56586dcd708ce | 2026-11-12 | It played desk-bill, deleted by the scene inventory: the desk screen is where the executive signs or vetoes. |
| `src/director/ending-screens.test.ts` | docs/design/scene-inventory.md says why; restore it from commit c7880ba20abc55778808870af7b56586dcd708ce | 2026-11-12 | It checked the opens field on purpose endings, which no screen read; the field was deleted with the scene inventory. |
| `src/director/government-scenes.test.ts` | docs/design/scene-inventory.md says why; restore it from commit c7880ba20abc55778808870af7b56586dcd708ce | 2026-11-12 | It played floor-vote, bill-signed and veto, deleted by the scene inventory. |
| `src/director/hallway-scene.test.ts` | docs/design/scene-inventory.md says why; restore it from commit c7880ba20abc55778808870af7b56586dcd708ce | 2026-11-12 | It played hallway, deleted by the scene inventory (its causes are vote-asked’s, press-interview’s and lobby-remembers’). |
| `src/director/hearing-scenes.test.ts` | docs/design/scene-inventory.md says why; restore it from commit c7880ba20abc55778808870af7b56586dcd708ce | 2026-11-12 | It played public-hearing, deleted by the scene inventory (town-hall-question is the same exchange). |
| `src/director/law-reached-scenes.test.ts` | docs/design/scene-inventory.md says why; restore it from commit c7880ba20abc55778808870af7b56586dcd708ce | 2026-11-12 | It played law-takes-effect, deleted by the scene inventory (constituent-stop plays the same purpose). |
| `src/director/own-bill-failed-scene.test.ts` | docs/design/scene-inventory.md says why; restore it from commit c7880ba20abc55778808870af7b56586dcd708ce | 2026-11-12 | It played staff-news, deleted by the scene inventory. |
| `src/director/primary-challenge.test.ts` | docs/design/scene-inventory.md says why; restore it from commit c7880ba20abc55778808870af7b56586dcd708ce | 2026-11-12 | It played rival-filed, deleted by the scene inventory. |
| `src/director/race-told-scene.test.ts` | docs/design/scene-inventory.md says why; restore it from commit c7880ba20abc55778808870af7b56586dcd708ce | 2026-11-12 | It played race-told, deleted by the scene inventory (supersedes the red-main fix in PR 8899). |
| `src/director/reunion-facts.ts` | docs/design/scene-inventory.md says why; restore it from commit c7880ba20abc55778808870af7b56586dcd708ce | 2026-11-12 | The reunion scene’s facts; reunion was deleted by the scene inventory (its cause was the director’s own echo, and no engine records a return). |
| `src/director/rival-filed-late.test.ts` | docs/design/scene-inventory.md says why; restore it from commit c7880ba20abc55778808870af7b56586dcd708ce | 2026-11-12 | It played rival-filed’s late-filer cause, deleted by the scene inventory. |
| `src/director/run-doubt-scene.test.ts` | docs/design/scene-inventory.md says why; restore it from commit c7880ba20abc55778808870af7b56586dcd708ce | 2026-11-12 | It played run-doubt, deleted by the scene inventory (family-loss is the scene candidacy.ts reads). |
| `src/director/staff-bad-news.test.ts` | docs/design/scene-inventory.md says why; restore it from commit c7880ba20abc55778808870af7b56586dcd708ce | 2026-11-12 | It played staff-news, deleted by the scene inventory. |
| `src/director/staff-news-scene.test.ts` | docs/design/scene-inventory.md says why; restore it from commit c7880ba20abc55778808870af7b56586dcd708ce | 2026-11-12 | It played staff-news, deleted by the scene inventory. |
| `src/director/story-read-scene.test.ts` | docs/design/scene-inventory.md says why; restore it from commit c7880ba20abc55778808870af7b56586dcd708ce | 2026-11-12 | It played story-read, deleted by the scene inventory (bring-it-up reads the same news.read record). |
| `src/director/testimony-heard.test.ts` | docs/design/scene-inventory.md says why; restore it from commit c7880ba20abc55778808870af7b56586dcd708ce | 2026-11-12 | It played testimony-heard, deleted by the scene inventory (town-hall-question’s arc). |
| `src/core2/data/elections/municipal-petition-rules.json` | `src/core2/data/elections/petition-rules.json` | 2026-11-14 | Every family of offices now reads its petition rule from one file, computed for the race's own electorate; the municipal rows moved in unchanged. |
| `desktop/scripts/continuity-test.mjs` | desktop/tests/play-api-host-save.test.mjs (the app keeps its life through src/core2/saves.ts); restore it from commit 564a4329146f5095816bd584a66f710b43603d1f | 2026-11-15 | It drove the browser save repository (IndexedDB) that no longer exists. |
| `desktop/scripts/save-integrity-test.mjs` | desktop/tests/play-api-host-save.test.mjs (the app keeps its life through src/core2/saves.ts); restore it from commit 564a4329146f5095816bd584a66f710b43603d1f | 2026-11-15 | It drove the browser save repository (IndexedDB) that no longer exists. |
| `desktop/scripts/transfer-test.mjs` | desktop/tests/play-api-host-save.test.mjs (the app keeps its life through src/core2/saves.ts); restore it from commit 564a4329146f5095816bd584a66f710b43603d1f | 2026-11-15 | It drove the browser save repository's export and import, which no longer exist. |
| `desktop/scripts/saved-identity-proof.mjs` | desktop/tests/play-api-host-save.test.mjs (the app keeps its life through src/core2/saves.ts); restore it from commit 564a4329146f5095816bd584a66f710b43603d1f | 2026-11-15 | It read the browser save repository (IndexedDB) that no longer exists. |
| `desktop/tests/saved-identity-proof.test.mjs` | desktop/tests/play-api-host-save.test.mjs (the app keeps its life through src/core2/saves.ts); restore it from commit 564a4329146f5095816bd584a66f710b43603d1f | 2026-11-15 | It tested saved-identity-proof.mjs, deleted with it. |
| `.agents/skills/standing-rules-self-check` | .agents/skills/done-proof (section 9, the standing rules one line each) | 2026-11-16 | Most of it repeated AGENTS.md's standing rules; its eight lines and the Account lead's two moved word for word into done-proof, which runs at the same moment, before a pull request opens. |
| `.claude/skills/standing-rules-self-check` | .claude/skills/done-proof (section 9, the standing rules one line each) | 2026-11-16 | The mirror of the skill above, removed with it. |
| `.agents/rules/git-worktrees.md` | .agents/rules/storage-and-workspaces.md (section Branches and takeovers) | 2026-11-16 | Its branch, takeover and publishing lines moved word for word into the storage rules; its workspace line repeated that file and AGENTS.md. |
| `.agents/skills/train-gate` | `.agents/skills/merger/references/train-gate.md` | 2026-11-17 | Merged into the merger skill when the CTO capped the skills (owner, Nov 16: "Let's go ahead"); its body and references moved word for word into that file. |
| `.claude/skills/train-gate` | `.claude/skills/merger/references/train-gate.md` | 2026-11-17 | The mirror of the row above, removed with it. |
| `.agents/skills/checker` | `.agents/skills/merger/references/checker.md` | 2026-11-17 | Merged into the merger skill when the CTO capped the skills (owner, Nov 16: "Let's go ahead"); its body and references moved word for word into that file. |
| `.claude/skills/checker` | `.claude/skills/merger/references/checker.md` | 2026-11-17 | The mirror of the row above, removed with it. |
| `.agents/skills/merge-trains` | `.agents/skills/merger/references/merge-trains.md` | 2026-11-17 | Merged into the merger skill when the CTO capped the skills (owner, Nov 16: "Let's go ahead"); its body and references moved word for word into that file. |
| `.claude/skills/merge-trains` | `.claude/skills/merger/references/merge-trains.md` | 2026-11-17 | The mirror of the row above, removed with it. |
| `.agents/skills/pr-fixer` | `.agents/skills/merger/references/pr-fixer.md` | 2026-11-17 | Merged into the merger skill when the CTO capped the skills (owner, Nov 16: "Let's go ahead"); its body and references moved word for word into that file. |
| `.claude/skills/pr-fixer` | `.claude/skills/merger/references/pr-fixer.md` | 2026-11-17 | The mirror of the row above, removed with it. |
| `.agents/skills/generated-file-merges` | `.agents/skills/merger/references/generated-file-merges.md` | 2026-11-17 | Merged into the merger skill when the CTO capped the skills (owner, Nov 16: "Let's go ahead"); its body and references moved word for word into that file. |
| `.claude/skills/generated-file-merges` | `.claude/skills/merger/references/generated-file-merges.md` | 2026-11-17 | The mirror of the row above, removed with it. |
| `.agents/skills/merge-audit` | `.agents/skills/merger/references/merge-audit.md` | 2026-11-17 | Merged into the merger skill when the CTO capped the skills (owner, Nov 16: "Let's go ahead"); its body and references moved word for word into that file. |
| `.claude/skills/merge-audit` | `.claude/skills/merger/references/merge-audit.md` | 2026-11-17 | The mirror of the row above, removed with it. |
| `.agents/skills/pinned-tests` | `.agents/skills/drawn-place-tests/references/pinned-tests.md` | 2026-11-17 | Merged into the drawn-place-tests skill when the CTO capped the skills (owner, Nov 16: "Let's go ahead"); its body and references moved word for word into that file. |
| `.claude/skills/pinned-tests` | `.claude/skills/drawn-place-tests/references/pinned-tests.md` | 2026-11-17 | The mirror of the row above, removed with it. |
| `.agents/skills/relationship-checks` | `.agents/skills/drawn-place-tests/references/relationship-checks.md` | 2026-11-17 | Merged into the drawn-place-tests skill when the CTO capped the skills (owner, Nov 16: "Let's go ahead"); its body and references moved word for word into that file. |
| `.claude/skills/relationship-checks` | `.claude/skills/drawn-place-tests/references/relationship-checks.md` | 2026-11-17 | The mirror of the row above, removed with it. |
| `.agents/skills/labor-market-proof` | `.agents/skills/done-proof/references/labor-market-proof.md` | 2026-11-17 | Merged into the played-world-proof skill when the CTO capped the skills (owner, Nov 16: "Let's go ahead"); its body and references moved word for word into that file. |
| `.claude/skills/labor-market-proof` | `.claude/skills/done-proof/references/labor-market-proof.md` | 2026-11-17 | The mirror of the row above, removed with it. |
| `.agents/skills/trace-audit` | `.agents/skills/wiring-audit/references/trace-audit.md` | 2026-11-17 | Merged into the wiring-audit skill when the CTO capped the skills (owner, Nov 16: "Let's go ahead"); its body and references moved word for word into that file. |
| `.claude/skills/trace-audit` | `.claude/skills/wiring-audit/references/trace-audit.md` | 2026-11-17 | The mirror of the row above, removed with it. |
| `.agents/skills/scene-first-report` | `.agents/skills/scene-standard/references/scene-first-report.md` | 2026-11-17 | Merged into the scene-standard skill when the CTO capped the skills (owner, Nov 16: "Let's go ahead"); its body and references moved word for word into that file. |
| `.claude/skills/scene-first-report` | `.claude/skills/scene-standard/references/scene-first-report.md` | 2026-11-17 | The mirror of the row above, removed with it. |
| `.agents/skills/speech-planner` | `.agents/skills/words-engine/references/speech-planner.md` | 2026-11-17 | Merged into the words-engine skill when the CTO capped the skills (owner, Nov 16: "Let's go ahead"); its body and references moved word for word into that file. |
| `.claude/skills/speech-planner` | `.claude/skills/words-engine/references/speech-planner.md` | 2026-11-17 | The mirror of the row above, removed with it. |
| `.agents/skills/term-read` | `.agents/skills/words-engine/references/term-read.md` | 2026-11-17 | Merged into the words-engine skill when the CTO capped the skills (owner, Nov 16: "Let's go ahead"); its body and references moved word for word into that file. |
| `.claude/skills/term-read` | `.claude/skills/words-engine/references/term-read.md` | 2026-11-17 | The mirror of the row above, removed with it. |
| `.agents/skills/owners-words-to-threads` | `.agents/skills/crew-coordinator/references/owners-words-to-threads.md` | 2026-11-17 | Merged into the crew-messages skill when the CTO capped the skills (owner, Nov 16: "Let's go ahead"); its body and references moved word for word into that file. |
| `.claude/skills/owners-words-to-threads` | `.claude/skills/crew-coordinator/references/owners-words-to-threads.md` | 2026-11-17 | The mirror of the row above, removed with it. |
| `.agents/skills/heavy-runs` | `.agents/skills/speed-work/references/heavy-runs.md` | 2026-11-17 | Merged into the speed-work skill when the CTO capped the skills (owner, Nov 16: "Let's go ahead"); its body and references moved word for word into that file. |
| `.claude/skills/heavy-runs` | `.claude/skills/speed-work/references/heavy-runs.md` | 2026-11-17 | The mirror of the row above, removed with it. |
| `.agents/skills/cadence-and-summaries` | `.agents/skills/speed-work/references/cadence-and-summaries.md` | 2026-11-17 | Merged into the speed-work skill when the CTO capped the skills (owner, Nov 16: "Let's go ahead"); its body and references moved word for word into that file. |
| `.claude/skills/cadence-and-summaries` | `.claude/skills/speed-work/references/cadence-and-summaries.md` | 2026-11-17 | The mirror of the row above, removed with it. |
| `.agents/skills/century-history` | `.agents/skills/day-one-in-motion/references/century-history.md` | 2026-11-17 | Merged into the day-one-in-motion skill when the CTO capped the skills (owner, Nov 16: "Let's go ahead"); its body and references moved word for word into that file. |
| `.claude/skills/century-history` | `.claude/skills/day-one-in-motion/references/century-history.md` | 2026-11-17 | The mirror of the row above, removed with it. |
| `.agents/skills/legislation-screens` | `.agents/skills/screen-to-mock/references/legislation-screens.md` | 2026-11-17 | Merged into the screen-to-mock skill when the CTO capped the skills (owner, Nov 16: "Let's go ahead"); its body and references moved word for word into that file. |
| `.claude/skills/legislation-screens` | `.claude/skills/screen-to-mock/references/legislation-screens.md` | 2026-11-17 | The mirror of the row above, removed with it. |
| `.agents/skills/lead-session` | `.agents/skills/crew-coordinator/references/lead-session.md` | 2026-11-17 | Merged into the crew-coordinator skill when the CTO capped the skills (owner, Nov 16: "Let's go ahead"); its body and references moved word for word into that file. |
| `.claude/skills/lead-session` | `.claude/skills/crew-coordinator/references/lead-session.md` | 2026-11-17 | The mirror of the row above, removed with it. |
| `.agents/skills/slim-down` | `.agents/skills/remove-a-stopgap/references/slim-down.md` | 2026-11-17 | Merged into the remove-a-stopgap skill when the CTO capped the skills (owner, Nov 16: "Let's go ahead"); its body and references moved word for word into that file. |
| `.claude/skills/slim-down` | `.claude/skills/remove-a-stopgap/references/slim-down.md` | 2026-11-17 | The mirror of the row above, removed with it. |
| `.agents/skills/file-a-pool-item` | `.agents/skills/pool-notes/references/file-a-pool-item.md` | 2026-11-17 | Merged into the pool-notes skill when the CTO capped the skills (owner, Nov 16: "Let's go ahead"); its body and references moved word for word into that file. |
| `.claude/skills/file-a-pool-item` | `.claude/skills/pool-notes/references/file-a-pool-item.md` | 2026-11-17 | The mirror of the row above, removed with it. |
| `.agents/skills/people-pack` | `.agents/skills/room-spots/references/people-pack.md` | 2026-11-17 | Merged into the room-spots skill when the CTO capped the skills (owner, Nov 16: "Let's go ahead"); its body and references moved word for word into that file. |
| `.claude/skills/people-pack` | `.claude/skills/room-spots/references/people-pack.md` | 2026-11-17 | The mirror of the row above, removed with it. |
| `.agents/skills/skill-lessons` | `.agents/skills/done-proof/references/skill-lessons.md` | 2026-11-17 | Merged into the done-proof skill when the CTO capped the skills (owner, Nov 16: "Let's go ahead"); its body and references moved word for word into that file. |
| `.claude/skills/skill-lessons` | `.claude/skills/done-proof/references/skill-lessons.md` | 2026-11-17 | The mirror of the row above, removed with it. |
| `.agents/skills/play-walks` | `.agents/skills/verify/references/play-walks.md` | 2026-11-17 | Merged into the verify skill, which drives the running game from a script, when the CTO capped the skills (owner, Nov 16: "Let's go ahead"); its body moved word for word. |
| `.claude/skills/play-walks` | `.claude/skills/verify/references/play-walks.md` | 2026-11-17 | The mirror of the row above, removed with it. |
| `.agents/skills/crew-messages` | `.agents/skills/crew-coordinator/references/crew-messages.md` | 2026-11-17 | Merged into the crew-coordinator skill when the CTO capped the skills at about 40 (CTO, Nov 17, 13:28Z and 21:28Z on #9747); its body and references moved word for word into crew-coordinator/references/. |
| `.claude/skills/crew-messages` | `.claude/skills/crew-coordinator/references/crew-messages.md` | 2026-11-17 | The mirror of the row above, removed with it. |
| `.agents/skills/seen-in-game` | `.agents/skills/done-proof/references/seen-in-game.md` | 2026-11-17 | Merged into the done-proof skill when the CTO capped the skills at about 40 (CTO, Nov 17, 13:28Z and 21:28Z on #9747); its body and references moved word for word into done-proof/references/. |
| `.claude/skills/seen-in-game` | `.claude/skills/done-proof/references/seen-in-game.md` | 2026-11-17 | The mirror of the row above, removed with it. |
| `.agents/skills/played-world-proof` | `.agents/skills/done-proof/references/played-world-proof.md` | 2026-11-17 | Merged into the done-proof skill when the CTO capped the skills at about 40 (CTO, Nov 17, 13:28Z and 21:28Z on #9747); its body and references moved word for word into done-proof/references/. |
| `.claude/skills/played-world-proof` | `.claude/skills/done-proof/references/played-world-proof.md` | 2026-11-17 | The mirror of the row above, removed with it. |
