# The owner's real verdicts, by failure class

The plant bank for `pre-grade`. **Only the Pre-grader reads this file. Never give it, or any line in it, to a blind reader.**

- Every chunk gets one plant from each class below, plus at least two of his passes or okays.
- **A plant is the whole stretch:** the line before it, the reply set with the answer, or the same slot in three lives, exactly as it played. A bare line can't be judged against a set or a context.
- His words are verbatim and dated. A "Reading:" line is the CTO's reading, not his words.
- After each grading page he answers, add every line the pre-grade got wrong to its class the same day, with its stretch.

**Sources:**
- His Nov 24 grades of the Desk packet, quoted here in full from his chat. The lines are numbered and played as in `docs/story/first-evening-pregrade-8.md` on branch `story/first-evening-pregrade` (merged head a880050828).
- His Nov 23 sitting: `docs/coordination/playtest/2026-11-23-1-verbatim.md` on branch `claude/cto-playtest-nov23`.
- His Nov 12 life 1 note: `docs/grading/2026-11-12-life-1/owner-voice-note.md`, played in `lines.md`, both on branch `grading/nov12-life-1`.

## Classes he fails

### 1. Talk that says the policy's name instead of reacting to it

- Nov 24, bad (Meadow, Utah, aecea4). The stretch:
  - 1.14, narration: "It's the evening of January 20. The news replays President Simon's noon speech."
  - 1.16, the mother says: "So the President wants a higher top income tax rate. I'm glad she said it out loud."
  - His words: "No person would say that. They'd be like, finally, someone wants to tax the rich, or, you know, I can't believe he wants to tax people, or why is he going to tax people? It's just going to run people, all that kind of shit."
- Nov 23, on a person's card: "Again, random ass laws like ban the box public hiring. What does that mean?"
- Nov 12, on an address point: "why is it always stock trading? It's always stock trading."
- Nov 24, page 1, bad. The stretch: Parker Potts, at home after the address, says "We ought to let Medicare negotiate drug prices, whatever the President says." His words: "Whatever the president says, that's weird ... If you're a kid and you're with your parents or your family, it would sound more natural for your parents to be talking like, do you hear that clown?"
- Rule: `bill-called-by-what-people-call-it`.

### 2. A quip or composed line where a plain one belongs

- Nov 24, bad: 1.5, "By 2012 the state had you in a classroom in Meadow. That's how the state says hello." His words: "What the hell does that mean? That's how the state says hello? What the hell does that mean?"
- Nov 24, bad: 1.7, "It's January 2025. Washington has a new President, Utah has its usual problems, and Meadow has saved you a seat." His words: "I don't understand that at all."
- Nov 12: on "I'm not going to forget about you": "what the hell does that mean?" On "beat the price tags": "What does that mean?"
- Nov 24, page 1, bad: "Fellow citizens. I swore to protect the Constitution, and for four years, that comes before everything else on my list." His words: "That doesn't make sense ... that's a weird thing to say."
- Nov 24, page 1, bad: "I've thought about Medicare negotiating drug prices, and I land on no, since the next cure comes from companies that can afford to look for it." His words: "that is a ton of slop."
- Nov 24, page 1, bad: "Whatever you think about whether to let Medicare negotiate drug prices, take a minute to learn what the other side is afraid of." His words: "I don't even understand what he's trying to say for that."
- Rule: `no-literary-phrasing`.

### 3. Narration that repeats what the screen shows

- Nov 24, bad: the opening of 1.7, "It's January 2025." His words: "Okay, again, shouldn't really say this because the date is in the bottom left."
- Oct 26: "it shouldn't say you're at home in Albion or it's Tuesday in November. Obviously, it says that in the bottom right."
- Pass pair: Nov 24, good, 1.14: "It's the evening of January 20. The news replays President Simon's noon speech."
- Nov 24, page 1, bad: "Late in the morning on January 21st, you knock, and Frederick Stein opens the door." His words: "no ... you already know what day and time it is. Like, it says it on your thing." What he wants instead: where you are in the canvassing session and what you see ("after 2 hours, you come across a man mowing his lawn").
- Rule: `no-day-or-place-in-narration`. Its test catches only slots, so a typed date slips through.

### 4. Replies that give one answer, and filler

