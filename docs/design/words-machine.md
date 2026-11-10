# The words machine

Every note you give about a line becomes a rule a program can test. After each grading, every rule runs over every line in the game. A line that breaks a rule is pulled from play and queued for a rewrite. A rewrite goes back into play when it passes the rules, without waiting for you. You grade small samples by voice and never thousands of lines. The odds that made a disliked kind of line a little rarer are deleted.

## Where this comes from

Design by Fable, November 10, 2026, for pool item `words-machine-rules-from-the-owners-notes`. It answers root cause 4 of the audit (`docs/audits/fable-vision-2026-11-09.md` on branch `audit/fable-vision`).

## What you ruled

- October 23: "every time I update a batch or something, it should update through the entire game."
- October 27: "I grade 17, that should calibrate the entire engine."
- November 8: "im not grading 6000 lines and 800 conversations individually."
- November 9: "so that these shitty lines don't happen again."
- November 9: "you can take the lessons from this, not just the grades from those ones that I graded."
- November 9: "I don't know why like my notes and stuff need to be merged into main."
- November 10, in Fable's session, on four questions:
  - A line that breaks a rule is pulled and rewritten. Good lines are never touched. Odds stop being the main tool.
  - "I'm also not gonna grade 6,000 individual lines. That's the problem." So the rules judge, and a rewritten line returns when it passes them.
  - "Kind of weird" with no rewrite means pull the line until it is rewritten. "The context is weird" means fix the setup and keep the line.
  - Your batch pages and voice notes stay off main. Only the rules and grades that come out of them go to main.

## What the game does today

Measured on main on November 9 and read again on November 10:

- **A grade reaches almost nothing.** There are about 11,500 pieces in the banks. A bad grade holds back 39 of them.
- **The rest is odds.** A map of features moves a line's chance between 0.6 and 1.4. A second table moves it between 0.8 and 1.25. Lines from the scene you rejected on November 8 carry 1.31 to 1.52 times a neutral line's chance.
- **More than half the spots have one line.** 3,186 of 5,661 spots hold a single line, so odds change nothing there.
- **Your reasons are stored and never read.** Each grade row keeps your words in a note field. No code reads it.
- **Half the rules are advice.** 13 of the 26 written rules have a test. The other 13 are read by a writer, if at all.
- **Some tests contradict you.** The list of "bare refusals" includes "No comment" and "I'm not going to talk about that." You called both fine on October 15.
- **Grades are counted three and four times.** Each run of the grading script adds a batch again. The open grade pull requests record every batch 2 grade three times, and four times in the later ones.

## The design

**1. A rule is your note, made testable.** Each rule holds:

- your words and the date you said them;
- one plain sentence of what it forbids or requires;
- how it is tested (see 2);
- lines you rejected that it must catch, and lines you liked that it must not.

The second list is the rule's own test. A rule that flags a line you graded good is wrong, and is narrowed until it does not. The report lists every such conflict.

**2. Three kinds of test.**

- **The line's own words.** A phrase, an opening word, a shape: "the doors", "Talk to you soon" after an answer, a question that names nothing. A program reads the line.
- **The line's place.** Whether a reply follows what was just said, whether a person was introduced before a line addresses them, whether a talk ends on a bare yes. A program reads the line together with the lines that can come before and after it in its scene.
- **Meaning and tone.** Whether a line tagged anxious reads as anxious, whether a line explains its own subtext. A program cannot judge these. A reviewer judges each line once, when the line is written or changed, and the verdict is saved beside the rule with the line's exact text. The check then reads the saved verdict. A line with no verdict for a rule of this kind does not pass. Nothing is judged while the game is played.

**3. The run.** After each grading, and whenever a bank changes, every rule runs over every line. The output is one list: each pulled line, the rule it broke and your note behind the rule.

**4. What play reads.** The game reads two things: your grades and the pulled list. A line plays unless you graded it bad or a rule pulled it. A line you graded good always plays. The feature map, the reach table and the weights that favored ungraded lines are deleted.

