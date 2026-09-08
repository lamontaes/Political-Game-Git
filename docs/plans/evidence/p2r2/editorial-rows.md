# P2R2 — the 133 P2R1 rows, read again

Thirty-six of the 133 are the callback surface and are recorded row by row in
[callback-surface.md](callback-surface.md). The remaining 97 are below: 30
changed, 67 kept. Every one was read against its own neighbours — the scene
line above it, the sibling options beside it, the memory and the witnessed line
of the same choice — rather than sampled.

P2A2's finding about the rationales was correct and is the reason this file
exists: all 133 of P2R1's editorial notes were byte-identical. A rationale that
is the same sentence 133 times is not a judgement, it is a stamp. There is no
shared sentence below.

## The systematic failures found in the 97

Two frames, measured across the set before anything was touched:

- **`You chose to …` — 15 rows**, plus `You chose not to …` twice and
  `You decided to …` twice. The memory surface records what a person did. The
  choosing is implied by the surface itself; spelling it out puts a system word
  in front of every sentence and makes nineteen unrelated decisions read as one
  menu.
- **Abstractions the owner already flagged.** `the care` (three rows), `the
requested favour` and `the requested extra hours` (system phrasing for things
  a person asked for in words), `the personal matter`, and `You prioritized …`
  which asserts an outcome the option does not write.

## The 30 changed

