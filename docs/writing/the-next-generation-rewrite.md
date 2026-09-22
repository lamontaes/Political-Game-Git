# The next generation inherits almost nothing

Handing the game to a new character works: you retire, pick someone, play them,
save and come back, and nothing breaks. But the person you inherit has almost
no life. Rachel Roth handed over to Russell Ryan, who knows one human being,
and twelve weeks of playing him added nobody and nothing to his journal. The
list of successors also called her father and her housemate strangers and got
her old teacher backwards; that is fixed and waiting to merge. Nothing needs a
decision from you. The thin inherited life belongs to the people-and-life work.

## The life as lived

The player makes a custom start in Reno, Nevada: age 34, "shares a home", and
the personality questions skipped. The game draws Rachel Roth. She wakes up on
January 5, 2026, and the room tells her that "Dean Campos, who you live with"
is there.

Her People screen lists four people. Dean is under Household. Heather Roth is
"your dad". Russell Ryan and Vivian Oliver are "somebody you know", and the
screen adds that she last spoke to them in 2004 and 2002: "It has been a long
while." One thing is on her mind. Her dad asked her to proofread a
two-paragraph invitation to a picnic, and she hasn't answered him.

Four weeks go by. The news covers fishing-rights talks, shipping delays, and
the City of Reno dropping its plan for a recycling drop-off. Nothing happens
to Rachel herself.

On February 2 she opens Options and chooses "Retire from play". The screen
says: "You stopped playing Rachel Roth on February 2, 2026. Rachel goes on
living." Then it offers forty people to carry on as.

The first is Russell Ryan: "Rachel Roth's someone they taught, age 64". The
second is her dad: "Rachel Roth's no connection on record, age 62". Then
Vivian Oliver. Then Dean, the man she lives with, also "no connection on
record". Thirty-six strangers follow, each with the same label.

The player picks Russell. His journal is short. He was born in Reno on
January 1, 1962. In 2003 he started teaching at the local middle school. In
2004, "A teacher offered concrete guidance." That was Russell mentoring
Rachel, who was twelve. So Rachel never taught Russell. He taught her, and
the list had it backwards.

As Russell, the People screen shows one person: Rachel. Nobody is under Home
and family, Work, or Politics. His Jobs screen says "Your role: Teacher." and
"Waiting on you: Grocery shopping".

Twelve weeks pass and nobody new appears. His journal gains nothing. Its only
entry for 2026 is one written before anyone played him:

> You live in Reno, Nevada. Russell Ryan asked Rachel Roth to meet on
> 2026-01-21: Catch up, after a long while The posted agenda asks whether the
> public meeting room should open for an extra evening each week.

It is his own journal, and it talks about him in the third person, prints the
date as a computer stores it, and runs two sentences together.

He saves, quits, and continues. The game opens as Russell on the same April
morning, with everything where he left it.

## Why it went that way

**Handing over works.** Retiring, choosing, playing, saving and reloading all
held, and the new character's clock runs. Measured on this walk and a second
one, which drew different people (Fiona Santana handing over to Xavier
Douglas) and went the same way.

**The list only knew about some relatives.** The code that builds it
(`successorCandidates` in `src/simulation/people-continuation.ts`) looks for
children, grandchildren, siblings, partners, and close bonds: two meaningful
conversations, or one mentorship. It never looks at parents or the people you
live with. So Rachel's father and Dean fell through to the catch-all label,
"no connection on record". Measured. Pull request
[#407](https://github.com/lamontaes/Political-Game-Git/pull/407) offers both
by name, as "parent" and "someone they lived with", above the wider list. It
has not merged yet.

**The teacher was backwards.** Both places that write a mentorship
(`src/simulation/character-history.ts:2688` and `:2867` on main today) record
the student first and the teacher second. The list read every mentorship as though the retiring
character were the teacher. #407 makes it say "someone who taught them".
Measured in the code and its tests.

**Why a stranger topped the list.** A 34-year-old made at the start of the
game has no children, partner or siblings on record. The only bond the
opening writes for her is that mentorship from when she was twelve. So the
most prominent choice was a 64-year-old she had not spoken to in 22 years.
Her family stops at one parent, which is the deeper gap. Measured for Rachel
on her People screen. Whether every generated adult looks like this was not
checked.

**Why Russell inherits nobody.** A person the game makes in the background
gets a job and whatever records other people's lives write about them, and
nothing else. Nobody writes Russell a household, coworkers or family, and
playing him does not start to. Measured for Russell: his People screen showed
one person for all twelve weeks. That the cause is general is inferred. The
Lives lived report of September 22 (`playtest/lives-lived-2026-09-22.md` in
the project files) found the same thing from the other side: two election
opponents with "names and vote shares and nothing else".

**Why twelve weeks added nothing is not established.** This walk only
pressed the button that ends the week, and 0 entries appeared. It did not try
other actions, so it cannot say whether any of them would have written
something.

**The journal line is a writing defect, and it is not fixed.** The meeting
request is written as one fixed sentence with the date in storage format
(`src/simulation/people-contact.ts:393` on main today), and the journal prints it as it is.
The comment above that line says the simulation should not be the one
speaking dates. You only see it after a hand-off, because only then is the
person who asked the one reading. Measured on screen and in the code.

**Also on screen, not investigated:** Rachel's dad is named Heather. That may
be a generated name that does not fit the person, which the names work
covers. This walk did not check it.

**Also on screen, not investigated:** Russell's journal says he asked Rachel
to meet on January 21, which falls inside the four weeks she was played. Her
walk recorded no such request. Whether her screens showed it was not checked.

**The numbers.**

- 40 people were offered as successors, which is the list's limit.
- Before #407, 1 of the 40 (Russell) carried a label naming a connection to
  her. Measured. The walk did not write down Vivian Oliver's label.
- With #407, it should be 3 (father, housemate, teacher). Inferred from the
  code and its tests, not walked again.
- Russell knew 1 person.
- 12 weeks played as Russell produced 0 new journal entries.

## What happens next

- The successor list: fixed in #407, waiting to merge.
- The thin inherited life and the one-parent family: people-and-life.
- The journal sentence: whoever owns the journal, to render it properly.
- The name that may not fit: the names work.

Method: walked on September 22, 2026, in the game's real screens on the
build of the #393 branch with main merged in, commit `836c299`. The first
walk stalled at week nine and was run again; the stall did not come back. Code
locations were reread on main at `5de147c5` when this report was rewritten.
