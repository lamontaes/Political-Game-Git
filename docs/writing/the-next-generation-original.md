# The next generation: the first time anyone played the life after

Walked 2026-09-22, 17:26 to 18:20 UTC, in a real Chromium against build
`836c299` (the #393 branch with main merged in). The route is the one a player
takes: the creator's custom start, Reno, Nevada, age 34, "shares a home", the
personality questions skipped. Then four weeks of play, Options, "Retire from
play", the first name on the list, twelve weeks as that person, then save,
reload and Continue.

It was walked twice. The creator draws a different person each time, so the
names differ: Rachel Roth and Russell Ryan the first time, Fiona Santana and
Xavier Douglas the second. The shape was identical both times. The story below
is the first walk, finished with the second, because the first run's browser
stopped answering at week nine and the rerun went straight through in a
minute. That stall did not come back, so I am not reporting it as a defect.

## The life as lived

Rachel Roth wakes on January 5, 2026 in Reno. The room says "Dean Campos, who
you live with" is there. Her People screen lists four people. Dean is under
"Household". Heather Roth is "your dad". Russell Ryan and Vivian Oliver are
"somebody you know", and the screen notes she was last in touch with them in
2004 and 2002: "It has been a long while." One thing is on her mind: her dad
asked her to proofread a two-paragraph picnic invitation, and she hasn't
answered.

Four weeks pass. The news brings her fishing-rights talks, shipping delays,
and the City of Reno withdrawing its recycling drop-off proposal. Nothing
happens to Rachel herself.

On February 2 she opens Options and retires from play. The screen says: "You
stopped playing Rachel Roth on February 2, 2026. Rachel goes on living." Then
it offers her successors: forty names.

The first is Russell Ryan, "Rachel Roth's someone they taught, age 64". Next
is her dad, Heather Roth: "Rachel Roth's no connection on record, age 62".
Then Vivian Oliver. Then Dean Campos, the man she lives with: "no connection
on record". Thirty-six strangers follow, each labelled the same way.

The player picks Russell. He is 64, and his journal is short. He was born in
Reno on January 1, 1962. In 2003 he began working as a teacher at the local
middle school. In 2004, "A teacher offered concrete guidance." That was him,
mentoring Rachel when she was twelve. So Rachel never taught Russell; he
taught her. The list had it backwards.

As Russell, the People screen shows exactly one person: Rachel. There is
nobody under Home and family, nobody under Work, nobody in Politics. His Jobs
screen says "Your role: Teacher." and "Waiting on you: Grocery shopping".

Twelve weeks pass, and nobody new appears. The journal gains nothing from
those weeks. Its only 2026 entry is one that happened before he was played:
"You live in Reno, Nevada. Russell Ryan asked Rachel Roth to meet on
2026-01-21: Catch up, after a long while The posted agenda asks whether the
public meeting room should open for an extra evening each week." He is named
in the third person in his own journal, the date is printed raw, and two
sentences run together with no full stop. The news carries on: road repairs
withdrawn, fishing talks reopened.

Save, reload, Continue: the game opens as Russell (Xavier on the rerun) on the
same April morning. Nothing was lost, and no page errors occurred in either
walk.

## The third-person half

**Multi-generation works end to end.** Retire, choose, play, save and reload
all hold, and the successor's clock runs. What was missing was a walk of it,
not the feature.

**The list called family strangers, and that is fixed in
[#407](https://github.com/lamontaes/Political-Game-Git/pull/407).**
`successorCandidates` (`src/simulation/people-continuation.ts`) only ever read
children, grandchildren, siblings, partners, and "bonds" (two meaningful
interactions or one mentorship). It never looked at parents or the household,
so Rachel's father and housemate fell through to the catch-all, whose label
is "no connection on record". Both are now offered by name, above the wider
list, as "parent" and "someone they lived with".

**The teacher was the wrong way round, also fixed in #407.** Both mentorship
writers in `character-history.ts` store the person mentored first and the
mentor second. The list read every mentorship as if the finished life were
the teacher. It now says "someone who taught them".

**Why a stranger tops the list at all.** A 34-year-old generated at the start
has no children, no partner and no siblings on record. The one "bond" the
opening writes for her is the teacher-mentor record from when she was twelve,
so the only prominent choice was a 64-year-old she hadn't spoken to in 22
years. With #407 her father and housemate now sit alongside him. The deeper
problem is that a generated adult's family stops at one parent, which belongs
to people-and-life.

**What the successor inherits: almost nothing.** Russell knows one person.
The generated background gave him a job and a single mentorship, and nobody
else. This is the same thin-life shape the earlier town walks found, seen
from the other side: an NPC's recorded life is only as full as the records
written about them, and nothing writes a household, coworkers or family for a
bystander until someone plays them. Playing him does not populate it either.

**Nothing happened to him in twelve weeks.** The journal adds nothing between
February and late April. This matches the earlier finding that ordinary days
write little unless the player acts, and this walk pressed only the week
button.

**The journal line is a presentation defect, not fixed here.**
`src/simulation/people-contact.ts:374` writes the event summary as
`"<asker> asked <asked> to meet on <ISO date>: <purpose>"`. The comment a few
lines above it says simulation has no business speaking a date, which is
presentation's job. The journal prints that summary verbatim. From the
asker's own journal it reads in the third person, with a raw date and no full
stop. It is only visible after a hand-off, because only then is the asker the
one reading. Whoever owns the journal should render these rather than print
them.

**Things checked and not defects:** the save round-trip, the clock after the
hand-off, the absence of page errors, and the "Observing" path (already
covered by `ui46-life-continuation`, which passes 3 of 3 with #407 applied).

**Numbers.** 40 successors offered, the list's cap. 1 prominent before #407,
measured. #407 should make that 3 in the same world (father, housemate,
teacher); that is inferred from the code and its unit tests, not re-walked. The successor knew 1 person. 12
weeks were played as the successor, with 0 new journal entries.
