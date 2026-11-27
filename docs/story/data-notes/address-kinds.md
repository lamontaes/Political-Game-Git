# Notes that were in src/director/data/address-kinds.json

Moved out of the game's data on Nov 27, 2026 (CTO's story audit, row C9), word for word. The data keeps what the game reads.

## `about`

The kinds of address a speaker gives, and what picks one (owner, Nov 8: 'Sometimes, you could have a Jimmy Carter, a crisis of confidence kind of thing. Sometimes it could just be a hopeful speech, or it could be like Trump just railing on people... it needs to work off of effects or in-laws and people around them and their temperament and their personality'). A kind's score is what the world gives it to say (the read of the term by area, the economy's year, a recent disaster, the speaker's open priorities) times one plus the speaker's pull toward it (the mean of the facets listed, each between -1 and 1). The highest score is the address's kind; the facets are the personality catalog's. The kinds follow addresses real history shows: a candid reckoning in a bad year (crisis), a speaker who answers a hard year by naming who failed the country (combative), a lift in a fair year (hopeful), a lap after a good one (victory), words for the dead after a disaster (mourning) and the work of a policy push. It holds no sentence: the words are the opening-speech bank's, chosen by the kind. Each kind also says how many of the country's subjects its story tells beside work (`topics`): a candid reckoning or a railing tells the most, a mourning the fewest. A kind may also set a `tone` for the subjects its story tells: -1 leads with what went wrong and tells no good news beside it while there is bad news to tell, 1 leads with what went right; a kind without one follows the year's mood.

## `parameters.worstAreaShare.note`

How much the worst area's slide counts toward the year's need beside the mean of all areas: one collapsing area (schools, crime) makes a hard year even when the rest holds.

## `parameters.hopefulBase.note`

What a plain year gives a hopeful address before any good news; most real addresses in a fair year are hopeful in tone.

## `parameters.policyBase.note`

What a full set of priorities gives a policy address (every priority the speaker is allowed to lead with).

## `parameters.griefDays.note`

How many days after a disaster a speaker still opens with the dead; the weight falls in a straight line to nothing across it. Presidents' remarks after mass-casualty disasters run in the following days to weeks.

## `parameters.hopefulGoodShare.note`

What a fully good year gives a hopeful address; below a victory lap's score for most speakers, so a very good year is a lap and a fair one a lift.