- Nov 24, bad, as a set (Meadow, Utah, aecea4). The stretch:
  - 1.22, the mother says: "Did Rosales Family Clinic keep you late today?"
  - Replies: 1.23 "It was a smooth one at work today." / 1.24 "Don't ask how work went today." / 1.25 "Just a day at work, that's all." / 1.26 "Work took everything I had today."
  - 1.28, the answer: "Glad work went easy on you today."
  - His words: "Don't ask me how work went today. Just a day at work. That's all. Work took. Those sound like shitty filler lines there. Glad work went easy on you. And again, all four of them are saying the same things. Oh my God."
- Nov 12, bad (life 1). The stretch:
  - Maya Williamson: "I'm at Sullivan's Market. What about you?" / "Not right now."
  - Replies: "Oh, I see." / "Alright." The player took "Oh, I see."
  - Maya: "I'll check on you again this morning."
  - His words: "the same bullshit I talked about yesterday with the just non-replies."
- Nov 12, on the question "What do you do?": "a useless interaction. It just shouldn't even be there."
- Nov 12, on two housemates: "Maya and Logan... basically saying the same thing."
- Nov 24, page 1, bad, as a set: the interview call. A reporter asks for an interview, and the replies offered are "Which questions?" / "I'll do it." / "Please, no." / "I need time.", then "Yes, I'll sit." / "Not for me." / "Sorry, busy now." His words: "Yeah, sorry, busy now. Please, no. I need time. Oh, my God. See, now we're back to these shitty line questions. We've completely reverted again."
- Rules: `variants-differ-in-what-they-say`, `no-non-replies`, `no-filler`.

### 5. A reply that doesn't fit the line before

- Nov 24 (Meadow, Utah, aecea4). The stretch:
  - 1.16, the mother says: "So the President wants a higher top income tax rate. I'm glad she said it out loud."
  - 1.17, reply 1: "Same here, Mom." His words, okay: "I mean, I guess that works, but that context is weird."
  - 1.18, reply 2: "I'd push back on her there." His words, bad: "Again, I'd push back on her there. What?"
  - 1.20, the answer: "Now if Congress sees it that way, we're fine."
- Nov 12 (life 1). The stretch:
  - Logan Harper: "What the President said about pay getting ahead of prices caught my ear. That's not what I see, whatever Joshua Fitzgerald says. Rent in Wofford Heights takes too big a bite."
  - Replies: "No argument from me, Logan." (his words: "a fine response") / "I'm with Joshua Fitzgerald on this one." / "What would that mean for Wofford Heights?" (his words: "how the hell would she know?") / "What should Washington do next about pay getting ahead of prices?" (his words: "Which Washington?... Why should she care?")
- Nov 24, page 1. The stretch: Parker Potts: "We ought to let Medicare negotiate drug prices, whatever the President says." Samantha (the player): "I don't know. I'm with him on this one." (his words: "I don't mind that reply") Parker: "You'll come around, Samantha. Or I will." (his words, bad: "That doesn't make any sense.")
- Rules: `reply-follows-the-line-before`, `no-reply-asks-what-the-listener-cannot-know`.

### 6. One skeleton under every point

- Nov 23, bad: "Because I am convinced nobody should be charged a crushing rate on a loan, I ask Congress to cap the interest on consumer loans this year." His words: "This one's coherent, but it just reads like a shitty simulated sentence, which it is. There's no flavor to it."
- Nov 23, bad: "For 4 years, paychecks have grown faster than prices, and I mean to keep it that way." His words: "Again, this is all following the same grammatical pattern as that I've been complaining about for a month now."
- Nov 23, bad: "You know what I'm asking for on a cap on consumer loan interest, so hold me to it." His words: "Okay, well, here we go again."
- Nov 12: "disjointed statements put together. There needs to be a way for you to still have stuff be put together by the engine, but read more smoothly."
- Rules: `vary-the-shape`, `speech-is-not-a-list`, `address-argues-not-announces`.

### 7. A word that points at nothing, or no context

- Nov 23, bad: "With 4 years ahead, the job is to make it last and to reach people it has not reached yet." His words: "It. What is it?"
- Nov 23, bad: "Come to do this work with our eyes open." His words: "That makes no sense."
- Nov 12, bad: "That oath is a beginning." His words: "What oath? And what do you mean a beginning?" On "even on inflation": "I, as the player, have no context for that."
- Rules: `no-pointing-at-the-unnamed`, `every-line-gives-its-context`.

### 8. The same line in every life