**5. No spot goes silent.** A spot whose every line is pulled is rewritten in the same change, before it merges. The check refuses a change that leaves a spot with no line.

**6. Rewrites.** A pulled line goes on a queue with its rule and your note. A writer rewrites it from the same facts the line is filled from. The new line must pass every rule and the check that it says only what the records hold. Then it plays. It also goes into your next small sample, so you see what the machine let through.

**7. Every grade is counted once.** The ledger is keyed by batch and row. Folding a batch twice changes nothing.

**8. Your samples.** A batch comes to you as a page, not as a file on main. Your voice note stays off main. What reaches main is the grade rows, each with the rule it taught, and the rules themselves. A sample is small and is made of the lines the machine is least sure about: fresh rewrites, and lines that sit near a rule's edge.

**9. Two kinds of "weird".**

- "Kind of weird", with no rewrite from you: the line is pulled until it is rewritten.
- "The context is weird": the line stays. The fault is recorded against the scene's setup, and the setup is what gets fixed.

## What is deleted

| Deleted                                                                                                    | Replaced by                                        |
| ---------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| The feature map and its 0.6 to 1.4 factor (`data/english/grade-map.json`, `src/english/grade-map.ts`)      | The pulled list                                    |
| The reach table and its 0.8 to 1.25 factor (`data/english/grade-reach.json`, `src/english/grade-reach.ts`) | The pulled list                                    |
| The weights that favor ungraded lines (`data/english/calibration.json`)                                    | Nothing: a line plays or it does not               |
| The map's unread rewrite list                                                                              | The rewrite queue                                  |
| Rules with no test                                                                                         | Each rule has a test of one of the three kinds     |
| The note field no code reads                                                                               | The rule each note became                          |
| Batch pages and voice notes on main                                                                        | Pages delivered off main; grades and rules on main |
| The three grade pull requests that count grades three and four times                                       | One fold that counts each grade once               |

## The order of the work

Each step is its own pull request, checked by a second session in the running game.

1. **Grades counted once.** The fold is keyed by batch and row. Batches 2 and 3 are folded once. The three open grade pull requests are replaced. Batch pages and voice notes leave main.
2. **Rules and the run.** Each of your notes becomes a rule with a test of the first kind where one fits. The run, the pulled list, the report and the check on new lines. The odds are deleted in the same change. The `words-engine` skill is rewritten to this machine in the same change: how a note becomes a rule, the three kinds of test, the run, the rewrite queue and the sample. You asked for that on November 9: "i want to make sure we talk thru it and make/update skills."
3. **A line's place.** The tests of the second kind, over the scenes the banks can assemble.
4. **Meaning and tone, and the rewrite loop.** Saved verdicts, the rewrite queue, and the first rewrites of pulled lines, starting with spots that would otherwise go silent.

## How a second session checks it

- **The report.** Run the rules over every bank line. The report lists each of your notes, the rule it became and the lines it pulled.
- **The gate.** Add a line that breaks a rule to a bank. The check refuses it by the rule's name.
- **Play.** Play a year in a drawn place, and the same year in Tesuque, New Mexico, seed 8a5d1fba28fc. None of the lines you rejected by voice on November 8 plays. No scene falls back on small talk it does not own.
- **Counted once.** The report shows each batch 2 row at 1.
- **Good lines kept.** Every line you graded good is still in the banks and still plays.

## Risks, and how each is held

- **A rule that is too broad pulls good lines.** Every rule is tested against the lines you graded good before it may pull anything. The report shows how many lines each rule pulls, so a rule that pulls a tenth of the game is seen at once.
- **Many lines pulled at once leave scenes thin.** Step 2 reports the counts before anything merges. Spots with one line are rewritten first.
- **Verdicts on meaning drift.** A verdict is tied to the line's exact text. A changed line needs a new verdict.
- **Rewrites nobody sees.** Every rewrite goes into your next sample.
