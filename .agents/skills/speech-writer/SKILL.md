---
name: speech-writer
description: >
  Writes speeches of every kind for the one speech planner (inaugurals and the
  State of the Union, State of the State, a mayor's address, stump speeches,
  floor speeches, victory and concession): shapes taken from real speeches,
  one theme, a plain stand, points that know what came before, no figures, and
  the owner's rejected shapes kept out. Use when writing or deleting greeting,
  charge, call, stand, creed, pledge, value or close lines. The shared loop is
  story-writer.
---

# Speech writer

The owner on speeches:

- Nov 23, 2026, on the inaugural: "Again, this is all following the same grammatical pattern as that I've been complaining about for a month now."
- Nov 23: "It. What is it?"
- Nov 23: "it just reads like a shitty simulated sentence, which it is. There's no flavor to it."
- Nov 12: "There's no theme for the speech. That's a problem."
- Nov 12: "We're not talking about any ideas that this person believes in."
- Nov 12, on the debt limit point: "Is he for it? Is he against it?"
- Oct 15, as recorded in `docs/coordination/OWNER-DECISIONS.md`: "A four-line rally is not a speech."

Read `story-writer` first. The planner is `src/director/speech-outline.ts` with `src/director/data/speech-outlines.json`, and the lane's moves and facts are in `docs/story/writer-spec.md` on branch `story/first-evening`.

## The rules that must hold

1. **Shape comes from real speeches of the same kind.** Before you write a move, count how real ones handle it: how a point opens, whether it ends in an ask, how one point leads into the next. Use the American Presidency Project (presidency.ucsb.edu) for inaugurals and the State of the Union, state archives for State of the State addresses, and city sites, papers and council video for mayors. Take shape and rhythm only.
2. **No point is forced into one frame.** On Nov 12 every point became context, stand, ask, built from one example he gave, and every speech had the same skeleton whatever its words. The planner offers many shapes, and the speaker's traits and the world pick among them. When a frame repeats in every speech, look in the planner before writing more lines.
3. **One theme, and ideas the speaker believes.** Every point belongs to the theme (`speech-has-one-theme`), and the speaker is plainly for or against (`stance-is-plainly-for-or-against`).
4. **Every line knows what came before.** A line that leans on the one before needs `after`. That includes any line that opens on It, That, This, These, So or And. A pronoun always has a thing to point to.
5. **A speech argues; it never narrates itself** (`address-argues-not-announces`). No "this report", no "Congress should hear that first", no "Congress is reading this report".
6. **No figures and no years** typed into a line (`no-figure-in-talk`, `no-year-in-speech`). A slot may carry a figure.
7. **The address is national** (`address-is-national-not-about-the-player`): it never names the player's state or town.
8. **The greeting names only people the scene shows** and the player can place. Nov 23, on "Speaker Stephen Morales, distinguished guests, and my fellow citizens": "Again, why are we just singling out random people?"
9. **A law in force is kept or undone, never "passed".** Gate on `law-in-force` and `law-not-in-force`.
10. **Each kind keeps its order** (`speech-follows-its-kinds-order`): short openers and closers around longer, meatier points (`speech-has-a-core`).

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

## Gotchas

- Nov 23: "Because I am convinced {belief}," came from the planner's belief join, not from one line. Fixing lines under a planner frame leaves the frame.
- Nov 24: `address-argues-not-announces` failed 18 of the national writer's State of the Union report lines, among them "Congress is reading this report in a country where pay has risen for {run-span}."
- Nov 24: the pre-grade named the tail "I'll keep asking for {term-left}" because it repeats across points. Say `{term-left}` and `{theme-short}` once per address.
- Nov 12: "the jobless rate went up some, plain and simple" read as "disjointed statements put together." Points join the way a speaker joins them, not as stacked facts.
