# The owner's real verdicts, by failure class

The plant bank for `pre-grade`. Every chunk gets one plant from each class below, plus at least two of his passes or okays. His words are verbatim and dated; a "Reading:" line is the CTO's reading, not his words. After each grading page, add every line the pre-grade got wrong to its class, the same day.

Sources: his Nov 24 grades of the Desk packet (lines numbered as in `docs/story/first-evening-pregrade-8.md` on branch `story/first-evening-pregrade`; his words are quoted here in full from his chat), his Nov 23 sitting (`docs/coordination/playtest/2026-11-23-1-verbatim.md` on branch `claude/cto-playtest-nov23`), and his Nov 12 life 1 note (`docs/grading/2026-11-12-life-1/owner-voice-note.md` on branch `grading/nov12-life-1`).

## Classes he fails

### 1. Talk that says the policy's name instead of reacting to it

- Nov 24, bad: "So the President wants a higher top income tax rate. I'm glad she said it out loud." His words: "No person would say that. They'd be like, finally, someone wants to tax the rich, or, you know, I can't believe he wants to tax people, or why is he going to tax people? It's just going to run people, all that kind of shit."
- Nov 23, on a person's card: "Again, random ass laws like ban the box public hiring. What does that mean?"
- Nov 12, on an address point: "why is it always stock trading? It's always stock trading."
- Rule: `bill-called-by-what-people-call-it`.

### 2. A quip or composed line where a plain one belongs

- Nov 24, bad: "By 2012 the state had you in a classroom in Meadow. That's how the state says hello." His words: "What the hell does that mean? That's how the state says hello? What the hell does that mean?"
- Nov 24, bad: "...Utah has its usual problems, and Meadow has saved you a seat." His words: "I don't understand that at all."
- Nov 12: on "I'm not going to forget about you": "what the hell does that mean?" On "beat the price tags": "What does that mean?"
- Rule: `no-literary-phrasing`.

### 3. Narration that repeats what the screen shows

- Nov 24, bad: "It's January 2025." His words: "Okay, again, shouldn't really say this because the date is in the bottom left."
- Oct 26: "it shouldn't say you're at home in Albion or it's Tuesday in November. Obviously, it says that in the bottom right."
- Pass pair: Nov 24, good: "It's the evening of January 20. The news replays President Simon's noon speech." (class "Passes" below).
- Rule: `no-day-or-place-in-narration` (its test catches only slots; a typed date slips through).

### 4. Replies that give one answer, and filler

- Nov 24, bad, as a set: the work small talk, 1.24 "Don't ask how work went today.", 1.25 "Just a day at work, that's all.", 1.26 "Work took everything I had today." and the answer 1.28 "Glad work went easy on you today." His words: "Don't ask me how work went today. Just a day at work. That's all. Work took. Those sound like shitty filler lines there. Glad work went easy on you. And again, all four of them are saying the same things. Oh my God."
- Nov 12: "Maya and Logan... basically saying the same thing."
- Nov 12, bad: "Oh, I see. I'll check on you again at the morning." His words: "the same bullshit I talked about yesterday with the just non-replies."
- Nov 12, bad: "What do you do?" His words: "a useless interaction. It just shouldn't even be there."
- Rules: `variants-differ-in-what-they-say`, `no-non-replies`, `no-filler`.

### 5. A reply that doesn't fit the line before

- Nov 24, bad: "I'd push back on her there." His words: "Again, I'd push back on her there. What?"
- Nov 24, okay: "Same here, Mom." His words: "I mean, I guess that works, but that context is weird."
- Nov 12, bad: "What would that mean for Wofford Heights?" His words: "how the hell would she know?"
- Nov 12, bad: "What should Washington do next?" His words: "Which Washington?... Why should she care?"
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

- Nov 24, bad: "You were born in 2007, and nobody asked you first." (and the same opener in every life). His words: "Why is this still coming up? This should not happen. You were born in 2000 again."
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
- Rules: `journal-entry-has-story-around-it`, `news-reads-as-a-story`.

### 11. Narration that contradicts the scene

- Nov 23, bad: "You hang your coat by the door." His words: "I thought I was sitting at the kitchen table."
- Nov 12: on "Whatever Joshua Fitzgerald says" beside the town name: "What the hell?"

## Passes and okays (plant at least two)

- Nov 24, good: "It's the evening of January 20. The news replays President Simon's noon speech." His words: "That's fine."
- Nov 24, okay: "God bless you." His words: "I mean, okay."
- Nov 24, okay with weird context: "Same here, Mom."
- Nov 12, fine: "No argument from me, Logan." His words: "a fine response."
- Nov 12, fine: "I'd say the same, Maya." His words: "fine."
- Nov 12, on the tariffs point: "the thing so far that makes the most sense."
