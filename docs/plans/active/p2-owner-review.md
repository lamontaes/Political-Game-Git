# P2 owner review packet — ordinary/adult scenes and consequence/memory bank

Companion to `docs/plans/active/p2-prose-migration.md`. Every changed
player-facing P2 line, every withheld situation, the new structural patterns,
fixed-seed before/after transcripts, and a random unchanged holdout sample.
Semantic IDs are the corpus IDs with the `prose:life:` prefix trimmed;
callback rows are `computed-anchors.json` anchors in
`src/simulation/life-callbacks.ts`.

Independent grounding review: verdict recorded at the end of this file.

## Withheld situations (rendered as nothing — the scene is no longer offered)

These stay authored, keep their keys for old saves and scheduled callbacks,
and are reported by the corpus as WITHHELD_BY_GROUNDING with the bank's own
reason:

- **adult.household-money-shortfall** (10 rows) — The scene depends on the month's arithmetic having moved, and the world keeps no monthly income or spending record that could say so. Grounded money pressure lives in adult.debt-call and adult.housing-cost-change, which read recorded obligations.
- **adult.household-repair** (10 rows) — The scene depends on a specific broken household object, and the world keeps no record that could name one. Until a canonical household object or repair record exists, an unnamed broken 'something' cannot be grounded, and a prettier synonym for 'thing' would not ground it either.
- **adult.housing-repair-standoff** (10 rows) — The scene depends on a specific unrepaired defect and a recorded repair-responsible counterpart, and the world contains neither: dwellings carry no defect records and tenures name no landlord. Withheld rather than rewritten around an unnamed broken 'something'.
- **adult.small-windfall** (10 rows) — A money scene needs the amount, the source and whether anything already claims it, and the world records no receipt this could read. Money that arrives from nowhere in no amount cannot be grounded.
- **adult.unexpected-expense** (7 rows) — The scene depends on a specific object having broken and on the month's arithmetic, and the world records neither objects nor monthly amounts. An unnamed broken 'something' with an unstated cost cannot be grounded.

## Every changed or added line (72 reworded, 11 added)

Callback rows marked `callback:RETURN_SUMMARY-00xx` render as the event
summary and memory when an earlier choice comes back; `GENERIC_RETURN` is the
never-reached fallback a test now pins as covered for every schedulable
family.

