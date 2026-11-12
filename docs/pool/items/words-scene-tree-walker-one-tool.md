---
id: words-scene-tree-walker-one-tool
title: "One tool plays a scene in a drawn world and walks every choice into a numbered tree, for the pre-grade reviewer and dev mode"
area: words
kind: feature
priority: 1
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: words
model: opus
effort: medium
root: design-words-machine
source: the CTO, Nov 12, 2026, on #7365 (comment 6825983162), on what to keep from the closed pull request #8071
checked:
---

**What.** The owner asked on Nov 9, 2026 to see scenes as scenes: "I get the narrator and then the dialogue, and then I get 4 options and they tell me what they're testing", and later to "go in dev mode and actually trigger these scenes ... and give me ... the dialogue trees". Pull request #8071 (closed) built the player for that and its output was twenty scenes numbered for voice grading. The CTO's call: keep the player as one pool item; it becomes the pre-grade reviewer's tool and the dev-mode scene trees the composer design names, merged into one with any walker the composer's design plans. Seen: a reviewer session, before anything goes to the owner, reads a drawn world's scenes as numbered trees (narrator, each line, each choice and what it tests) and dev mode shows the same tree for the scene it just caused.

**Cause.** Found in code: the walker exists only on the closed branch of #8071 (head 8cc4a8b3bd, built in commit 3b3209d0ef, all in its scripts/dialogue-batch folder): `batch-four.ts` (draws worlds from all 56 places with `buildBenchWorld`, plays months, forces scenes through `DevMode`, `forceLayoff` among them, and caches each scene), `batch-four-lib.ts` (`flattenTalk`, `flattenAdaptive`, `composeNarrated`, `setupOf` and `oddities`: it turns `purposeScene` and `composeScene` results and the speech builder into a numbered `Node`/`Choice` tree, following each option to a depth), `batch-four-build.ts` (picks about twenty scenes of mixed kinds and writes the JSON and the page) and `batch-four.test.ts` (shape, numbering, every key a bank piece). Nothing of it is on main. What main already has does a different half: `scripts/play-walks/lib.mjs` plays a new life in a browser as a player does and writes down what it saw, and `scripts/words/composed.ts` (npm run `words:composed`) plays days through the bench's own routes and keeps every text as a composed text for the composed checks in `src/english/composed-checks.ts`; neither walks every option of a choice or numbers a scene as a tree, and neither forces a scene of a named kind. `docs/design/words-composer.md` part 6 plans "the pre-grade walk" (a session plays a new life, reads the screens and grades) and names no tree walker of its own, so this item is the one tool for the tree, not a third. `oddities` in `batch-four-lib.ts` is a hand-made list of detectors for a filled line and duplicates the composed checks; it is not brought over.

**Fix.**

1. Bring `batch-four-lib.ts` (the tree flattening) and the drawing and forcing part of `batch-four.ts` to main as one module under `scripts/words/` beside `composed.ts`, renamed for what it does (a scene tree, not batch four), reusing `composed.ts`'s world drawing and `src/english/composed-text.ts` for the texts, so the tree's lines are `ComposedText` values the composed checks can read.
2. Delete `oddities`; run the composed checks over the tree's texts instead (`runComposedRules`), and list each break beside its numbered line.
3. Add a scene-tree view to dev mode (`src/bench/dev-mode.ts`) that shows the tree of the scene it just caused, from the same module (the module returns data; the view words only labels).
4. If the composer's design or any open words item already plans a tree walker, merge it into this one and delete the other the same day (CTO, Nov 12). Search `docs/pool/items` and `scripts/words` for it first and name what was merged in Notes.
5. Keep `batch-four.test.ts`'s checks (shape, numbering, every key a bank piece) as the module's test, on a world the test draws itself.

**Time box.** 4 hours for one session. When it runs out, push what passes, set the item's state honestly with a one-line note, and stop.

**Rules.** One system: one tree walker, the second deleted the same day (CTO, Nov 12). Replace, never layer: no third walker beside play-walks and composed.ts. No hand-written player text: every line in the tree is a bank piece the game said, cited by key. Development tooling; shipped play never imports it. One rule, all 56 places: worlds are drawn, and each run names its place and seed. Builders build, checkers check.

**Done when.** A second session runs the tool on a drawn place it chose, sees a numbered tree for at least five scenes of different kinds with every option labeled with what it tests and every key a bank piece, sees the composed checks' breaks listed beside the lines they name, opens dev mode in that place, causes one of those scenes and sees the same tree, and finds no second tree walker left in `scripts/` or `src/bench`. Every run names its place and seed.

**Waits on.** Nothing.

**Files.** scripts/words/composed.ts, scripts/play-walks/lib.mjs, src/english/composed-text.ts, src/english/composed-checks.ts, src/bench/dev-mode.ts, docs/design/words-composer.md

**Notes.**

Added by the lead (Fable A) on Nov 12, 2026, on the CTO's call on #7365. Read the old files with `git fetch origin pull/8071/head` then `git show FETCH_HEAD:scripts/dialogue-batch/batch-four-lib.ts` (a path on that branch only); the closed branch is the only place they live. The batch pages themselves (the 2026-11-09 batch 4 JSON and page on that branch) are not wanted on main (`words-batches-as-artifacts`).
