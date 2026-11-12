# The words composer

Design by Fable A, November 12, 2026, on the owner's order of that night. It changes how the English engine puts text together, for every kind of text at once. It does not rewrite one sentence.

## What you said

- November 12, after grading four scenes of a new life: "I can't even grade the rest of this. I thought every line of the game had been went through already."
- "I don't think you should be rewriting one sentence at a time ... you need to be changing the engine to where ... different parts are written differently, more clearly, different rules."
- "don't only just make changes just for the president's speech. This should apply to all speeches and everything else that can be applied to a speech ... You're focusing too much on the president's speech when the problem is the engine."

## Why the last fixes did not hold

Read on main on November 12, with file and line in the build items.

- **The rules judge one bank line at a time, and your notes are about text put together.** Of the 86 rules, 50 are waiting for a test. Nearly all of those are about a whole speech, an exchange or a line in its place ("an address is national", "introduced before addressed", "a speech has a core"). No program reads a composed speech or a composed talk, so nothing stops a bad one.
- **Each kind of text has its own code.** The President's address has a planner. The governor's and mayor's have another. The player's speech, a victory speech, a floor speech and a talk at home each join their pieces their own way. A fix to one reaches none of the others. The limits on repeating a name or a subject exist only in the President's address.
- **Nothing says a person.** A title is typed into each bank line ("Speaker {speaker}"), so a line that forgot it prints a bare name ("Kathryn Hansen will work with me"). In talk, the President's slot is always the full name. The reader that knows "he" and "she" is used by one screen and by no line.
- **A talk is not told who is in the room, what hour it is, or what was said today.** The room's people are never passed in. The hour is read only for the goodbye. What anyone in the house said that day is recorded and never read back. So two housemates make the same point, one asks after the other who is standing there, and "Busy one at work today?" is asked at 7:00 a.m. every morning.
- **A speech has no theme.** Its asks are the three questions the President's record leans on hardest, and one question (the ban on stock trading by members of Congress) leans hard for almost every President, so it leads almost every address. The set that should stop a subject being told twice is never filled.
- **Lessons were written and not built.** "Small talk loses to anything with a record" and "words know the hour and the person" are lines in the words skill from November 11. The code for them never landed.

## The change: six shared parts every text goes through

Today a composer picks pieces and joins them. From now on every composer (speech, talk, scene, Journal, news, narration) does the same four steps with the same parts: it is handed **the telling**, it makes **an outline**, it words each sentence through **the join**, and it says every person and thing through **said-as**. Then **composed checks** read the result in drawn worlds.

### 1. The telling: what this text knows before a word is picked

One record handed to every composer. It holds:

- **who is speaking and who is listening**, their tie, and whether they share a household;
- **what the listener and the player already know**: their own records, what they have been told, what this text has already introduced;
- **the room**: who is present;
- **the clock**: the hour, the part of the day, and what is left of the day;
- **what has been said**: in this text, on this screen, in this household today, and to this person this week;
- **budgets**: how many times a name, a subject or a figure may be said.

A composer that needs a fact the telling does not hold cannot say the line. That is how "a housemate knows your job", "no reply asks what the listener can't know" and "context the player has" stop being advice.

### 2. Said-as: one reader says every person, office, employer, bill and place

No bank line holds a title or a full name. A line holds a slot for a person, and the reader words it from the telling:

- first mention in a text: role and name ("Vice President Kathryn Hansen", "your sister Maya");
- after that: the role ("the Vice President"), the pronoun, or the first name for someone close;
- to their face: what the speaker calls them;
- never a full name twice on one screen, and never a bare full name for someone the listener has not been told about.

The same reader already says seats, states, bills and employers in a few places. Those join it, so "the outside market" and "a treasury" can never be printed as an employer again, anywhere.

### 3. The outline: plan first, then words

Every kind of text has an outline in a data table: its sections in order, what each section must carry, and what the whole text is about.