- Nov 24, bad, as a slot across lives (round 8). The stretch:
  - Meadow, Utah, 1.3: "You were born in 2006, and nobody asked you first."
  - Chipley, Florida, 2.3: "You were born in 2007, and nobody asked you first."
  - Roberts, Idaho, 5.3, and Oakton, Virginia, 6.3: the same line.
  - The same slot 1.5 in four of six lives: "By 2012 (or 2017) the state had you in a classroom in [town]. That's how the state says hello."
  - His words: "Why is this still coming up? This should not happen. You were born in 2000 again."
- Nov 24, page 1, bad. The stretch at a door: Frederick Stein: "I haven't been well. I can't think about the race for the Greeley City Council right now." The player: "How are you feeling? The race for the Greeley City Council can wait." Frederick: "I haven't been well. It's hard to think about the race for the Greeley City Council." His words: "That's a weird-ass response ... And then he just repeats the same thing."
- Rules: `vary-the-shape`, `many-versions-of-each-scene`.

### 9. People the player can't place

- Nov 23, on the address greeting ("Speaker Stephen Morales, distinguished guests, and my fellow citizens"): "Again, why are we just singling out random people?"
- Nov 12, bad: "Kathryn Hansen will work with me." His words: "who's Kathryn Hansen?"
- Nov 12: "saying the full name every time. There needs to be pronouns and titles."
- Rules: `introduced-before-addressed`, `person-said-by-role-pronoun-or-relationship`.

### 10. A list of facts where a story belongs

- Nov 23, the Journal: "The journal is still a list of facts. None of my feedback is being taken."
- Nov 23, the news: "And look at these news stories. These aren't stories."
- Nov 23, the loading screen: "The, countdown or whatever is still just a list of facts. It's still not written as a story."
- Plant the played Journal week, news story or loading steps whole. Reading: round 8's Journal opening (1.30 to 1.32, "Meadow, Utah is where I was born. My mother Cora and my father Sean raised me. At 5 years old, I began school at Meadow Public Schools.") is this class, but he didn't grade it on Nov 24.
- Rules: `journal-entry-has-story-around-it`, `news-reads-as-a-story`.

### 11. Narration that contradicts the scene

- Nov 23, bad: "You hang your coat by the door." His words: "I thought I was sitting at the kitchen table."
- Nov 12: on "whatever Joshua Fitzgerald says" beside the town name: "What the hell?"

### 12. A jump with no bridge

- Nov 24, page 1, bad. The stretch: "I swore to protect the Constitution, and for four years, that comes before everything else on my list. Let me get right to what health care costs." His words: "Wait, so you just went from the Constitution to... healthcare. You just said how important the Constitution was and then immediately pivoted to healthcare."
- Nov 24, page 1, bad: "Some of the damage from the storms will take a long time to repair." It comes right after the health care point. His words: "Like, there's zero context there. You just jump from healthcare."
- Nov 24, page 1, bad: "God bless us. On whether to let Medicare negotiate drug prices, my first step is a meeting, not a speech, and it's tomorrow." His words: the close should end like real presidents end ("You can see how presidents end it").
- Nov 24: "There's no build up or working of points."
- Rules: `speech-has-a-core`, `speech-follows-its-kinds-order`.

### 13. Developer talk in the loading steps

- Nov 24, page 1, bad: "Wiring Greeley to the rest of Colorado, so one thing can affect another." His words: "What the hell does that mean?"
- Nov 24, page 1, bad: "Seating the lawmakers of Colorado. Everyone has a desk and a view on the desk." His words: "that's dev talk leaking out."
- Nov 24, page 1, bad: "Letting the country, the state and the town run two months on their own before your first evening." and "Greeley is running without you, and it will remind you of that." His words: "that's dev talk. These need to be short."
- What he wants: short, dry, sarcastic steps about what the game builds ("handing out government contracts", "printing money, printing more money, printing even more money").

## Passes and okays (plant at least two)

- Nov 24, good, 1.14: "It's the evening of January 20. The news replays President Simon's noon speech." His words: "That's fine."
- Nov 24, okay, 1.13, the address's last line: "God bless you." His words: "I mean, okay."
- Nov 24, okay with weird context, 1.17: "Same here, Mom." (plant it with its stretch, class 5).
- Nov 12, fine: "No argument from me, Logan." His words: "a fine response."
- Nov 12, fine: "I'd say the same, Maya." His words: "fine."
- Nov 12, on the tariffs point: "the thing so far that makes the most sense."
- Nov 24, page 1, pass: the player's reply "I don't know. I'm with him on this one." His words: "I don't mind that reply."
- Nov 24, page 1, pass: the loading step "Appointing the cabinet". His words: "I do like appointing the cabinet."