| Row                                                | Was                                                                                                    | Now                                                                                       | Reason                                                                                                                                                                                                                                                                                                          |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `care-request` `name-the-limit:description`        | Offer to help with the care and say how much you can manage.                                           | Offer to take a share of the looking-after, and say how much you can manage.              | The owner's care-limit control. The scene's own premise is "somebody in the family is going to need regular looking after"; this uses that, so what is being limited is a share of a real task rather than a noun.                                                                                              |
| `care-request` `name-the-limit:memory`             | You offered to help with the care and said how much you could manage.                                  | You offered to take a share of looking after your relative, and said how much.            | Same control, and it now carries the recipient. The trailing "how much you could manage" was cut to "how much" because the sentence had already said what was offered.                                                                                                                                          |
| `care-request` `wait:memory`                       | You waited for someone else to offer help with the care.                                               | You waited to see whether anybody else in the family would offer.                         | Third instance of "the care", and this option is specifically about who else in the family steps forward, which the old line left out.                                                                                                                                                                          |
| `community-meeting` `read-it-after:memory`         | You chose to read the meeting minutes afterwards.                                                      | You read the minutes afterwards instead of going.                                         | Drops the choosing frame and adds the thing that makes this option different from `go` — that reading replaced attending.                                                                                                                                                                                       |
| `debt-call` `borrow:memory`                        | You chose to borrow the amount you needed from someone.                                                | You borrowed the amount from somebody.                                                    | Shorter, and "you needed" was an editorial assertion about motive that the option does not record.                                                                                                                                                                                                              |
| `debt-call` `pay-it:memory`                        | You chose to pay what you could toward the debt.                                                       | You paid what you could towards the debt.                                                 | Frame removed; "towards" spelled the way the rest of the bank spells it.                                                                                                                                                                                                                                        |
| `friend-favour` `do-it:memory`                     | You agreed to do the requested favour.                                                                 | You said yes to the favour and got on with it.                                            | "The requested favour" is how a form refers to a favour. The option's own description is "Say yes and get on with it", and the memory now matches what the player pressed.                                                                                                                                      |
| `friend-in-difficulty` `keep-it:memory`            | You kept the personal matter private.                                                                  | You told nobody else what they had told you.                                              | "The personal matter" is the abstraction; the scene is about a specific thing one person told this player. It also fixes the register: keeping a confidence is something you do to a person, not to a matter.                                                                                                   |
| `household-money-shortfall` `cut-back:memory`      | You chose to cut back on your personal spending without discussing it.                                 | You cut back on your own spending and said nothing about it.                              | Frame removed. "Without discussing it" reads like a compliance note; "said nothing about it" is what the option's label ("Cut back quietly") actually means.                                                                                                                                                    |
| `household-money-shortfall` `take-the-work:memory` | You chose to look for extra work to cover the shortfall.                                               | You went looking for extra work to cover the shortfall.                                   | Frame removed, and "went looking" is the verb a person would use.                                                                                                                                                                                                                                               |
| `household-standing` `absorb-it:memory`            | You decided to handle the shopping and appointments yourself.                                          | You took on the shopping and the appointments yourself.                                   | "You decided to" is the same frame wearing a different verb. "Took on" is what absorbing the week is.                                                                                                                                                                                                           |
| `household-standing` `say-it:witnessed`            | They brought up the shopping and two appointments.                                                     | They raised who was covering the week.                                                    | The witnessed line was the memory with the pronoun swapped, which the near-duplicate measure caught at 0.778. An onlooker sees somebody raise the question of who is covering, not a recitation of the errand list.                                                                                             |
| `household-standing` `set-it-out:witnessed`        | They proposed sharing the shopping and appointments.                                                   | They suggested splitting the week between you.                                            | Same defect, same repair; and "the week" is how the household actually talks about it.                                                                                                                                                                                                                          |
| `housing-repair-standoff` `fix-it-yourself:memory` | You chose to handle the repair yourself.                                                               | You did the repair yourself.                                                              | Frame removed. "Handle" was doing no work that "did" does not.                                                                                                                                                                                                                                                  |
| `housing-repair-standoff` `withhold:memory`        | You chose to withhold payment pending the repair.                                                      | You stopped paying until the repair is done.                                              | Frame removed, and "pending" is a letter word. The option's label is "Stop paying until it is done".                                                                                                                                                                                                            |
| `incident-aftermath` `help-clear-up:memory`        | You prioritized helping other households clear up.                                                     | You put helping the other households first.                                               | The owner's priority control: "prioritized … clear up" implies the clearing up happened. Putting something first is the decision; whether it got done is the world's business.                                                                                                                                  |
| `local-dispute` `let-it-run:memory`                | You chose not to intervene in the proposal.                                                            | You stayed out of the proposal.                                                           | The negative form of the same frame. "Stayed out" is what a person says.                                                                                                                                                                                                                                        |
| `ordinary-good-day` `get-things-done:memory`       | You chose to work on the shopping and appointments.                                                    | You spent the day on the shopping and the appointments.                                   | Frame removed, and "spent the day" matches its two sibling options, which is the one place a shared shape is right: three ways of spending the same day.                                                                                                                                                        |
| `ordinary-good-day` `go-out:memory`                | You chose to spend time outside.                                                                       | You spent the day outside.                                                                | Same sibling set. "Spend time outside" was vaguer than the option it records.                                                                                                                                                                                                                                   |
| `ordinary-good-day` `prose`                        | The shopping and two appointments still need someone to handle them. How do you want to spend the day? | The week's errands are still yours to fit in somewhere. How do you want to spend the day? | This was 0.737 similar to `household-standing`'s scene line — two different scenes opening with the same sentence. They are different scenes: one is a negotiation about who covers the week, the other is a day with the week still hanging over it. The line now says the second thing.                       |
| `small-windfall` `give-it:memory`                  | You chose to give the money to someone who needed help.                                                | You gave the money to somebody who needed it.                                             | Frame removed; "needed help" narrowed to "needed it", because the option gives money, not help.                                                                                                                                                                                                                 |
| `small-windfall` `put-it-away:memory`              | You chose to save the money for later.                                                                 | You put the money away for later.                                                         | Frame removed, and the verb now matches the option's own label, "Put it away".                                                                                                                                                                                                                                  |
| `small-windfall` `spend-it:memory`                 | You chose to spend the money on something you would enjoy.                                             | You spent the money on something you wanted.                                              | Frame removed. "Would enjoy" predicts a feeling; "wanted" is what the decision recorded.                                                                                                                                                                                                                        |
| `unexpected-expense` `handle-it:memory`            | You chose to replace the broken item.                                                                  | You replaced the broken item.                                                             | Frame removed; nothing else needed changing.                                                                                                                                                                                                                                                                    |
| `unexpected-expense` `make-do:memory`              | You chose to go without the item.                                                                      | You went without it.                                                                      | Frame removed, and the second "the item" was a repetition of the sentence before it in the same scene.                                                                                                                                                                                                          |
| `weekend-invitation` `say-yes:memory`              | You said you would attend the event.                                                                   | You told them you would come on Saturday.                                                 | This family now has a real invitation behind it, from a named person, for a Saturday. "The event" was the placeholder that stood in for facts the world did not have; both facts exist now, so the memory carries them.                                                                                         |
| `weekend-invitation` `stay-in:memory`              | You chose to stay in.                                                                                  | You told them you would not be coming on Saturday.                                        | The old line recorded a mood. With a person who asked, declining is something you say to them, and the record should show that a person was answered.                                                                                                                                                           |
| `work-credit` `let-it-go:memory`                   | You chose not to correct the claim about whose work it was.                                            | You let them have the credit and said nothing.                                            | The negative frame, and then a second pass. The first repair — "You let the claim about whose work it was stand" — came out 0.8 similar to its own sibling `correct-it:memory`, which the near-duplicate measure caught on the re-run. This says it in the option's own words; its label is "Let them have it". |
| `work-extra-hours` `decline:memory`                | You declined the requested extra hours.                                                                | You said you would not take the extra hours.                                              | "The requested extra hours" is a form phrase. The family now has an actual request from a colleague, so this is something the player said to somebody.                                                                                                                                                          |
| `work-good-week` `press-on:memory`                 | You chose to keep working after the good week.                                                         | You kept working through the good week.                                                   | Frame removed, and "through" rather than "after": the option is "Push while it is going well", which happens during the week, not once it is over.                                                                                                                                                              |

