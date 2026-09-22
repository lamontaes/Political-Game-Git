# Nadia Luna, a decade

lamontae asked for the lives we run to come back as a story he can read the way
a player would, and then separately for the third-person knowledge a player
cannot have: why things happened, why they did not, what could have happened,
and the numbers.

This is one save. Seed `drift-A`, Kentucky, ordinary life, start age 40, run
ten years with nobody pressing anything. Everything in the first half is quoted
from the game's own journal — the text a player actually reads.

---

## Part one: the life, as the game tells it

**Nadia Luna was born on 28 February 1985, in Kentucky.**

> You were born on February 28, 1985.
> You were born in Kentucky.

She was five when a household move changed her routine. She was enrolled at an
elementary school at five and transferred out at seven. At ten, one thing
happened that the game remembers about her childhood:

> At lunch you made room at the table for another kid.

At twelve a teacher offered her concrete guidance. At fifteen she joined a
local volunteer effort. At sixteen she took a job as a store assistant at
Neighborhood Market, and at seventeen she prepared a next step — education,
training, work or service. At eighteen she finished high school, and the shop
job ended the same day.

**Then nothing, for twenty-three years.**

Her twenties and her thirties are not in her journal. Not a job, not a move,
not a friend, not a loss. The record resumes on 5 January 2026, the day the
player picks her up, with a single line:

> You live in Kentucky.

She is forty.

**What happens over the next ten years is that two people ask her to meetings.**

On 14 January 2026, Astrid Hanson invites her to the Kentucky Republicans open
meeting. Coming is optional. On 23 January, Zachary Randolph invites her to the
Kentucky Democrats open meeting. Coming is optional. On 24 February, Zachary
again. On 4 March, Astrid again.

They alternate through 2026 and into 2027. Then, on **22 June 2027, Zachary
Randolph invites her one last time and never writes again.** Nothing marks it.
He simply stops.

**Astrid Hanson keeps going for eight and a half more years.** September 2027.
January 2028. March, April, May, June, August, September, October, December.
Through 2029, 2030, 2031, 2032, 2033, 2034, and on to 4 December 2035, five
weeks before the decade closes:

> Astrid Hanson invited them to the Kentucky Republicans open meeting on
> 2035-12-11. Coming is optional.

Nadia never goes. Nothing in the world notices that she never goes. Astrid
never mentions it, never stops, never sends anybody else. At fifty, Nadia Luna
belongs to no political party, and nothing has ever asked her to.

That is the decade.

---

## Part two: the machinery, which the player cannot see

### The numbers

**122 historical records name Nadia Luna across her entire existence — birth to
age fifty. 115 of them are the same event: somebody inviting her to a party
meeting.** 95 from Astrid Hanson, 20 from Zachary Randolph.

The other seven, in full:

| when         | what                                                                            |
| ------------ | ------------------------------------------------------------------------------- |
| 1991, age 6  | A household move changed the child's local routine.                             |
| 1995, age 10 | At lunch you made room at the table for another kid.                            |
| 1997, age 12 | A teacher offered concrete guidance.                                            |
| 2000, age 15 | The teenager joined a local volunteer effort.                                   |
| 2001, age 16 | The teenager took a limited local job.                                          |
| 2002, age 17 | The teenager prepared a next education, training, work or service step.         |
| 2026, age 40 | Nadia Luna is 40, and lives in Kentucky. This is where their life is picked up. |

Invitations per year: 23, 14, 10, 10, 12, 10, 10, 8, 10, 8. Her journal grows
from 12 entries to 127 over the decade, and 115 of those 115 new entries are
one sentence with a different date on it.

### Why the twenty-three empty years

Her childhood is generated in detail because `character-history.ts` composes a
formative history for a new character: schools, a job, a teacher, a lunch
table. It stops at eighteen. The adult years before the save begins are
summarized rather than generated — this save used `summarize-earlier-life` —
and the summary produces no records. So the gap is not a bug in the life
generator; it is the boundary of what the generator was asked to cover. A
player who chose to play the formative years would see the first eighteen and
still have nothing between eighteen and forty.

### Why one man invited her a hundred times

The chapter invitation is a real producer running on a real schedule, and it is
doing exactly what it was built to do. What is missing is anything on the other
side of it. Nothing records that she declined, nothing counts declines, and no
rule anywhere says an organizer should give up, escalate, or hand her to
somebody else. The invitation is the whole of the relationship.

### Why Zachary Randolph stopped and Astrid Hanson did not

Unmeasured, and worth saying so rather than guessing. The plausible readings —
he died, he left the chapter, or the Democratic chapter's activity lapsed —
are distinguishable in the record and this run did not distinguish them. It is
the next thing to check.

### What could have happened, and did not

- **She could have joined a party.** Nothing in the game assigns a person an
  affiliation after the world is built. In the same save, 48% of everyone alive
  at year ten belonged to no party at all, up from 2% on day one, because every
  new arrival comes in unaffiliated and nothing ever changes that.
- **Something could have changed her mind.** The apparatus for what a person
  privately believes, says publicly, and has changed their mind about is fully
  built and connected at neither end. Nothing in the world moves a belief.
- **She could have been hurt.** Forty-two natural disasters occurred in this
  save over ten years, damaging fifteen homes. Nobody was injured once; a minor
  hazard carries a zero injury chance by construction. Illness does not exist
  outside disaster injury.
- **A scandal could have touched her.** Only if she had run for office and
  spent campaign money personally. No one else in the world can be the subject
  of one.

### The honest sentence

The world around Nadia Luna was busy. It ran 42 disasters and 124 repair
cycles, buried officeholders on a real actuarial table, founded a new political
party, and grew from 555 people to 1,053. Her own record of all of it is one
man asking her to a meeting, a hundred and fifteen times.

**The world diverges richly and nobody in it is changed by what happens.** This
is what that sentence looks like from inside a life.

---

## Method

`projectWorld39Journal(world, personId)` is the player-facing journal
projection, so the quoted lines are the game's words rather than a
reconstruction. The world was advanced with
`advanceWorld(world, 365, createCampaignElectionTransitionRegistry())` and
sampled at day one, year five and year ten; every event naming her was listed
at the end. No player action was taken at any point, which is the point: this
is what a life contains when nobody plays it.

One artifact to discount: her schools are named "Local Elementary School",
"Local Middle School" and "Local High School". That was fixed on `main` by
#378, which introduced `generateSchoolNames`; this branch predates it, so the
placeholder names are an artifact of the branch and not a live defect.
