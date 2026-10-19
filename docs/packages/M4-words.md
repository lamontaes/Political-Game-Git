# M4-words: stories, conversations, scenes, the journal and speeches (golden path step 10)

**Specs:** M4-01 to M4-05. M4-06 is in `M2-elections.md`.
**Built by:** OPUS-PEOPLE (the story director and the English engine), with OPUS-PLAY (the conversation box, the journal, scenes) and OPUS-GOV (the civic moments engines produce).

**Systems model:** _The Political Process_ has almost no words. This is what we add: Suzerain's tension, The Sims' people and BitLife's optional depth. Every word comes from the engine, and every word is about something that really happened.

## What you'll do

**Moments find you.**

- The story director turns what happens (a campaign, a vote, a law, a lost job) into moments, sized by impact. Big ones stop your skip; smaller ones become journal lines.
- A big event, like a new law, gets a chapter for everyone, plus personal moments for the people it actually hit.
- People come back into your story: the friend you lied to finds out; the councilman you helped calls in the favor.
- Facts stay; closeness fades unless it's kept up. Lies, favors and promises never fade on their own.

**Conversations.**

- **Choices:** at least four, each naming something real and answering what the person just said. Leaving is the screen's button, not a choice.
- **The Lie control:** a small scales symbol in the box's upper right; the word "Lie" never appears. It dims when there's nothing false to say. When you lie, the scales tip and the line glows soft red, and the lie is recorded with who heard it, so it can come out later.
- **How people talk:** like real people in that setting. A council speaker greets the body and gives their neighborhood; a family kitchen talks in short overlapping turns; a press secretary dodges about one answer in four. Regional words only, swearing by personality, and nothing generated at runtime.

**Scenes.**

- Scenes happen at transitions when the simulation decides something matters: the clerk's office, the porch, the council meeting, election night.
- They're built from blocks (the place, the people actually there, what their records let them say), not written scenes. Narration is in second person.
- Scenes should feel cinematic. Your talk of "black bars" was a way to describe that feel, not a requirement for literal bars (Oct 12).

**Your journal, "My life".**

- A first-person story in chapters, not a dated list, with no year headers.
- It's selective, names people by relationship ("my brother"), summarizes repeats, and never invents a feeling.
- When you die, there's a look back.

**Speeches.**

- Give one anytime: you pick its parts and see the exact wording before you commit. No free typing.
- Each listener reacts by who they are, then retells it to family and friends.
- A great speech, or a gaffe, can be remembered for generations. Real historical speeches can be quoted, public-domain lines only.

**People bring it up.**

- People mention what changed and who they think did it, in their own words.
- They only know what they heard, so they can credit or blame the wrong person.

## What gets built

- **The story director on every engine.** It is already approved as built (#3926–#3930) and gets connected to campaigns, votes, laws and money.
- **The English engine on the new core.**
  - It composes from mined real speech, using the register cards in `docs/research/speech-and-dialogue-corpus-2026-09-28.md`.
  - The hand-written phrase banks are deleted as they're replaced.
  - Rules R1–R5 stay: a choice names a real subject; leaving is the screen's control; a choice answers the last line; lines are written for their screen; batches cover the whole game.
- **Lies:** the exact claim, who heard it, and its later discovery.
- **Scenes** from place, people and records. **The journal** as a story. **The death look-back.**
- **Speeches** as events, with reception, retelling, memory by age, and passing down through family.
- **Attribution** that follows what each person heard.
- **Grading:** you grade batches of 100 engine exchanges that pass the automatic rules. Each item is different, the batches cover every kind of text, and your grades feed the engine. **Grading never blocks a merge** (Oct 12); engine output merges like everything else.
- **The sources are already there.** Compose from the Congressional Record, hearings and briefings (public domain, so formulas can ship), the corpora in the speech research (patterns only), and the owner's weeks of messages and decisions. The engine refines; it never invents.

## How you'll know it works

In a random place, over a year:

- a big moment stops your skip and a small one becomes a journal line;
- a conversation offers four real choices and a lie you tell comes back later;
- the council meeting plays as a scene;
- your journal reads as a story about your year;
- a speech you give gets retold;
- someone brings up a law you passed, crediting or blaming the person they think did it;
- you've graded a batch.

## Your decisions it follows

**Story director (Oct 9):**

- "Impact, no list."
- Broad events: "Both."
- "Human moments; rules stay in engines."
- "Anyone being watched."
- "Impact decides" interrupts.
- Callbacks through "People and consequences."
- Backdrop chapters "In the journal, first person."
- Skipped time becomes journal lines.
- "Facts kept, closeness fades."
- Lies, favors and promises never fade.
- Director approved as built: "i approve both" (Oct 10).
- Formative scenes come from the world (Oct 8).
- Threads hidden except in dev mode (Oct 8).

**English engine:**

- No hand rewriting; "only refinement of the engine" (Oct 6).
- The plan: grades are data, you see only rule-passing lines, 100 per sitting, real speech mined (Oct 6).
- Grade everything (Oct 6).
- Every batch item completely different (Oct 8).
- Compose from real speech; delete hand-written banks (Oct 7).
- Four choices (Oct 8).
- R1–R5 (Oct 8).
- "There is no in-game AI at all."
- Regional words only; swearing by personality (Sept 28).

**The Lie control:**

- Scales in the upper right, no word "Lie," dims when nothing false can be said (Oct 2).
- "Scales tip, line glows soft red" (Oct 5).
- A lie binds the exact claim and can be discovered (Sept 22).

**Scenes and the journal:**

- Scenes at transitions, building blocks not specific scenes, "Her records decide," only workers in workplaces (Oct 5).
- "300 different places but thousands of different scenes" (Oct 6).
- Journal in first person, never inventing a feeling; chapters, not a dated list (Sept 22, Oct 1).
- Record and private notes removed (Oct 5).
- Death retrospective (Sept 28).

**Speeches:**

- "Speeches in EA, movements after" (Oct 10).
- Remembered for generations (D-3, Sept 28).
- Public-domain quotes (Sept 28).
- Views change through news, media and speeches (Oct 9).
- Structured choices with a wording preview, no free text (Sept 22).

**People bring it up:** people learn only through routes they could use; personality decides blame; no all-knowing attribution (Sept 22–26).

**Owner, Oct 12:**

- Bars: "I didn't literally mean bars… just… to conceptualize what I meant."
- Grades don't block merges.
- "you've got the entire Internet… every single congressional record… books of people talking normally."

**My call, not yours:** flashbacks and "meanwhile" scenes wait until you've played the director (Oct 9: "haven't even experienced the system").
