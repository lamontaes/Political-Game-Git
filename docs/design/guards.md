# Guards

A guard is a check that holds one of the owner's standing rules over the whole tree, on every pull request and every push to main. Each one names its rule in plain words and where to read it, so a red check says what was broken and why it matters.

## How they run

- **One list.** `scripts/guards/index.ts` holds every guard: its id, the rule in plain words, where the rule is written, and the command. `npm run guards` runs them all; `npm run guards -- <id>` runs one. A test file under `tests/guards/` must have an entry there (`scripts/guards/guards.test.ts` checks it).
- **On every change.** The `guards` job in `.github/workflows/validate.yml` runs `npm run guards` on every pull request and push, whatever the change touches, and the required `validate` check fails when it fails. For a pull request it reads GitHub's merge of the pull request into main, so every branch, however old, meets today's guards. The guards are the one exception to "check only the changed files": each holds a rule over the whole tree, and together they take about a minute.
- **Main's required checks.** `validate` and `golden-path`, set by the owner (`docs/release/README.md`, "Required checks").

## Ratchets: what is already there only shrinks

Most rules were broken somewhere before their guard existed. A guard does not wait for the tree to be clean; it counts what is there, beside the guard, and refuses anything new.

- A count may only go down. When a line is fixed, the guard fails until its count is lowered in the same change, so the list never hides a fix.
- A new file starts at zero.
- An allowlist entry for a real exception (a real place name, a quotation) carries its reason.
- Nobody raises a count to make a change pass. The fix is to the change.

## The guards

| Guard                       | The rule                                                                                                                             | File                                                                                        | Its list                                                                            |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `no-dice`                   | No seeded roll or fixed percentage decides what a person, business, official or body does.                                           | `scripts/zero-dice-guard.mjs`                                                               | the allowed lines inside the script                                                 |
| `old-imports`               | The new core is the engine: nothing new imports the old core.                                                                        | `scripts/core2-guard/old-imports.mjs`                                                       | its baseline beside it                                                              |
| `no-second-source`          | One source per fact: no second file writes an event kind another file writes.                                                        | `tests/guards/no-second-source.test.ts`                                                     | `tests/guards/event-kind-writers.json`                                              |
| `families`                  | One engine per mechanic: every file is in one engine family and reaches another family only through its entry files.                 | `tests/guards/families.test.ts`                                                             | `tests/guards/families.json`, `tests/guards/families-baseline.json`                 |
| `research-data-has-reader`  | An effect is a read: every research file has code that reads it.                                                                     | `tests/guards/research-data-has-reader.test.ts`                                             | `scripts/audit/research-data-allowlist.json`                                        |
| `no-module-load-registries` | Handler registries are built inside a function, never while a module loads.                                                          | `tests/guards/no-module-load-registries.test.ts`                                            | none                                                                                |
| `two-seeds-differ`          | Realistic, not real: no statistic but law opens on its published value, and two worlds never open on the same one.                   | `src/core2/realistic-not-real.test.ts`                                                      | the known copies inside the test                                                    |
| `one-history`               | One history: no new reader of the generated past, and no reader of a generated kind once its simulated kind exists.                  | `tests/guards/one-history.test.ts`                                                          | `tests/guards/one-history-proxies.json`                                             |
| `english`                   | Player text is American English, never restates where the player is or who is with them, and carries no ISO date or raw record id.   | `tests/guards/english/` (vocabulary, spelling-dates-units, place-and-presence, player-text) | `tests/guards/english/allowlist.ts`, reading the one engine in `scripts/prose-eval` |
| `kit-only-ui`               | Every piece of UI comes from the UI kit in `src/bench/ui/`; nothing invented.                                                        | `tests/guards/kit-only-ui.test.ts`                                                          | `tests/guards/kit-only-ui-baseline.json`                                            |
| `canned-content`            | Removed canned player text stays removed.                                                                                            | `tests/canned-content-guard.test.ts`                                                        | inside the test                                                                     |
| `director-numbers-in-data`  | Every number lives in a parameter table; every director stopgap is registered.                                                       | `src/director/director.test.ts`                                                             | the director's parameter table                                                      |
| `pool`                      | The pool index is current, every item is well formed, and the items a change touches are SMART.                                      | `scripts/pool/index.ts --check --changed`                                                   | none                                                                                |
| `reading-line`              | A question for the owner shows the look-first search: an OWNER DECISIONS NEEDED section that is not "none" carries the reading line. | `scripts/guards/reading-line.mjs`                                                           | none                                                                                |
| `secrets`                   | No credential or signing material is committed.                                                                                      | `scripts/secrets/scan-tracked-secrets.mjs`                                                  | none                                                                                |
| `wording`                   | Player wording carries no bookkeeping language.                                                                                      | `scripts/english-check/wording.ts`                                                          | `scripts/english-check/wording-baseline.json`                                       |

## Screen rulings in the browser

Rulings about what a screen shows need the game running, so they live in the bench's browser checks (`src/bench/*.browser.mjs`), run against `npm run bench` by whoever changes that screen (`play-first`, `screen-to-mock`). They are not in the guards job. Each ruling is held once, in the check for its screen:

| Ruling                                                                   | Check                                                                 |
| ------------------------------------------------------------------------ | --------------------------------------------------------------------- |
| No text under a title-menu entry, Continue included                      | `src/bench/clock.browser.mjs` (it saves a life, then reads the title) |
| No Family tab on People; family is a filter                              | `src/bench/people.browser.mjs`                                        |
| No box around a person on the People map                                 | `src/bench/people.browser.mjs`                                        |
| One Continue, bottom left, and nothing else on a narration-only beat     | `src/bench/talk-box.browser.mjs`                                      |
| The bottom-left card is the date and time, with no picture of the player | `src/bench/card.browser.mjs`                                          |

