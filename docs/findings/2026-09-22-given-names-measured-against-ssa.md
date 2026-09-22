# What SSA's own data says about the game's given names

Measured 2026-09-22 ~16:56Z on `claude/project-thread-k8w14s`. Bounded research
authorized by lamontae at 16:47:59Z: "you are allowed to do some bounded
research for that name stuff."

The evidence file is `docs/research/evidence/ssa-given-names-by-decade.json`:
the Top 100 male and Top 100 female given names with SSA's own counts, for
every decade from the 1920s to the 2020s. 2,200 rows, eleven decades, no decade
missing, every rank contiguous 1..100. Fetched from
`https://www.ssa.gov/oact/babynames/decades/` — public-domain US government
data, transcribed rather than computed.

One transcription caveat to spot-check before any weighting is derived from it:
in the 1920s female list, rank 52 (Beatrice) and rank 53 (Esther) both carry
the count 49230. That is what the page returned. It may be SSA's own or an
extraction slip; it was recorded as received rather than quietly corrected.

## The corpus is not era-neutral, and here is the size of it

`GIVEN_NAME_GENERATION_POOLS_V1` in `src/simulation/names-data.ts` holds 346
given names. Every generated person draws from all 346 regardless of birth
year. Comparing that list against each decade's top 200 names:

| Birth decade | Corpus covers | Share |
| ------------ | ------------- | ----- |
| 1920s        | 59 of 200     | 30%   |
| 1930s        | 53 of 200     | 26%   |
| 1940s        | 57 of 200     | 28%   |
| 1950s        | 62 of 200     | 31%   |
| 1960s        | 71 of 200     | 36%   |
| 1970s        | 96 of 200     | 48%   |
| 1980s        | 116 of 200    | 58%   |
| 1990s        | 134 of 200    | 67%   |
| 2000s        | 131 of 200    | 66%   |
| 2010s        | 122 of 200    | 61%   |
| 2020s        | 114 of 200    | 57%   |

The curve is monotonic from the 1930s to the 1990s and then flattens. A person
born in the 1930s can be given roughly a quarter of the names their cohort
actually carried; a person born in the 1990s, two thirds. **The corpus is a
1990s name list**, and every older person in the world is drawing from it.

240 of the top-100 names of the 1920s through the 1950s are absent from the
corpus entirely — Agnes, Albert, Alfred, Bernice, Bertha, Bessie, Betty,
Beverly, Bonnie, Calvin, Carl and 229 others. So the pool cannot produce an era
it does not contain, and no weighting rule fixes that on its own: the list has
to be widened as well as keyed.

## Names that cross gender, and what the data can and cannot settle

A name appearing in both the male and the female top 100 **of the same decade**
is direct evidence of crossing. Across all eleven decades there are five, and
each is tied to its era rather than permanent:

- **Willie** — 1920s
- **Terry** — 1950s
- **Jamie** — 1970s
- **Jordan** — 1990s and 2000s
- **Taylor** — 1990s

That is a real finding on its own: a shared name is a feature of a generation,
not a standing property of the name. `GIVEN_NAME_GENERATION_POOLS_V1` carries a
36-name neutral pool sorted by hand, with no era attached to any of it, and its
own comment at `names-data.ts:1158` says it is "an authored partition, not a
field lifted from the source".

**What this does NOT settle, and must not be read as settling it:** the rate.
Two top-100 appearances tell you a name was carried by both sexes in a decade;
they do not tell you what share of people named Jordan were girls. That needs
SSA's per-name-per-year count files, and those are in `names.zip`, which this
environment's network policy refuses at CONNECT (403 to `www.ssa.gov:443`).
The published decade pages come through WebFetch; the dataset download does
not. So the rate question stays open and stays with the director.

## What is settled and what is still a decision

Settled by this measurement: that the defect is real, its size per decade, and
which names are missing. Facts about which names were common when are ours to
fetch.

Still the director's, and deliberately not answered here: how strictly the pool
should track the era, whether regional and ethnic distribution should bear on
the draw at all, and the crossing rate. Those are judgments about how the
world should feel, not facts about American names.

The two open records are `given-name-fashion-by-birth-year` and
`cross-gender-given-name-rate`, both owned by the people-and-life names lane.
This file is evidence handed to them; the fix is theirs.
