---
name: words-reads
description: How the Words lead of Our Civic Duty reads a change to anything a player reads (a scene, a talk, the paper, a speech, the Journal, a screen label) before it joins a train or main, and the numbered rules those reads have set since Nov 13 (rules 30 to 61, after the first twenty-nine on the crew issue). Use when you build or change player words and want to know what the read will ask for, when you are the Words lead or a builder working for it, and when writing lines for a door, a first meeting, home talk, an address or an election story. Not for the engine's mechanics (words-engine), the standard a scene must meet to exist (scene-standard) or checking a screen for developer text (player-screen-text).
---

# Words reads

**A words change is read as played, in drawn places, on a fresh draw, with the lines quoted, before it goes anywhere.** Tests say a rule holds. The read says what a player gets. On Nov 14 the conversation engine passed 15 of 18 test files and, read as played, had all 18 strangers in three towns say the same two questions.

## What the builder sends

1. The head's full sha and what a player now sees, in one sentence.
2. The gate with the train or main merged in: changed tests on the named seed and on a fresh seed, typecheck, `npm run guards`, `tests/english-parts-banks.test.ts`, `npm run words:rules` twice with a clean tree, `npm run words:composed -- --check`, zero-dice, `release:check --mode pr`. Say which reds are also red on the clean base. Never raise a baseline or lower what a test expects to pass.
3. The lines as played, whole, in order, with who speaks: at least three places drawn from all 56 on a seed nobody chose, the places passed over named, in a file under the shared project folder. For a screen, a picture at 1440 by 900 before and after. The change's own subject must appear: a year of papers with no endorsement in it is not a read of an endorsement brief.
4. Faults the builder saw while reading, left in.

## What the lead does

- Reads every line, not a sample, and counts where a count settles it (how many bodies repeat, how many talks ask a question).
- Rules in numbered rules a builder can check, in a file beside the lines, and says which reds are the branch's.
- Writes the lines itself when a builder lists the piece group, the facts a line may read, who speaks to whom and how many wordings are needed. A subject whose pieces are missing stays unoffered; a stand-in line is never written.
- Posts `Words lead: train-ready #N <full sha>` only after the gate and the read, quoting lines as played. A ruling from the owner that a cleared change breaks withdraws the line the same hour.
- A missing picture never holds words back (owner, Nov 14: "do not let pics hold it back. it can be generated later"). The scene plays on its fallback and is named in the wanted-pictures list.

## Rules 30 to 37: election result stories

30. A race for several seats is one story at each outlet, naming its winners together and the first who missed, with how far back.
31. A name in full once, then the last name; two people with one last name keep full names, in headlines too.
32. One name on the ballot is "ran unopposed" or "elected without opposition": no share, no "beat", no vote total. As many names as seats is unopposed.
33. A whole-number share only in a race for one seat with two or more on the ballot; under half, the field is said ("in a field of four"). Counts in figures.
34. Offices in lower case in a sentence; a district office in a headline is "District 5 commissioner". The body by its name as people say it, from the one name writer.
35. The runner-up comes from that race's own count.
36. Headline by last name; the body opens with the race, the count and the runner-up, turnout last.
37. No two outlets print the same body of one race. Wordings are picked by the outlet's order among those that printed it, and the test checks every place it draws.

## Rules 38 to 49: speeches

38. The belief leads an ask at most once in an address; the other asks come first, fold the belief in or leave it out. No address has two sentences opening "Because I".
39. Years are said once; counts under ten in words.
40. The body is named in the greeting and the first ask, then "this council".
41. The close does not repeat an ask.
42. A measure is named once, then "it".
43. An opponent names the measure plainly or their own way, never in its supporters' words.
44. The condition comes before its answer.
45. A figure is called trouble only where the record says so, is said once, and the line after it says what it means with no number.
46. A small amount is not offered as a remedy; with no record of the ask's size, no amount is said.
47. A bad term always shows, whatever kind the address is.
48. A good term says one good thing, the improved measure nearest the address's subject.
49. One "On {theme}," opener at most; the place word comes from the record ("across Guam", never "the state" in a territory); a person is thanked once.

## Rule 50: dialogue is only dialogue (owner, Nov 14)

"None of those count lines or anything like that should pop up in dialogue. It should literally just be dialogue." Nobody speaks a count, tally or progress of the player's own doing. A clerk says once what the office requires and by when; after that people say "that many". Numbers a player needs live on a screen. A clerk telling you your papers are in, or that three others are running, is talk and stays.

## Rules 51 to 61: conversation

51. A stranger does not know you: no name, one greeting, none of the lines for people who have met. Names come out by being given.
52. Nobody asks what they can see or already know. A stranger opens on why the two are in one place or by saying who they are.
53. One fact once in a talk.
54. The question fits the person's record (someone still in school is not asked where they went).
55. A talk never ends on the player's answer.
56. Six strangers in a day are six talks: what a person raises comes from that person.
57. People at home ask questions, each with a record behind it (the player's day, the calendar, something heard).
58. One opening line carries one thing.
59. A line about the President says which side he took, then the speaker's view; no stock phrase stands in for the measure.
60. An answer answers the question; with no local link on record the speaker says so or the question is not offered.
61. One person in a room raises the address in an evening.

## Traps

- A test that counts questions or wordings going red after a rule change is usually telling the truth. Find which change emptied the supply before touching the test.
- A script that prints every wording of a story makes a paper look repetitive; say so in the lines file.
- `data/english/parts/` edits can be refused by the permission check for a builder. Do not work around it: list the lines in bank shape for the lead.