## The 67 kept, and why each one survived

These were read and left alone. A row is kept because it is already the plain
sentence, not because it was skipped.

**Labels and descriptions (7).** `household-standing` `say-it:label`
(_Discuss the errands_), `absorb-it:label` (_Handle the errands yourself_),
`set-it-out:label` (_Propose a split_), and their three descriptions, plus
`ordinary-good-day` `go-out:label` (_Spend time outside_): each names an action
in the imperative and nothing else, which is the whole of the choice-label rule.
`ordinary-good-day` `get-things-done:description` (_Work on your shopping and
appointments_) still refers to the errands, and correctly — the scene is gated
on an active errands item, and after the scene line changed this is the only
place in the scene that names them.

**`household-standing` scene line.** _The shopping and two appointments still
need to be covered. How do you want to handle them?_ Kept exactly: it states the
circumstance the work item records, ends on the player's move, and is the row
the sibling scene was moved away from rather than the other way round.

**`care-request` `take-it-on:memory`.** _You agreed to help take care of someone
in your family._ Already names a recipient, which is what the other three rows
in this family had to be repaired to do.

**`community-building` (2).** _You proposed cutting another expense to cover the
building cost._ / _You argued for continuing the charge that supports the
building._ Both name the actual instrument — an expense, a charge — rather than
"the money", and both record a position taken rather than an outcome.

**`community-meeting` (2).** _You went to the meeting._ / _You skipped the
meeting._ Four words and three words. There is nothing to improve and any
addition would be decoration.

**`debt-call` `negotiate:memory`.** _You asked for different debt repayment
terms._ Records an ask, not an agreement, which is the distinction this family
gets wrong most easily.

**`family-request` (4).** _You agreed to give the requested two weeks._ /
_You offered part of the requested two weeks._ / _You offered to find somebody
else to go._ / _You said you couldn't come and kept your existing plan._ The two
weeks are the request's own measure and appear in three of the four; the fourth
is the only option that is about somebody else, and says so. "The requested two
weeks" survives where "the requested favour" did not, because two weeks is a
quantity the request states and a favour is not.

**`friend-favour` `decline:memory`.** _You declined the favour._ Three words,
and the witnessed line beside it (_They said no._) is the observer's version.

**`friend-good-news` (2).** _You attended the celebration._ / _You sent
congratulations instead of going._ The second names what the first gave up,
which is the pair working as a pair.

**`help-with-strings` (2).** _You accepted the help and insisted on paying for
it._ / _You accepted the offer of help._ The difference between them is the
whole family, and it is in the sentences.

**`household-money-shortfall` `say-so:memory`.** _You said that money was tight
that month._ Reported speech with a period attached, which is exactly what the
option does.