- **A speech has one theme.** The planner picks it from the speaker's own record and what is happening in their world, then keeps only the points, asks and figures that belong to it. An ask is chosen from the speaker's platform for this world, so asks differ between worlds, and each is said once.
- **A point may open with its context, in one smooth sentence from the world's own records.** You, November 12: "it's okay if context is given ... for 30 years we've suffered from terrible inflation, averaging out to over 12% per year ... I'm determined to get that down ... something like that, that just establishes context in a smooth way." The outline gives a point three steps: the context (how long, how much, from the records), the speaker's stand, then the ask.
- **Every kind of speech is calibrated against real ones.** That means real inaugurals, State of the Union and State of the State addresses, stump speeches, floor speeches and concessions. Each kind's order, its transitions and its move from theme to proof to ask come from them. How speechwriters teach the craft is read too. The research sets the outline rows; it never picks what one speaker says.
- **Each kind of speech has its real order.** An inaugural, a state of the state, a mayor's address, a campaign speech, a floor speech, a victory and a concession each get a row, from real speeches of that kind. One planner reads the row; the per-kind planners are deleted.
- **A talk has an outline too.** Its subject is anything with a record before small talk, and never one this person raised this week. The speaker's point is their own, not one a housemate made today. Each reply is a different move that the listener can answer from what they know. The close fits the hour.
- **A Journal paragraph and a news story have one:** a sentence that stands alone comes first; a sentence that leans on another is never shown without it.
- **The pictures follow the outline.** The address shows the people the speech names, when it names them.

### 4. The join: how pieces become a sentence

Pieces are typed by what they are (who is addressed, the claim, the reason, the turn, the ask, the close). A small table says which types may share a sentence and with which word or mark between them.

- one idea to a sentence; two full clauses are never joined by a comma;
- an opener that only announces the next clause is not a type, so it cannot be picked;
- one tense in a sentence;
- a size word ("some", "big time") is chosen with its noun, not pasted beside it.

### 5. Stance: a position is a record, and its words are typed

A position is the subject, the side (for or against) and the act (sign, veto, ask, oppose). A wording is written for one side and offered only for that side, so a sentence cannot leave you asking "Is he for it? Is he against it?" The level is part of the record: a federal law is not asked of governors.

### 6. Composed checks: rules that read the text as you read it

A fourth kind of test joins the three the words machine has. A composed rule runs over whole texts made in drawn worlds: every kind of speech, a week of talk at home, the Journal's first pages, a week of the paper. Each of your notes about composed text becomes one. The count of breaks is kept per rule and may only go down, like the count of lines with no insert.

The same texts feed the pre-grade: before anything goes to you, a session that did not build it plays a new life, reads the screens, and grades each scene as you would from your past grades and complaints. Only what survives is sent.

## The rules, where each lives, and what it changes

