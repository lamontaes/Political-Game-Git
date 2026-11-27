# Notes that were in src/director/data/opening-address.json

Moved out of the game's data on Nov 27, 2026 (CTO's story audit, row C9), word for word. The data keeps what the game reads.

## `about`

How the speaker's own record shapes an address: the manner of speaking from their traits, the asides they say, how often a name or subject is said, and how far each measure moves in an ordinary year. The order of each kind of speech, its theme and its asks are the outline rows of speech-outlines.json (src/director/speech-outline.ts, owner, Nov 12: 'the problem is the engine'). It holds no sentence: the words are the opening-speech bank's.

## `mannerTraits.about`

The recorded traits that make a President's address plain-spoken or polished: the manner is whichever side the President's traits sum higher on, polished when they tie.

## `asides.about`

The parts an address may leave out, and the facets that pull a President to say each: the country's long story, the people met on the way, the call to the people, the closing hope. A talkative President says more of them (talk), a terse one fewer; those said are the ones the President's traits pull hardest, and the part the address leads with is always said.

## `talk.about`

How much a President says beyond what every address says: the sum of their values on the facets that run long, less the facets that keep it short.

## `changeScale.about`

How far each of the country's subjects moved over the year, in its own units, for the address to say it moved a little, steadily or sharply (owner, Nov 11: inserts from the world's records; Oct 27 and Nov 1: no figures, so the movement is said in words). A movement under a third of the scale is said as small, under two thirds as middling, and the rest as large. TUNABLE, checked against the macro engine's year-over-year changes since 2000 (FRED UNRATE, CPIAUCSL, AHETPI, GDPC1, PAYEMS, MORTGAGE30US), where a move of the scale is about the largest of an ordinary year.

## `stories.about`

The world's story an address opens on, before the speaker's own issues (Story thread #9750 part 4; owner, Nov 16: "a mix of hopefulness, maybe a little braggadocious, and sets expectations ... or maybe it's warning because ... the economy's been terrible ... or maybe corruption"). Read by src/director/address-story.ts: each row's `gate` is the facts its record must hold, `weight` multiplies the amount the record gives it (the economy's run in points, a disaster's recency, a scandal's count), and `sections` is the order the address says its sections in, by level, so a warning and a brag do not share a skeleton (owner, Nov 14: "they all follow the very same format"). The highest weight times amount wins, a tie by name; with none the address keeps its kind's own order. The words are the opening-speech bank's `story-open` and `story-turn` pieces whose topic is the row's name. No roll.
