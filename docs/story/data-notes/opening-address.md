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

## `parameters.sameRunWords.note`

How many words in a row make two sentences of one address say the same thing, so the second is worded again (the words lead's third read, Nov 11: the Vice President praised twice in the same words). Three catches ordinary phrases such as "of the country"; five lets a repeated praise through.

## `parameters.asidesBase.note`

How many of the four asides an address of average talk says; real inaugurals run from about 700 words to over 2,000, and a short one leaves out the history and the closing hope before anything else the record supports.

## `parameters.asidesPerTalk.note`

How many more asides a President says for each unit of talk (the talk facets' sum, which runs about -2 to 2), rounded to whole parts and kept between none and all four.

## `parameters.namesSaid.note`

How many times an address says one of the world's names or subjects (the Vice President, the Speaker, the home state, the year's hardest and best subject) before it turns to the wordings that do without it; a name is said again only where no other wording can say the move. Real addresses name a home state or a running mate once or twice.

## `parameters.subjectsSaid.note`

How many times an address names one of the theme's subjects in the same words ("a stronger economy") before it turns to wordings that say it another way; the greeting and the close may name it once more (owner, Nov 12: "good news on a stronger economy ... feeling good about what's coming on a stronger economy ... report on a stronger economy").

## `parameters.redraws.note`

How many times a sentence naming the Vice President is drawn again when it would repeat four words of an earlier one (the words lead's third read, Nov 11: the Vice President praised twice in nearly the same words).

## `stories.runYears.note`

How many years back the economy's run is read: one presidential term, the span a President inherits or answers for.

## `stories.runLeast.note`

The fewest points (pay lost to prices plus unemployment gained, or the reverse) that make the run a story; under it the run is ordinary and not said.

## `stories.runScale.note`

The points a run is said to have gone sharply at; the thirds below are mild and steady. Checked against 2000 to 2024 four-year spans in the FRED months (CPIAUCSL, AHETPI, UNRATE), where the 2008 and 2021 spans run about five to seven points.

## `stories.ownShare.note`

The share of the run's days the speaker must have held office for the run to be their own record rather than one they inherited.

## `stories.disasterDays.note`

How long a disaster or a scandal stays the year's story, weighted down a straight line to nothing.

## `stories.disasterStatesMany.note`

How many states a year's disasters reached for a President to say they hit many places.

## `stories.rows.hard-run.weight.note`

Per point of the run; a hard run outweighs a year's disaster once it passes a point or two.

## `stories.rows.good-run.weight.note`

Per point; good news leads a little less readily than bad, as real addresses open on trouble before credit.

## `stories.rows.disaster.weight.note`

A disaster this week weighs four points of a run, falling to nothing over the disaster days.

## `stories.rows.scandal.weight.note`

A reported bribe in the speaker's own body weighs three points of a run.