| ID                                                               | Before                                                                                                                                 | After                                                                                                                      |
| ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| adult:adult.candidacy-approach#option:ask-what-for:memory        | You asked whose idea it actually was, and the answer was more interesting than the question.                                           | You asked whose idea it actually was before you answered.                                                                  |
| adult:adult.candidacy-approach#option:say-maybe:memory           | You said you would think about it, which everybody correctly heard as most of a yes.                                                   | You said you would think about it, and did not close it off.                                                               |
| adult:adult.candidacy-approach#option:say-no:memory              | You said no, plainly, and they asked somebody else within the month.                                                                   | You said no, plainly.                                                                                                      |
| adult:adult.care-request#option:name-the-limit:memory            | You said exactly what you could manage before it became assumed, and the rest was worked out around it.                                | You said exactly what you could manage before it became assumed.                                                           |
| adult:adult.care-request#option:wait:memory                      | You let the silence run, and somebody else broke it, and you both knew it.                                                             | You let the silence run, and somebody else broke it.                                                                       |
| adult:adult.care-request#prose                                   | The looking-after that has been shared out is about to stop being shared out, and everyone is waiting to see who says something first. | Somebody in the family is going to need regular looking after, and nobody has said yet who is going to do it.              |
| adult:adult.community-building#option:cut-something-else:memory  | You paid for it out of something else, and spent a long time afterwards being asked which something.                                   | You argued for paying for it out of something else, and were asked, twice, which something.                                |
| adult:adult.community-building#option:find-the-money:memory      | You went looking for money instead, which might have worked, and which took the whole autumn.                                          | You argued for going to find the money instead, with no promises attached.                                                 |
| adult:adult.community-building#option:move-it:memory             | You argued for moving, kept the group together, and watched what the building had been doing become obvious once it was gone.          | You argued for moving somewhere cheaper and keeping the group together.                                                    |
| adult:adult.community-meeting#option:go:memory                   | You gave it an evening and found out how much of the decision had already been made elsewhere.                                         | You went, and sat through the whole agenda.                                                                                |
| adult:adult.debt-call#option:borrow:memory                       | You borrowed it from somebody you knew, which solved it, and changed something between you.                                            | You borrowed it from somebody you knew, which moved the debt rather than ended it.                                         |
| adult:adult.debt-call#option:pay-it:memory                       | You paid what you could immediately and felt better about it than the balance justified.                                               | You paid what you could immediately.                                                                                       |
| adult:adult.family-request#option:find-someone-else:memory       | You found somebody else to go, which worked, and which you thought about for a while afterwards.                                       | You found somebody else to go in your place.                                                                               |
| adult:adult.friend-favour#option:conditions:memory               | You said yes and said where it stopped, which they took better than you had expected.                                                  | You said yes, and said where it stopped.                                                                                   |
| adult:adult.friend-favour#option:decline:memory                  | You said no, and it was fine, and it was slightly less fine than they said it was.                                                     | You said no. They said it was fine.                                                                                        |
| adult:adult.friend-favour#option:do-it:memory                    | You said yes without making them ask twice, and it cost you an afternoon.                                                              | You said yes without making them ask twice, and did it.                                                                    |
| adult:adult.friend-good-news#option:go:memory                    | You went, and it was a good evening, and being there was most of the point.                                                            | You went, and it was a good evening.                                                                                       |
| adult:adult.friend-good-news#option:send-word:memory             | You sent word rather than going, meant it, and it was not the same thing.                                                              | You sent word rather than going, and meant it.                                                                             |
| adult:adult.friend-in-difficulty#option:keep-it:memory           | You kept it, because they had told you rather than anybody else, and that had to mean something.                                       | You kept it to yourself, because they had told you rather than anybody else.                                               |
| adult:adult.friend-in-difficulty#option:push-them:memory         | You told them you would not carry it, and made them go and deal with it, and they did.                                                 | You told them you would not carry it for them, and to go and deal with it.                                                 |
| adult:adult.friend-in-difficulty#option:step-back:memory         | You stepped back from it, and were not entirely sure afterwards whether that had been sense.                                           | You told them this was not somewhere you could be, and stepped back.                                                       |
| adult:adult.help-with-strings#option:decline:memory              | You turned it down and kept the problem, and were not sure for months whether that had been pride.                                     | You turned the help down and kept the problem.                                                                             |
| adult:adult.help-with-strings#option:pay-for-it:memory           | You accepted and insisted on settling up, which they found faintly insulting and you found necessary.                                  | You accepted, and paid your way over their objection.                                                                      |
| adult:adult.help-with-strings#option:take-it:memory              | You let them sort it out, and it was sorted out, and something between you was different afterwards.                                   | You let them sort it out, and it was sorted out.                                                                           |
| adult:adult.household-standing#option:absorb-it:memory           | You did it again yourself, and did not say so, and it stayed that way.                                                                 | You did the week again yourself, and did not say so.                                                                       |
| adult:adult.household-standing#option:say-it:memory              | You said out loud which of it had been yours for three weeks, and the room did not enjoy it.                                           | You said out loud that the shopping and the appointments had been yours for three weeks.                                   |
| adult:adult.household-standing#option:set-it-out:memory          | You turned it into an arrangement instead of an argument, and it mostly held.                                                          | You turned it into an arrangement instead of an argument.                                                                  |
| adult:adult.household-standing#prose                             | The same thing has gone undone three weeks running, and it is not going to be mentioned again unless you mention it.                   | The shopping and the appointments have landed on you three weeks running, and nobody is going to mention it unless you do. |
| adult:adult.housing-cost-change#option:absorb:memory             | You found the money and stayed, and the rest of the year was arranged around having found it.                                          | You found the money and stayed.                                                                                            |
| adult:adult.housing-cost-change#option:move:memory               | You started looking, which turned out to be the beginning of a much longer few months.                                                 | You started looking for somewhere else.                                                                                    |
| adult:adult.housing-cost-change#option:push-back:memory          | You argued it, which was uncomfortable, and got somewhere with about half of it.                                                       | You argued the increase instead of accepting it, which was uncomfortable.                                                  |
| adult:adult.incident-aftermath#option:push-for-answers:memory    | You started asking who was supposed to have stopped it, and found out how long that kind of question takes.                            | You started asking who was supposed to have stopped it.                                                                    |
| adult:adult.incident-aftermath#option:sort-your-own:memory       | You got your own straight first, which was sensible and which you were slightly ashamed of.                                            | You got your own household straight before anything else.                                                                  |
| adult:adult.incident-aftermath#prose                             | What happened has stopped happening, and the part that is left is the part you have to do something about.                             | The worst of it is over. What is left is the part you have to do something about.                                          |
| adult:adult.incident-neighbour-help#option:keep-yours:memory     | You kept what you had, on the grounds that you might need it, and did not.                                                             | You kept what you had, on the grounds that you might need it.                                                              |
| adult:adult.local-dispute#option:let-it-run:memory               | You let it run, on the grounds that it might not pass, and did not find out for months whether that had been right.                    | You let it run, on the grounds that it might not pass.                                                                     |
| adult:adult.local-dispute#option:talk-to-them:memory             | You went and talked to them before the meeting, and about half of it went away.                                                        | You went and talked to them before the meeting could.                                                                      |
| adult:adult.local-issue-position#option:leave-it-open:memory     | You did not settle it, on the grounds that you would know more later, and later you did.                                               | You left it open, on the grounds that you would know more later.                                                           |
| adult:adult.old-favour-returns#option:name-the-difference:memory | You helped and said plainly that it was not the same favour, and both halves of that were heard.                                       | You helped, and said plainly that it was not the same favour.                                                              |
| adult:adult.ordinary-good-day#option:do-nothing:memory           | You wasted it deliberately, which is not the same as wasting it.                                                                       | You did nothing at all with it, on purpose.                                                                                |
| adult:adult.ordinary-good-day#option:go-out:memory               | You spent the whole day outside for no reason at all, and remembered it longer than several more important ones.                       | You spent the whole day outside for no reason at all.                                                                      |
| adult:adult.partner-plan#option:postpone:memory                  | You put it off, and it stayed put off, which was its own answer.                                                                       | You put it off rather than settle it.                                                                                      |
| adult:adult.partner-plan#option:your-way:memory                  | You held out for yours, and got it, and noticed what it had cost.                                                                      | You held out for yours, and got it.                                                                                        |
| adult:adult.petition-ask#option:help-quietly:memory              | You did the work and kept your name off it, which most people took for not helping.                                                    | You did the work and kept your name off the sheet.                                                                         |
| adult:adult.petition-ask#option:refuse:memory                    | You said no to putting your name to it, and gave the real reason, which was worse.                                                     | You said no to signing, and gave the real reason.                                                                          |
| adult:adult.petition-ask#option:sign:memory                      | You signed it, and it was read by people who knew you, which was the point and also the cost.                                          | You signed it, and your name went where people who know you would read it.                                                 |
| adult:adult.promise-comes-due#option:drop-it:memory              | You let it go, on the assumption that it would not be raised, and it was not.                                                          | You let it go, on the assumption that it would not be raised.                                                              |
| adult:adult.volunteer-ask#prose                                  | Something local is short of hands, and somebody has worked out that you have a Saturday.                                               | A local volunteer group is short of hands for Saturdays, and somebody has asked for yours.                                 |
| adult:adult.weekend-invitation#prose                             | There is a thing on at the weekend that you would probably enjoy and have no obligation to attend.                                     | There is something on this Saturday that you would probably enjoy, and nobody needs you there.                             |
| adult:adult.work-colleague-struggling#option:tell-someone:memory | You put it where it could actually be dealt with, and never entirely settled whether that had been loyal.                              | You put it where it could actually be dealt with.                                                                          |
| adult:adult.work-credit#option:correct-it:memory                 | You said whose it was while everyone was still in the room, and the room noticed both halves of that.                                  | You said whose it was while everyone was still in the room.                                                                |
| adult:adult.work-credit#option:let-it-go:memory                  | You let it go, and it stayed gone, and you were not sure afterwards whether that had been generosity.                                  | You let them have it, and said nothing to anybody.                                                                         |
| adult:adult.work-credit#option:say-it-later:memory               | You had it out with them afterwards, quietly, and they were careful with you for a month.                                              | You had it out with them afterwards, quietly.                                                                              |
| adult:adult.work-extra-hours#option:take-them:memory             | You took the hours, and for a while everything else got the leftovers.                                                                 | You took the hours, and everything else got what was left of the week.                                                     |
| adult:adult.work-extra-hours#option:trade:memory                 | You took the half of it that fitted and handed the rest back, which annoyed exactly one person.                                        | You took the half of it that fitted and handed the rest back.                                                              |
| adult:adult.work-extra-hours#prose                               | There is more work than week, and somebody has decided the difference is yours.                                                        | Work has asked you to take on more hours, and they would have to come out of everything that is not work.                  |
| adult:adult.work-offer-elsewhere#option:say-nothing:memory       | You let it pass without telling anybody it had happened, and that was the whole of it.                                                 | You let it pass without telling anybody it had happened.                                                                   |
| adult:adult.work-offer-elsewhere#option:stay:memory              | You stayed, and told yourself it was the sensible one, and half meant it.                                                              | You kept the job you had, and let the other thing pass.                                                                    |
| adult:adult.work-offer-elsewhere#prose                           | Something better paid has been mentioned to you, somewhere else, and mentioning it back is the part that costs.                        | A better-paid job somewhere else has been mentioned to you, and nobody at work knows it was.                               |
| adult:adult.work-rule-pressure#option:by-the-book:memory         | You did it the way it was written, in front of people who do not, and the rest of the day was quiet.                                   | You did it the way it was written, in front of people who do not.                                                          |
| adult:adult.work-rule-pressure#option:raise-it:memory            | You said out loud that the rule did not survive contact with the job, and then had to defend saying it.                                | You said out loud that the rule does not work on the floor, and then had to defend saying it.                              |
| adult:adult.work-rule-pressure#option:the-usual-way:memory       | You did it the way the place does it, and nobody said anything, which was the point.                                                   | You did it the way the place actually does it, and nobody said anything.                                                   |
| callback:GENERIC_RETURN-0001#text                                | Something decided a long time earlier turned out to still be there.                                                                    | An earlier choice came back up.                                                                                            |
| callback:RETURN_SUMMARY-0001#text                                | An evening you had not thought about turned out to have counted for something.                                                         | An evening at home you had not thought twice about turned out to have been remembered.                                     |
| callback:RETURN_SUMMARY-0002#text                                | It came back a third time, which is when a favour stops being a favour.                                                                | The same favour came back a third time.                                                                                    |
| callback:RETURN_SUMMARY-0008#text                                | The morning with the rule and the customer came back, from a direction you had not expected.                                           | The business with the rule at work came back, from a direction you had not expected.                                       |
| callback:RETURN_SUMMARY-0011#text                                | The thing about the week that never gets done was raised again, and this time not by you.                                              | The business about the week's errands was raised again, and this time not by you.                                          |
| callback:RETURN_SUMMARY-0013#text                                | The thing you rearranged came round a second time, and there was less room to rearrange it.                                            | What you said you'd do came round a second time, and there was less room to move it.                                       |
| callback:RETURN_SUMMARY-0017#text                                | What you did about the offer got back to somebody it was not supposed to.                                                              | What you did about the offer turned out to have been talked about.                                                         |
| callback:RETURN_SUMMARY-0018#text                                | What you did in the two weeks afterwards came up again, long after everybody else had stopped talking about it.                        | What you did in the days afterwards came up again, long after everybody else had stopped talking about it.                 |
| callback:RETURN_SUMMARY-0019#text                                | What you gave, or kept, after the flooding turned out to have been noticed.                                                            | What you gave, or kept, when the other household needed it turned out to have been noticed.                                |
| callback:RETURN_SUMMARY-0022#text                                | Your name on that list was read by somebody who had not been meant to read it.                                                         | Your name on that list turned out to have been read and remembered.                                                        |
| callback:RETURN_SUMMARY-0023#text                                | —                                                                                                                                      | The Saturdays you gave, or kept, came up again.                                                                            |
| callback:RETURN_SUMMARY-0024#text                                | —                                                                                                                                      | The business about what it costs to stay came back around.                                                                 |
| callback:RETURN_SUMMARY-0025#text                                | —                                                                                                                                      | The business with the repairs and the rent came back around.                                                               |
| callback:RETURN_SUMMARY-0026#text                                | —                                                                                                                                      | The extra work you took on to cover the month came up again.                                                               |
| callback:RETURN_SUMMARY-0027#text                                | —                                                                                                                                      | The favour you asked over the repair came back around.                                                                     |
| callback:RETURN_SUMMARY-0028#text                                | —                                                                                                                                      | The money you passed on turned out to have been remembered.                                                                |
| callback:RETURN_SUMMARY-0029#text                                | —                                                                                                                                      | The offer of help, and what you did with it, came up again.                                                                |
| callback:RETURN_SUMMARY-0030#text                                | —                                                                                                                                      | What you did about the colleague who was not managing turned out to have been noticed.                                     |
| callback:RETURN_SUMMARY-0031#text                                | —                                                                                                                                      | What you still owed came back up, on somebody else's schedule again.                                                       |
| callback:RETURN_SUMMARY-0032#text                                | —                                                                                                                                      | Whether you came that Saturday turned out to have been noticed.                                                            |
| callback:RETURN_SUMMARY-0033#text                                | —                                                                                                                                      | Whether you turned up that evening turned out to have been remembered.                                                     |

