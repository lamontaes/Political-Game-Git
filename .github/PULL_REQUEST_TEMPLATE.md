Pool item: <id>

Checks (changed files): <eslint, prettier, typecheck, the changed tests, zero-dice, release:check --mode pr, pool --check>, <results>.

<!-- Line 1 must be exactly "Pool item: <id>" with no backticks: the merge flips that item to done. Line 3 is the gate line the merger reads. -->

**What changed for the player.** <Plain words: what the owner can now see or do. "Before:" and "After:" where that helps.>

**Done when.** One row per line of the item's done-when, copied word for word. Evidence is something the merger can check: a test name and its result, a command and its output, the place and full seed drawn from all 56, and the record ids that show another engine reading what this wrote. A line without evidence means the item isn't done (session-start, "Self-check before the PR").

| Done-when line | Evidence                                               |
| -------------- | ------------------------------------------------------ |
| <line>         | <test, command and result, place and seed, record ids> |

**Break-it check.** <For each new or changed test: the line you undid, and that the test failed without it and passed with it.>

**Removed.** <What this replaced and deleted (replace, never layer), or "nothing".>

**OWNER DECISIONS NEEDED.** <Only if a design is the owner's call: the question in one line, and the owner-decision stopgap id. Otherwise delete this section.>
