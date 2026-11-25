# Red main: dated lessons

Part of the `red-main` skill. Two Nov 11 cases: a red traced wrongly twice, and five reds by draw in one hour.

## Lessons of Nov 11 (a red traced wrongly twice before it was traced right)

A check failed 3 runs in 9 on a pull request that had just merged. The lead named two wrong causes before the right one. Each mistake has a rule.

- **Name the commit you ran, and check it does not hold the change you are clearing.** "Clean main" was fetched four minutes after the change had merged into it, so the run proved nothing. Before a run that is meant to clear a change, print `git log --oneline -1` and run `git merge-base --is-ancestor <the change's head> HEAD`; if that succeeds, you are not on clean main. Use the first parent of the change's merge commit.
- **A failure that happens every run on a seed is not a race.** The first theory was two redraws racing. A race fails sometimes on one seed; this failed every time on three seeds and never on others. Ask what the failing seeds share before you write a fix (here: the bill the check clicked was already open).
- **Log before you theorize.** What found it was ten lines of logging: each draw's start and end, and the page's sections after the click. The log showed the redraws ran and the page ignored them. Add the log to a scratch copy of the check, never to the game.
- **Say on the crew's issue when you were wrong, in the same hour,** with what you ran and what it showed. A wrong cause left standing sends the next session down it.

## Lessons of Nov 11 (the afternoon: five reds by draw in one hour)

- **A registration at the top of a file fails by load order.** `legislature.ts` called the corruption module's `registerBribeScope` as the file loaded. The two import each other through `people`, so when a test loaded a person's card first, the call ran before the list existed ("Cannot access 'scopes' before initialization"). Register in the module's opening function (`openLegislature`), beside the registrations already there, and make the register keep one copy.
- **"The first" or "the last" row of a table is whoever sorts there.** A test kept the last serving legislator it found. Since other states' chambers are kept as records with no person, the last one was Wyoming's, and the engine rightly refused to act for it. A test names the case it needs (the played state's own chamber, a holder who is a person) and passes over the rest.
- **Check the route still reads what the check sends.** A browser check asked for a world on a date in 2026. The route has opened every game on the one start date since Oct 14 and ignores the date, so the check failed wherever no filing window was open on the first day. Read the route before blaming the screen.
- **Run the failing seed on main before you own the failure.** A changed-file test failed on a fix branch; with the same seed (`DEV_MODE_SEED`) it failed on main too. It was a separate red by draw and got its own owner.
- **A failure that does not reproduce on the train head may be a branch that lacks the train.** A leak report held on a branch about 680 commits behind; the same run on the clean train head matched exactly. Reproduce on the clean base before naming a cause, and say which head each run used.
- **Find which fold changed a number by bisecting the train's first parents on a probe (Nov 15).** When a merge of the train turns tests red, write a short probe that prints the number the test reads (here, a place's count of counted groups at the opening), then `git bisect start --first-parent <train head> <merge base>` and `git bisect run` a script that exits 0, 1 or 125 on the probe. Each step is one world build, about a minute; it named the jobs fold that regrouped Bastrop in eight steps.
- **A bisect probe classifies on the test runner's own summary, never on text a passing run also prints (Nov 15).** The line `Tests 1 passed` is good and `Tests 1 failed` plus the failure message is bad; a probe that matched the place's name or a progress line marked good commits bad twice. Skip a commit only on a build or load error, and run `git bisect --first-parent` from the latest known good.