## New structural sentence patterns

- Scene premises that name the recorded thing: "The shopping and the
  appointments have landed on you three weeks running…" (errands work item),
  "A local volunteer group is short of hands for Saturdays…" (the option's
  own organization write).
- Memories that stop where the player's knowledge stops: "You let it go, on
  the assumption that it would not be raised." — whether it is raised is the
  callback machinery's to decide.
- Family return summaries for every consequence family, in place of the
  generic "Something decided a long time earlier…": "What you still owed came
  back up, on somebody else's schedule again." / "The Saturdays you gave, or
  kept, came up again."
- Two-beat spoken exchanges in memories where the record carries the strain:
  "You said no. They said it was fine."

## Fixed-seed before/after (seed `corpus-ordinary-adult`, 20 beats)

- Before: "There is more work than week, and somebody has decided the
  difference is yours."
  After: "Work has asked you to take on more hours, and they would have to
  come out of everything that is not work."
- Before: "The looking-after that has been shared out is about to stop being
  shared out, and everyone is waiting to see who says something first."
  After: "Somebody in the family is going to need regular looking after, and
  nobody has said yet who is going to do it."
- Beat 7 before: "Something in the place has stopped working properly. It is
  not urgent, and it will not fix itself." (adult.household-repair)
  Beat 7 after: the withheld scene is not offered; the beat is a different,
  grounded scene ("Somebody in the family is going to need regular looking
  after…", with Edward Todd, your dad, present).
- Beat 4 before: "A small amount of money has arrived that nothing is already
  claiming." (adult.small-windfall)
  Beat 4 after: "A day with nothing owed on it, and weather that makes
  staying indoors feel like a waste." (adult.ordinary-good-day)

Occurrences of the flagged premise families ("Something in the place…", "A
small amount of money has arrived…", "There is more work than week…", "The
month does not add up…", "There is a thing on at the weekend…") in the full
fixed-seed transcript matrix: present before, 0 after.

## Random unchanged holdout sample (deterministic, seed 42)

- prose:setup:questionnaire:public_mistake#option:a:text — "Admit it plainly."
- prose:life:adult:adult.community-building#option:keep-the-charge:description — "Extend what was supposed to end."
- prose:conversation:conversation-subject:describeBriefing-0006#text — "You and {other} have said what you are each doing about the meeting."
- prose:life:episode:civic.the-thing-nobody-else-turned-up-for/you-said-something#option:step-back:description — "You came about one building."
- prose:life:episode:care.the-person-you-look-after/it-became-yours#option:carry-it:label — "Carry it quietly"
- prose:life:adult:adult.work-good-week#prose — "The week went well. Nothing dramatic; it simply worked."
- prose:life:adult:adult.friend-in-difficulty#option:keep-it:label — "Tell nobody else"
- prose:life:adult:adult.candidacy-approach#option:say-maybe:label — "Say you would think about it"

All verified byte-identical to the base-SHA corpus (the differential shows
zero transitions outside `prose:life:adult:*` and `prose:life:callback:*`).

## Grounding reviewer verdict

`GROUNDING: PASS` — the separate `civic-prose-grounding-reviewer` agent
checked every changed and added row against the bank's own gates, writes and
premises and confirmed no line claims an object, amount, duration, third-party
motive or future outcome the record does not establish. No repairs were
required.
