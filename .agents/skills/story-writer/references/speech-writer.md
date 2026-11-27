# speech-writer

_This was the `speech-writer` skill until Nov 27, 2026; the `story-writer` skill holds it as a part (owner, Nov 26: "It's all just going to be called story now"). What it covered: Writes speeches of every kind for the one speech planner (inaugurals and the State of the Union, State of the State, a mayor's address, stump speeches, floor speeches, victory and concession): shapes taken from real speeches, one theme, a plain stand, points that know what came before, no figures, and the owner's rejected shapes kept out. Use when writing or deleting greeting, charge, call, stand, creed, pledge, value or close lines. The shared loop is story-writer._

# Speech writer

The owner on speeches:

- Nov 23, 2026, on the inaugural: "Again, this is all following the same grammatical pattern as that I've been complaining about for a month now."
- Nov 23: "It. What is it?"
- Nov 23: "it just reads like a shitty simulated sentence, which it is. There's no flavor to it."
- Nov 12: "There's no theme for the speech. That's a problem."
- Nov 12: "We're not talking about any ideas that this person believes in."
- Nov 12, on the debt limit point: "Is he for it? Is he against it?"
- Oct 15, as recorded in `docs/coordination/OWNER-DECISIONS.md`: "A four-line rally is not a speech."
- Nov 24, grading page 1: "Wait, so you just went from the Constitution to... healthcare."
- Nov 24: "There's no build up or working of points."
- Nov 24: "you can find speech writers talking about how they write speeches ... There has to be something on GitHub that helps you with this."

Read `story-writer` first, and your area's part of its `speech-writer/his-words.md`: what he already said, so you don't start from scratch. The planner is `src/director/speech-outline.ts` with `src/director/data/speech-outlines.json`, and the lane's moves and facts are in `docs/story/writer-spec.md` on branch `story/first-evening`.

## The rules that must hold

1. **The address builds; it doesn't stack.** His own version, Nov 24, as a concept: the oath ("you've just watched me swear on the Constitution"), then the problem told through people's lives ("families ... rationing their insulin"), then the stand with its plain reason, then the other side named and answered, then the long view ("not a battle won in a day"), then one concrete next step, then the close.
2. **A bridge before every new subject.** Never jump from one subject to the next. A disaster is named with its places and joined to the speech's theme and the federal response ("we are currently in contact with the governors of both states").
3. **The close ends the way presidents end.** The blessing is the last line ("God bless America"). Nothing comes after it.
4. **Shape comes from real speeches of the same kind.** Before you write a move, count how real ones handle it: how a point opens, whether it ends in an ask, how one point leads into the next. Use the American Presidency Project (presidency.ucsb.edu) for inaugurals and the State of the Union, state archives for State of the State addresses, and city sites, papers and council video for mayors. Take shape and rhythm only. Read speechwriters' own accounts of how they build a speech, and look on GitHub for speech corpora and tools (owner, Nov 24). Post what you found, with links, before rebuilding the outline.
5. **No point is forced into one frame.** On Nov 12 every point became context, stand, ask, built from one example he gave, and every speech had the same skeleton whatever its words. The planner offers many shapes, and the speaker's traits and the world pick among them. When a frame repeats in every speech, look in the planner before writing more lines.
6. **One theme, and ideas the speaker believes.** Every point belongs to the theme (`speech-has-one-theme`), and the speaker is plainly for or against (`stance-is-plainly-for-or-against`).
7. **Every line knows what came before.** A line that leans on the one before needs `after`. That includes any line that opens on It, That, This, These, So or And. A pronoun always has a thing to point to.
8. **A speech argues; it never narrates itself** (`address-argues-not-announces`). No "this report", no "Congress should hear that first", no "Congress is reading this report".
9. **No figures and no years** typed into a line (`no-figure-in-talk`, `no-year-in-speech`). A slot may carry a figure.
10. **The address is national** (`address-is-national-not-about-the-player`): it never names the player's state or town.
11. **The greeting names only people the scene shows** and the player can place. Nov 23, on "Speaker Stephen Morales, distinguished guests, and my fellow citizens": "Again, why are we just singling out random people?"
12. **A law in force is kept or undone, never "passed".** Gate on `law-in-force` and `law-not-in-force`.
13. **Each kind keeps its order** (`speech-follows-its-kinds-order`): short openers and closers around longer, meatier points (`speech-has-a-core`).

## Shapes he rejected (they stay out)

- "Hold me to it."
- "Call your member of Congress..."
- "Today the work starts..."
- "...and I mean to keep it that way."
- Any paycheck-against-prices line ("paychecks have grown faster than prices").
- A belief, then the ask: "Because I am convinced..., I ask Congress to..." or "So I'm going to ask Congress to..."
- "Come to do this work with our eyes open."
- "I'm not going to forget about you."
- "Good afternoon, everybody." and "We got there together."
- The same subject in every speech (Nov 12: "why is it always stock trading?").
- "…and for four years, that comes before everything else on my list." (Nov 24)
- "I land on no, since the next cure comes from companies that can afford to look for it." (Nov 24: "a ton of slop")
- "Of everything on my list, … is where I expect to be tested first." (Nov 24)
- "take a minute to learn what the other side is afraid of" (Nov 24)
- "my first step is a meeting, not a speech, and it's tomorrow" after "God bless us" (Nov 24)

## Gotchas

- Nov 23: "Because I am convinced {belief}," came from the planner's belief join, not from one line. Fixing lines under a planner frame leaves the frame.
- Nov 24: `address-argues-not-announces` failed 18 of the national writer's State of the Union report lines, among them "Congress is reading this report in a country where pay has risen for {run-span}."
- Nov 24: the pre-grade named the tail "I'll keep asking for {term-left}" because it repeats across points. Say `{term-left}` and `{theme-short}` once per address.
- Nov 12: "the jobless rate went up some, plain and simple" read as "disjointed statements put together." Points join the way a speaker joins them, not as stacked facts.
