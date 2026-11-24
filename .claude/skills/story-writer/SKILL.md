---
name: story-writer
description: >
  The shared loop for every Story writer, the Sonnet area writers and the Codex
  writers alike: find the real element first, write many versions per slot that
  differ in what they say, cite elements and issues, give elements their turns,
  pass the sameness gate and the pre-grade, and keep working without waiting.
  Use before writing, rewriting or deleting any line under data/english/parts
  or any element under docs/story/elements. Area rules: speech-writer,
  journal-writer, news-writer; talk scenes also follow scene-standard.
---

# Story writer

The owner, Nov 24, 2026:

- 8:45 a.m.: "The story engine is supposed to work together."
- 8:51 a.m.: "There needs to be more variety. Like a million times more variety. Like, oh my God. Depth, not breadth."
- 9:45 a.m.: "All they have to do is find like real life scenes and stuff, right? And look at what the code can do and make that."
- 10:00 a.m.: "It keeps stopping at every little step. It needs to keep working."

The format of a line, the bank files, the moves and facts of each lane and the exact checks are in the Story lead's `docs/story/writer-spec.md` on branch `story/first-evening`. This skill holds what stays true across lanes.

## The rules that must hold

1. **Your scope is a system, never a moment.** You own your area across every kind of text and every stretch of a life it plays in. A test place (the first evening, the six packet seeds) is where you check the work, not the job (owner, Nov 24: "Why are you doing these incremental little steps?").
2. **Real first.** Every line draws on an element in `docs/story/elements/<kind>/<id>.json` (kinds: moment, move, voice, situation, detail, consequence). Search the bank before adding; put your evidence on a match instead of making a twin. A real moment you find goes into an `elements:` PR to main the same hour, so every writer can use it. Sources name the real speech, paper, record or archive with its URL. Quote at most 15 words, and never put a real person's name or words in a line.
3. **Every line cites its elements and its issues.** `elements` lists the element ids it draws on. `issues` lists bill catalog policy ids (`src/core2/data/legislature/bill-catalog.json`), question keys (`data/english/question-names.json`) or "none". A line that nothing real stands behind is deleted, not reworded (owner, Nov 24).
4. **Elements have turns, like the laws.** Every law can be undone, and an element can be flipped to its opposite, softened to neutral or met halfway (owner, Nov 24: "the opposite of most of these elements should also be possible as well, just like the laws"). Write lines for each turn the world can produce: for and against, kept and undone, raised and cut.
5. **Depth.** Aim for hundreds of versions per slot over time, multiplied by the speaker's traits, the record's inserts, the planner's shape and the situation. Versions differ in what they say, each tied to a fact (`variants-differ-in-what-they-say`), and in how the sentence is built, not only in its nouns (the sameness gate counts frames).
6. **The game's laws pick what to write.** Take the thinnest cells of the coverage map first, issue first (`scripts/story/coverage.ts` writes `docs/story/coverage.md` on the Story branch). Owner, Nov 24: "using what's in the game to help dictate what to be made will help immensely."
7. **People talk like people.** A person reacts to what a law means for people they know and never says the catalog's name ("So the President wants a higher top income tax rate" failed on Nov 24; the concept he gave is "finally, someone wants to tax the rich"). No figures in speeches or talk except what a slot carries. Plain American English, and every rule in `data/english/line-rules.json`.
8. **Delete, don't fix.** A line or a stretch that isn't working is deleted, and the old lines a new batch replaces go in the same change (owner, Nov 17, three times; "replaced means deleted").
9. **The gate, in order:** `npm run words:rules`, the tests, the sameness gate, the draw count, the pre-grade (`pre-grade`), then his ear on a grading page. Nothing reaches main until he passes it in a played game (his approved plan, Nov 23). You never grade your own lines.
10. **Nobody waits.** Cite elements from main, from open element PRs or from branches. If something blocks you, post it once and keep writing. Only his own decisions wait. Big batches.

## The loop, one batch

1. Merge `story/first-evening` (and through it, main) into your branch.
2. Read the coverage map for your area and take the thinnest cells, issue first.
3. Find the real moments: the element bank first, then research, then a new `elements:` PR.
4. Write the lines: many per slot, each one tied to an element, cited and turned, in the writer-spec format.
5. Run the writer-spec checks, and read your lines as they play in all six packet places.
6. Post `Writer <area>:` on #9750 with the head, the line count, the gate counts for your slots before and after, and six lines as played.
7. When the pre-grade fails lines, delete or rewrite them. Don't argue a fail; his words decide.

## Who uses which skill

| Lane                                                                                                           | Skills                                    |
| -------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| Speeches, national and state; speeches, local and campaign                                                     | `speech-writer`                           |
| The Journal; the years before the first evening, loading and history                                           | `journal-writer`                          |
| The news and the press                                                                                         | `news-writer`                             |
| Home and family; campaigning; office and government; work, school, church and community; Codex writers A and B | `scene-standard` and the talk rules below |

## Talk rules (home, campaign, office, community)

From his grades. `scene-standard` holds the rest.

- **Four replies, four stances.** Owner, Nov 24: "all four of them are saying the same things." A short set beats four rewordings of one answer.
- **Small talk loses to anything with a record.** Owner, Nov 24: "Those sound like shitty filler lines there." Nov 12, on "What do you do?": "a useless interaction. It just shouldn't even be there." A talk fires on a record or not at all.
- **A reply answers the line before,** and a question asks only what the listener could know. Nov 12, on "What would that mean for Wofford Heights?": "how the hell would she know?"
- **Each person says something different.** Nov 12: "Maya and Logan... basically saying the same thing."
- **Pronouns and titles after the first mention.** Nov 12: "saying the full name every time. There needs to be pronouns and titles."
- **Narration fits the scene the player is in.** Nov 23: "You hang your coat by the door. I thought I was sitting at the kitchen table."

## Gotchas

- Nov 24: five writers were scoped to slots of one evening (the address call, the first evening's entry, the talk about the address). The owner: "Don't work on the address. Work on speeches." Scope by system.
- Nov 24: Codex writer A stopped to wait for a CTO merge. The owner: "It keeps stopping at every little step." Cite from the open PR and keep going.
- Nov 24: element PRs failed Prettier, then `release:check`. Run `npx prettier --write docs/story/elements` and add `docs/release/changes/<id>.md` with `impact: none` until the heavy workflows skip `docs/story/elements/` (#10467). Open element PRs ready for review, never as drafts: the merge watcher skips drafts.
- Nov 24: the pre-grade failed lines that put a verb before `{about}`, because some `{about}` fills are gerunds ("pass expanding Medicaid"). Read each line with every fill its slot can take (`docs/story/gerund-fill-flags.md` on `story/first-evening-pregrade`).
- Nov 19: about 2,100 address lines went in overnight from a helper and shipped that morning without his ear. Bulk fill is not depth.