**`household-quiet-evening` (2).** _You spent the evening on your own._ / _You
spent the evening at home with company._ Now that this family has a real free
evening behind it, both lines are true of it without alteration.

**`household-repair` (3).** _You asked for help with the repair._ / _You worked
on the repair._ / _You left the repair for now._ Withheld family; the rows stay
readable for old saves. "For now" in the third is doing real work — it is a
deferral, not a refusal.

**`housing-cost-change` (2).** _You decided to stay despite the increased
housing cost._ / _You challenged the housing cost increase._ "Decided to stay"
survives the frame sweep because staying is not an action you can name without
the deciding; there is no verb for it.

**`housing-repair-standoff` `formal:memory`.** _You put the repair request in
writing._ Names the form the escalation took.

**`incident-aftermath` `sort-your-own:memory`.** _You put your own household
first._ The counterpart of the row above it that had to be repaired, and already
in the same shape the repair reached for.

**`incident-neighbour-help` `help:memory`.** _You offered what you could to help
the other household._ "What you could" is honest about an amount nothing
records.

**`local-dispute` `speak-at-the-meeting:memory`.** _You spoke against the
proposal at the meeting._ Place, position and act in one line.

**`local-issue-position` `leave-it-open:memory`.** _You left your position on
the issue undecided._ The only row in the bank that records a deliberate
non-decision, and it says so without apologising for it.

**`old-favour-returns` (2).** _You agreed to help with the new request._ /
_You declined the new request._ "New" is the fact that distinguishes this family
from `friend-favour`, and it is in both.

**`partner-plan` (3).** _You asked to postpone deciding between the plans._ /
_You agreed to the plan your partner preferred._ / _You asked to go with your
plan._ Two asks and one agreement, correctly distinguished — this is the family
where recording an ask as an agreement would matter most.

**`petition-ask` (2).** _You signed the petition._ / _You declined to sign the
petition._ Signing is a physical act and the rows say it.

**`promise-comes-due` (3).** _You kept your earlier promise._ / _You asked to
move the commitment and offered an alternative._ / _You did not raise the
commitment._ The third is the hardest row in the bank to write honestly — not
raising something is invisible — and it neither dramatises nor excuses it.

**`volunteer-ask` (3).** _You signed up to volunteer._ / _You offered to help
for just that Saturday._ / _You declined the volunteer request._ "Just that
Saturday" is the bounded version, and the boundary is the point of the option.

**`work-colleague-struggling` (3).** _You asked your colleague what was going
on._ / _You took on some of your colleague's work without discussing it._ /
_You raised the problem with someone senior at work._ Three genuinely different
responses to one situation, in three genuinely different sentences.

**`work-credit` (2 of 3).** _You corrected the claim about whose work it was._ /
_You raised the credit issue privately with your colleague afterwards._ The
second names when and how private, which is what separates it from the first.

**`work-extra-hours` (2 of 3).** _You agreed to work the extra hours._ /
_You offered to take some of the extra hours and declined the rest._ The third
had to be repaired; these two already say what was agreed and what was split.

**`work-good-week` `enjoy-it:memory`.** _You took time to enjoy the good week at
work._ Records taking the time, not the enjoying, which is the right side of the
line.

**`work-offer-elsewhere` (2).** _You followed up on the other job offer._ /
_You brought up the other offer with your current employer._ Two different
audiences, named.

**`work-rule-pressure` (3).** _You followed the stated work rule._ / _You
followed the usual practice at work._ / _You challenged the work rule with a
senior person._ The first two are near-identical actions with opposite meanings,
and the sentences carry the difference in two words: _stated_ against _usual_.

**`ordinary-life:public-meeting` work-item summary.** _The agenda is posted.
Decide whether to attend._ A task card. Two sentences, one fact and one
instruction, and no scene-setting.

**`candidacy-approach` `say-maybe:memory`.** _You said you would think about
running for office._ Already carried the owner's candidacy control — running for
office, in those words — and needed nothing. The scene line above it did not,
and was repaired; see [restored-families.md](restored-families.md).

**`friend-in-difficulty` `keep-it` (description) and its siblings** are covered
in the restored-families file, since that family is newly playable and its whole
scene was reviewed with real neighbouring text rather than as isolated rows.