| Rule (your words, November 12, unless dated)                                                                   | Shared part                     | Texts it changes                                                                       |
| -------------------------------------------------------------------------------------------------------------- | ------------------------------- | -------------------------------------------------------------------------------------- |
| One theme to a speech ("There's no theme for the speech. That's a problem.")                                   | Outline                         | Every speech: President, governor, mayor, campaign, floor, debate, victory, concession |
| Each kind of speech in its real order ("starts off with a list of people ... That doesn't make any sense")     | Outline                         | Every speech                                                                           |
| Asks differ by world and are said once ("why is it always stock trading?")                                     | Outline, stance                 | Every speech; the talk after a speech                                                  |
| A stance is plainly for or against ("Is he for it? Is he against it?")                                         | Stance                          | Speeches, debates, talk about views, news of a vote                                    |
| A request goes to the level that can act ("If it's a federal law, it's a federal law.")                        | Stance                          | Speeches, talk, news                                                                   |
| People by role, pronoun or relationship ("who's Kathryn Hansen?", "There needs to be pronouns and titles.")    | Said-as                         | Every text with a person in it                                                         |
| No full name twice on a screen ("saying the full name every time")                                             | Said-as, telling                | Talk, scenes, speeches, Journal, news                                                  |
| Only what the player has been told ("I, as the player, have no context for that.", "What oath?")               | Telling                         | Speeches, scenes, narration, Journal                                                   |
| No speaker's home state or other stray place ("Why Georgia?"; Oct 27: "Why is he specifying on Colorado?")     | Outline, telling                | Every speech                                                                           |
| One idea to a sentence, no comma splice ("we're combining two ideas together")                                 | Join                            | Every composed sentence                                                                |
| Sentences in a paragraph follow one another ("disjointed statements put together")                             | Outline, join                   | Speeches, Journal, news                                                                |
| One tense in a sentence ("mixing tenses")                                                                      | Join                            | Every composed sentence                                                                |
| A figure says which way and whose ("Keep going up or down?", "beat the price tags. What does that mean?")      | Join, stance                    | Speeches, news, talk about the economy                                                 |
| No gloating a speaker has no ground for ("is he gloating from his predecessor?")                               | Outline (occasion), telling     | Inaugurals, first addresses, victory speeches                                          |
| The opening narration names who is there ("you and your sister Maya and friend Logan ... settle in to listen") | Said-as, telling                | Scene narration                                                                        |
| Pictures show who the text names ("random busts of people")                                                    | Outline                         | The address montage; later, any speech's pictures                                      |
| No non-replies ("the same bullshit ... with the just non-replies"; "a useless interaction")                    | Outline (talk), composed checks | Talk, scenes                                                                           |
| No reply asks what the listener can't know ("how the hell would she know?")                                    | Telling                         | Talk, scenes                                                                           |
| People who live together know each other's facts ("What do you do?" from a housemate)                          | Telling                         | Talk at home, family scenes                                                            |
| Two people in a room make different points ("basically saying the same thing")                                 | Telling (said today)            | Talk at home, crowd and floor scenes, debates                                          |
| Lines fit the hour ("Let's pick this up again tonight" at 8:30 p.m.; "enjoy what's left of tonight")           | Telling (clock)                 | Talk, closers, narration                                                               |
| No daily loop of one subject (the 7:00 a.m. work talk for four weeks)                                          | Outline (talk), telling         | Talk                                                                                   |
| Nobody is asked after while they stand there ("Have you talked to Maya?")                                      | Telling (room)                  | Talk                                                                                   |
| A Journal note stands alone and names its law and amount ("doesn't even make sense")                           | Outline (Journal), said-as      | Journal, toasts                                                                        |
| A news line is a sentence, not a label ("Neither does the news toast.")                                        | Outline (news), said-as         | News toasts, the paper                                                                 |
| Work is said as people say it ("a stocker ... I thought these were all taken out"; "a works outside the town") | Said-as                         | Talk, Journal, cards, news                                                             |

"Why are there no real jobs?" is not a words rule. It is the town's employers, and it goes to the engine that makes them as its own item.

## How it is built

Each unit is one pull request, shown before and after on screen in three drawn places.

1. **The telling and said-as**, wired to every person, employer and office slot in every composer. The bank lines lose their typed titles in the same change, by script, by slot.
2. **Talk through the telling:** the room, the hour, what housemates know, what was said today, subject memory by week, answerable replies, closers by the clock.
3. **One outline planner for every speech,** with the theme, the kinds' rows and the asks by world. The three planners it replaces are deleted. The montage reads it.
4. **The join,** with every bank piece typed by script and by kind, bank by bank. This is where the roughly 7,600 stock lines are gone through: by part type and rule, never one at a time.
5. **Composed checks and the pre-grade walk,** with one check per rule above, counts that only fall.
6. **The Journal and the news through the same parts.**

Units 1, 2 and 5 start first, because they stop the most of what you saw and every later unit is checked by 5.

## What stays

Your grades and the pulled list still decide which lines may play. A line you graded good is never dropped: it is carried into the typed parts with its grade. Replies of one to three words and action names stay as they are (call 12).
