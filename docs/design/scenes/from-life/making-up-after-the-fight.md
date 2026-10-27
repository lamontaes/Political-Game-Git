# Episode: making up after the fight

Slug `making-up-after-the-fight`. Types: `apology`, `reconciliation`. Season: holding office, a week or more after a bitter split. Scene researcher (Oct 27). Calibration only: no real name or quoted line ships.

## Sources read (for calibration)

- Portland Press Herald (via Central Maine), report on the Belfast, Maine council meeting of Dec. 4, 2018 (https://www.pressherald.com/?p=1707306). **Opened in full.** Seven days after the council voted to bar the mayor from speaking for it, she opened the meeting with an apology: she "did not fully appreciate the impact" of her op-ed. She said she never meant to call any of them ageists, sexists or bigots, and asked to "move forward together for the good of the city." A councilor moved to undo both votes, saying the ink of the last week could hurt the city. Another councilor said the disputes were style and procedure and that she had "come much more than an inch." A resident: "breathing a huge sigh of relief."
- Bangor Daily News, Nov. 28, 2018 (https://www.bangordailynews.com/2018/11/28/news/belfast-residents-react-to-civil-government-drama/). **Opened in full.** The week before: the city manager said "disagreement is not discrimination" and that communication could fix it; the mayor hoped for "a healing process"; a resident said "it's more than just drama."
- Bangor Daily News, May 16, 2013 (https://www.bangordailynews.com/2013/05/16/news/we-need-to-consolidate-stearns-student-scolds-katahdin-school-boards/). **Opened in full.** Two town school boards in Millinocket and East Millinocket agreed to "put aside their stormy past." A student told them "We need to come together as two schools." A board chair said, "We have to put the stuff that has happened in the past behind us, not hold grudges."
- Talk Business, "Cooler Heads Prevailing With City Council," July 22, 2002 (https://talkbusiness.net/2002/07/cooler-heads-prevailing-with-city-council/). **Opened in full.** Fayetteville, Arkansas: a mayor and council members who had backed his rival; he said "We've gotten over it over the last year."
- Search summary only: Bangor Daily News, Feb. 20, 2019, says Belfast tensions rose again and not all issues were solved.
- Not found: a pair of former close allies in a first-person account. These are officials who split and came back; none is a friendship.

## Fact packet (what happens, in substance)

1. A mayor writes a public piece saying the council is biased against her. Councilors take it as an accusation against each of them.
2. A week later the council votes, unanimously on one point, to take away her role as its voice and to leave a regional group. The town packs the meeting.
3. In the week between, residents argue in print; the city manager says disagreement is not discrimination and talk can fix it; the mayor says she hopes for healing.
4. At the next meeting the mayor speaks first. She apologizes for the effect of her words, says what she did not mean, and says she wants to move forward together.
5. A councilor moves to undo both votes, citing the city's interests rather than her apology; another says the dispute was about style and that she came further than expected.
6. The votes are undone in front of the crowd. A resident says the town is relieved.
7. Costs and limits: the council keeps its concerns; a training idea is offered; months later tension returns.
8. What changed: the two votes are reversed, the mayor speaks for the body again and the tie is mended but not whole.

## Ask the engine

Read from code and data only (see the other episode's note); no ids claimed.

| Line | Record                                                        | Result                                                             |
| ---- | ------------------------------------------------------------- | ------------------------------------------------------------------ |
| 1    | A public statement against others                             | No record exists                                                   |
| 2    | A body's vote to strip a role                                 | Record exists in part (votes; no role-stripping vote on a person)  |
| 3    | Public back-and-forth, an official's call                     | No record exists                                                   |
| 4    | An apology by the one who gave offense                        | `apology` awaits `record:decision-to-concede`; no engine writes it |
| 5    | A motion to rescind                                           | Record exists in part (votes); nothing links it to the tie         |
| 6    | Votes undone                                                  | Record exists; nothing fires                                       |
| 7    | Lasting limits on the tie                                     | Record exists for the tie                                          |
| 8    | Aftermath `support:apology-accepted` and `support:reconciled` | Written by the types themselves if they fire                       |

`reconciliation` awaits `record:help-after-quarrel`; no engine writes it either.

## Gaps

- No engine writes `decision-to-concede`, so `apology` never fires; a person who gave offense choosing to own it is not a record. Engine (people / decisions) with the producer (lead director).
- No `help-after-quarrel`, so the return of an ally never fires either; a gesture (help, a vote, a call) after a soured tie is not a record. Engine (relationship).
- The sources show an apology followed by an act (a vote reversed), not an apology alone; the type writes only a tie change. Producer (lead director): the aftermath should read a pending vote and let the other side rescind or move first.
- Lines: the bank has apologize, accept and bargain lines but no "I did not mean it that way," no "come further than expected," no one speaking first at the next meeting. Lines.

## Lines the bank needs

Speakers are the one who gave offense (apologizing, or `one`) and the one who took it (wronged, or `other`). Substance only.

- Apologizing, by trait: a proud one owns the effect but not the intent; a contrite one owns both; a conflict-averse one asks to move forward without discussing it; a hot-tempered one needs the other to speak first. By tie: a close ally says it in private first; a rival says it in public.
- Wronged, by trait: a forgiving one accepts and names what they need next; a guarded one accepts the words and asks for a sign; a proud one says the harm was real and sets a condition; a grudge-holding one says they will see.
- Witness: someone who says the room is relieved, or that this has happened before.
- Four replies where the player is the other side or the go-between: accept at once, accept with a condition, ask them to say it in public, say it is not enough yet.

## Other lives the same scene covers

- Millinocket and East Millinocket, Maine, May 2013: two school boards set aside a stormy past (Bangor Daily News, opened).
- Fayetteville, Arkansas, July 2002: a mayor and the council that backed his rival, calmer after a year (Talk Business, opened).
