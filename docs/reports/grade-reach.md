# Grade reach

One grade on one piece moves every piece that shares its pattern, voice and register, across banks. Built by `scripts/dialogue-batch/grade-reach-report.ts` (`defaults`).

**Place:** Hackensack, Minnesota (`2726378`), seed `6b876649b889a77989a119dc595dd86766282bd695c3711a759ad4c9b30a3215`, drawn as `drawPlace("grade-reach-oct27:<n>", "grade-reach")`; played 365 days from 2026-10-12.
**Race:** Ann Harmon won U.S. Senator against Amber Yoder (the voting module's recorded result).

## What reaches what

A piece carries three things a grade attaches to: its **pattern** (the speech act it makes, `tag.move`), its **voice** (the bearing the speaker's traits pull toward, or none) and its **register class** (public address, private talk, broadcast, narration, from `registerClasses` in `data/english/calibration.json`). Pieces sharing all three are one group. A group's grades add up (good +1, bad or fix −1, a grade shared with other parts of a line counts half). Every other piece in the group is weighted by the sum on a curve that slides between a floor of 0.8 and a ceiling of 1.25 (`reachFloor`, `reachCeiling`, `reachSaturation`, all TUNABLE): nothing is banned and nothing flips at a threshold. The piece's own grade still works as before (`pieceFactor`).

## One grade, one played piece

The graded piece is `address.victory-claim.im-grateful`, a line of the winner's election-night speech in Hackensack, Minnesota: group `thank|none|public`. It is given one GOOD grade. The group holds 34 other pieces in 3 banks (address, counter, hearing). **34 pieces move, in 3 banks (address, counter, hearing).** Weights are shares of 1,000 for a piece of authored weight 1, as a voiced pick scales them.

| piece                                                   | bank    | weight before | weight after |
| ------------------------------------------------------- | ------- | ------------- | ------------ |
| `address.campaign-thanks.im-glad-to-be-here`            | address | 1061          | 1116         |
| `address.campaign-thanks.its-good-to-be-back-in-place`  | address | 1061          | 1116         |
| `address.campaign-thanks.its-good-to-be-home`           | address | 1061          | 1116         |
| `address.campaign-thanks.its-great-to-be-back-in-place` | address | 1116          | 1159         |
| `address.campaign-thanks.its-great-to-be-here`          | address | 1061          | 1116         |
| `address.campaign-thanks.its-great-to-be-home`          | address | 1061          | 1116         |
| `address.campaign-thanks.thank-you-all-for-coming`      | address | 1061          | 1116         |
| `address.chair-run-meeting.thank-you-for-your-comments` | address | 1061          | 1116         |
| `address.concession-concede.thank-you-for-everything`   | address | 1000          | 1061         |
| `address.debate-moderator.thank-you-both`               | address | 1061          | 1116         |
| `address.victory-claim.i-am-grateful`                   | address | 1061          | 1116         |
| `address.victory-claim.i-am-humbled`                    | address | 1061          | 1116         |
| `counter.visitor-ask.i-appreciate-it`                   | counter | 1061          | 1116         |
| `counter.visitor-ask.i-appreciate-your-help`            | counter | 1061          | 1116         |
| `counter.visitor-ask.thank-you-for-your-help`           | counter | 1061          | 1116         |
| `counter.visitor-ask.thank-you-so-much`                 | counter | 1061          | 1116         |
| `counter.visitor-ask.thanks-for-your-help`              | counter | 1061          | 1116         |
| `hearing.thanks.i-thank-the-gentleman`                  | hearing | 1061          | 1116         |
| `hearing.thanks.i-thank-you`                            | hearing | 1061          | 1116         |
| `hearing.thanks.oh-thank-you`                           | hearing | 1061          | 1116         |
| `hearing.thanks.thank-you`                              | hearing | 1061          | 1116         |
| `hearing.thanks.thank-you-all`                          | hearing | 1061          | 1116         |
| `hearing.thanks.thank-you-chair`                        | hearing | 1000          | 1061         |
| `hearing.thanks.thank-you-chairman`                     | hearing | 1061          | 1116         |
| `hearing.thanks.thank-you-for-that`                     | hearing | 1061          | 1116         |
| `hearing.thanks.thank-you-for-that-answer`              | hearing | 1061          | 1116         |
| `hearing.thanks.thank-you-madam-chair`                  | hearing | 1061          | 1116         |
| `hearing.thanks.thank-you-mr-chairman`                  | hearing | 1061          | 1116         |
| `hearing.thanks.thank-you-senator`                      | hearing | 1061          | 1116         |
| `hearing.thanks.thank-you-sir`                          | hearing | 1061          | 1116         |
| `hearing.thanks.thank-you-so-much`                      | hearing | 1061          | 1116         |
| `hearing.thanks.thank-you-very-much`                    | hearing | 1061          | 1116         |
| `hearing.thanks.thanks-mr-chairman`                     | hearing | 1061          | 1116         |
| `hearing.thanks.well-thank-you`                         | hearing | 1061          | 1116         |

## A speech picked differently on fixed seeds

The same race's election-night speech and concession, composed by `composeAddress` on 300 fixed moment keys before and after the grade:

- **victory:** 247 of 300 differ.

  First: moment `grade-reach-oct27:pick:0`

  before: I'm grateful.

  after: I'm honored.

- **concession:** 252 of 300 differ.

  First: moment `grade-reach-oct27:pick:1`

  before: I congratulate Ann Harmon.

  after: I wish Ann Harmon well.

A concession speech nobody graded is picked differently because a victory line was. Read the count as a sign the grade arrived, not as how far it moved lines: the stable draw is `hash % total weight`, so when any weight in a move's tier moves, the cut points of every variant in it move too, and many picks change at once. The measure of reach is the weight table above, a few percent per piece, never a ban.

## The 128 shipped grades, applied through this path

`node --import tsx scripts/dialogue-batch/apply-grades.ts` folds the ledger and writes `data/english/grade-reach.json`. The ledger holds 128 graded keys: 91 are bank pieces and reach their groups; 37 name no bank piece (retired keys and the old composition banks: `bank:`, `day-opening:`, `journal:chapter:`, `life-reply`) and keep their own grade only. **1757 pieces now carry a reach weight other than 1**, across 15 banks: address 186, conversation 87, counter 13, hearing 26, interview 30, journal 162, legislation 86, meeting 97, minutes 34, notice 2, opening-speech 19, scene-talk 933, scene-words 42, speech-stages 5, winning-losing 35.

| group (pattern \| voice \| register) | net grades | graded pieces | pieces in group | banks | weight of an ungraded peer (1.0 = unchanged) |
| ------------------------------------ | ---------- | ------------- | --------------- | ----- | -------------------------------------------- |
| accept \| calm \| private            | 2          | 2             | 217             | 1     | 1.116                                        |
| confront \| braced \| private        | -1         | 1             | 187             | 1     | 0.951                                        |
| answer \| calm \| private            | 0          | 2             | 186             | 2     | 1.000                                        |
| tell \| none \| narration            | -16        | 13            | 158             | 1     | 0.800                                        |
| ask \| curious \| private            | -2         | 2             | 110             | 2     | 0.908                                        |
| press \| braced \| private           | 1          | 1             | 95              | 1     | 1.061                                        |
| tell \| none \| public               | 3          | 3             | 93              | 4     | 1.159                                        |
| address-chair \| none \| public      | 1          | 1             | 88              | 2     | 1.061                                        |
| call-to-order \| none \| public      | -8         | 10            | 80              | 3     | 0.807                                        |
| agree \| calm \| private             | 1          | 1             | 77              | 1     | 1.061                                        |
| ask \| none \| private               | 1          | 1             | 65              | 2     | 1.061                                        |
| deflect \| guarded \| private        | 1          | 3             | 58              | 1     | 1.061                                        |
| announce-result \| none \| public    | 3          | 3             | 53              | 4     | 1.159                                        |
| refuse \| braced \| private          | 1          | 1             | 48              | 1     | 1.061                                        |
| deliver-news \| none \| narration    | 1          | 5             | 45              | 1     | 1.061                                        |
| provision \| none \| broadcast       | 1          | 1             | 44              | 1     | 1.061                                        |
| title \| none \| broadcast           | 7          | 3             | 43              | 1     | 1.235                                        |
| apologize \| contrite \| private     | -1         | 1             | 38              | 1     | 0.951                                        |
| recall \| none \| narration          | 0          | 4             | 38              | 1     | 1.000                                        |
| thank \| none \| public              | 1          | 3             | 35              | 3     | 1.061                                        |
| bargain \| calm \| private           | 2          | 2             | 32              | 1     | 1.116                                        |
| greet \| none \| public              | 0          | 2             | 32              | 4     | 1.000                                        |
| record \| none \| public             | 1          | 5             | 30              | 1     | 1.061                                        |
| warn \| braced \| private            | 2          | 2             | 28              | 1     | 1.116                                        |
| request \| none \| public            | -1         | 1             | 25              | 1     | 0.951                                        |
| accept \| tender \| private          | -1         | 1             | 23              | 1     | 0.951                                        |
| farewell \| tender \| private        | 0          | 2             | 19              | 2     | 1.000                                        |
| plea \| anxious \| private           | 1          | 1             | 17              | 1     | 1.061                                        |
| threaten \| braced \| private        | 2          | 2             | 13              | 1     | 1.116                                        |
| ask \| guarded \| private            | 2          | 2             | 12              | 2     | 1.116                                        |
| promise \| none \| private           | -1         | 1             | 12              | 2     | 0.951                                        |
| recall \| none \| private            | -2         | 2             | 11              | 1     | 0.908                                        |
| put-question \| none \| public       | -1         | 1             | 10              | 1     | 0.951                                        |
| react \| glad \| private             | -1         | 1             | 10              | 2     | 0.951                                        |
| congratulate \| none \| public       | -1         | 1             | 8               | 1     | 0.951                                        |
| refuse \| none \| private            | -1         | 1             | 6               | 1     | 0.951                                        |
| notice \| none \| broadcast          | 0          | 2             | 3               | 1     | 1.000                                        |
| relent \| tender \| private          | -1         | 1             | 1               | 1     | 1.000                                        |

Ask why: a piece's weight is its own running grade times its group's reach, `pieceFactor` in `src/english/calibration.ts`; the group sums are in `data/english/grade-reach.json`.
