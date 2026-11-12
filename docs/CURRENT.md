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

## Replaced or removed, kept forever

| Old path | Now | When | Why |
| --- | --- | --- | --- |
| `src/simulation` | `src/core2` | 2026-10-28 | The old core was deleted (pull request 6659); the new core is the engine. |
| `src/bench/scene-check.ts` | nothing stands in its place; restore it from commit e83ccf5d83e67e48df658367b55fade2f1e6453d | 2026-11-11 | Removed with the painted people (owner's call 11, PR 8643): the room's people are a strip of busts; the check of painted people in a room has nothing to check. |
| `src/bench/art-check.ts` | nothing stands in its place; restore it from commit e83ccf5d83e67e48df658367b55fade2f1e6453d | 2026-11-11 | Removed with the painted people (owner's call 11, PR 8643): the painted full-body people left the rooms; their art check went with them. |
| `src/bench/people-pack.test.ts` | nothing stands in its place; restore it from commit e83ccf5d83e67e48df658367b55fade2f1e6453d | 2026-11-11 | Removed with the painted people (owner's call 11, PR 8643): the people pack's room figures are not drawn any more; the bust tests cover faces. |
| `src/director/scene-occasions.test.ts` | nothing stands in its place; restore it from commit e83ccf5d83e67e48df658367b55fade2f1e6453d | 2026-11-11 | Removed with the painted people (owner's call 11, PR 8643): it tested where painted people stood in a room. |
| `src/bench/framing.browser.mjs` | nothing stands in its place; restore it from commit e83ccf5d83e67e48df658367b55fade2f1e6453d | 2026-11-11 | Removed with the painted people (owner's call 11, PR 8643): it checked how painted people were framed in a room. |
| `data/english/parts/person-sketch.json` | nothing stands in its place: the person card shows each leaning by its label (and its strength on the You screen); restore it from commit 354fa017bdc126990eaec3a30367173e519bcfc2 | 2026-11-12 | Every line in it only said a trait's label again in other words, with no fact from the world's records (owner, Nov 11: every line through the English engine; Fable A on #7365, Nov 12: a line that only restates the trait's name beside it is deleted). |
