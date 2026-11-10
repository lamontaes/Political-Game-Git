Pool item: <id>

Checks (changed files): <eslint, prettier, typecheck, the changed tests, zero-dice, release:check --mode pr, pool --check>, <results>.

<!-- Line 1 must be exactly "Pool item: <id>" with no backticks: the merge flips that item to merged, and a second session's check in the running game makes it done (seen-in-game). Line 3 is the gate line the merger reads. -->

**What changed for the player.** <Plain words: what the owner can now see or do. "Before:" and "After:" where that helps.>

**Done when.** One row per line of the item's done-when, copied word for word. Evidence is something the merger can check: a test name and its result, a command and its output, the place and full seed drawn from all 56, and the record ids that show another engine reading what this wrote. A line without evidence means the item isn't done (session-start, "Self-check before the PR").

| Done-when line | Evidence                                               |
| -------------- | ------------------------------------------------------ |
| <line>         | <test, command and result, place and seed, record ids> |

**How a second session checks it in the game.** <The steps for a session that did not build this: the screen, the dev mode control, the place to draw or the named place and seed, and what must be on screen after (a number, a name, a line). "Nothing to see in the game" for docs, skills and pool changes.>

**Break-it check.** <For each new or changed test: the line you undid, and that the test failed without it and passed with it.>

**Removed.** <What this replaced and deleted (replace, never layer), or "nothing".>

**OWNER DECISIONS NEEDED.** <Only if a design is the owner's call: the question in one line, the owner-decision stopgap id, and the reading line `Read: OWNER-DECISIONS (<newest ruling date>), DECISION-REGISTER, prior-rulings/<file>, LAW; searched: <terms>` (owner, Oct 26; `.agents/rules/smart-and-look-first.md`). A question without the reading line is sent back. Otherwise delete this section.>