## One engine per mechanic: families and boundaries

The owner's rule: one election engine, one body engine, one executive engine, one budget engine, one scene engine, one screen renderer per menu type; the level, office, body, place and law are rows the one engine reads. The guard that holds it has three parts, all reading one map, `tests/guards/families.json`:

1. **Every file is in one family.** Elections, bodies, executive, budgets, laws, jobs and businesses, households and people, the past, the clock and places, news, the director, the English engine, and screens. The kernel every family may import (`src/core2/kernel`, `reference`, `data`, `types`, `state` and the like) is `shared`. The most specific glob decides a file's family, so `src/core2/opening-kin.ts` is people even though `opening-*` is the clock's. A new file outside every family fails until it is placed.
2. **A family is reached through its entry.** A file reaches another family only through that family's entry files: for the core, its `src/core2/modules` files; for the director and the English engine, their top-level files. An import of anything else inside another family is counted per importing file in `tests/guards/families-baseline.json`, and the count only shrinks. To fix one, import the entry or move the code to the family that owns it.
3. **One writer of a record kind.** `no-second-source` already refuses a second file, in any family, writing an event kind. The family map is how a reader tells which engine owns a kind.

`.github/CODEOWNERS` is written from the same map (`node --import tsx scripts/guards/codeowners.ts`), one commented block per family, and the guard fails when the two disagree. GitHub requests a review from a file's owner; the review is required only if branch protection asks for code-owner review. With every session on one account, CODEOWNERS is the map in a form GitHub reads, not a gate. The gate is the guard.

To add a family or move a file: edit `families.json`, regenerate CODEOWNERS, and run the guard.

### Why this shape (research)

- **Engines keep a public face and private insides.** Unreal Engine modules: Private folder contents are "not... exposed to any modules outside its owning module"; Public contents reach only a module that declares a dependency ([Unreal Engine modules](https://dev.epicgames.com/documentation/en-us/unreal-engine/unreal-engine-modules)). Unity assembly definitions: "By exercising fine-grained control over references, you can reduce unnecessary recompilation time and make your code easier to debug" ([Unity manual](https://docs.unity.com/en-us/engine/current/manual/programming-environment/script-compilation/assembly-definition-files)). Bevy: "Create plugins for various sub-systems, like physics or input handling" ([Bevy cheatbook](https://bevy-cheatbook.github.io/programming/plugins.html)). Game Programming Patterns: "To keep the domains isolated, the code for each is placed in its own component class" ([Component](https://gameprogrammingpatterns.com/component.html)).
- **One writer, many readers.** "Every table has exactly one writer, and any number of readers", "a discipline you enforce by convention" and back with a test ([ownership of tables](https://root-11.github.io/intro-book-python/trunk/25_ownership_of_tables.html)). Unity ECS makes taking over another system's output an explicit act: "Write groups provide a mechanism for one system to override another" ([write groups](https://docs.unity3d.com/Packages/com.unity.entities@1.0/manual/systems-write-groups.html)).
- **Tools.** dependency-cruiser's `forbidden` rules ([rules reference](https://github.com/sverweij/dependency-cruiser/blob/main/doc/rules-reference.md)), eslint-plugin-boundaries ([repository](https://github.com/javierbrea/eslint-plugin-boundaries)), ESLint's `no-restricted-imports` ([rule](https://eslint.org/docs/latest/rules/no-restricted-imports)), `import/no-internal-modules` ([rule](https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/no-internal-modules.md)), Nx module boundaries, which need tagged projects ([Nx](https://nx.dev/docs/features/enforce-module-boundaries)), and TypeScript project references, which need a separate compiled project per part ([handbook](https://www.typescriptlang.org/docs/handbook/project-references.html)). None of the first four is installed here, and the last two would split the one package. A test that reads imports does what their direct-import rules do with nothing new to install, the way `scripts/core2-guard/old-imports.mjs` already reads them. If indirect reach or cycle checks are wanted later, dependency-cruiser is the tool to add.
- **CODEOWNERS** requests review automatically; a required review needs branch protection's "Require review from Code Owners", and "the last matching pattern takes the most precedence" ([GitHub docs](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners)).

### Not a git branch per system

The owner asked whether each system should live on its own branch. The evidence says no:

- "Shared branches off mainline/main/trunk are bad at any release cadence" ([trunk-based development](https://trunkbaseddevelopment.com/)).
- Higher-performing teams keep "three or fewer active branches" and merge "to trunk at least once a day" ([DORA](https://dora.dev/capabilities/trunk-based-development/)).
- "Often conflicts appear where the text merges without a problem, but the system still doesn't work" ([Fowler, branching patterns](https://martinfowler.com/articles/branching-patterns.html)). This repository has seen it: a laws change moved a shared reader while a bargaining branch still imported the old copy. The text merged cleanly and the game stopped loading. Long-lived branches per system make that the normal case and break the rule of one finished unit per pull request.

Systems stay separate by their folders, entry files and this guard, on one main.

## Adding a guard

1. Write the check beside its kin: a test under `tests/guards/`, or a script under `scripts/`. Its list, if it needs one, lives beside it, never in a new tracking system.
2. If the tree already breaks the rule, count what is there and make the count shrink-only (see Ratchets).
3. Add one entry to `scripts/guards/index.ts`: the rule in the owner's plain words and where it is written.
4. Add a row to the table above.
5. Show it bite: undo the rule once in a scratch change, see the guard fail, and say so in the pull request.
6. No dates in a guard's name, message or this page. A rule's date lives in `docs/coordination/OWNER-DECISIONS.md`.
