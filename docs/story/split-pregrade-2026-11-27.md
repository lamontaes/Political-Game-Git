# The Story split's word batches, pre-graded (Nov 27, 2026)

Read by a session that wrote none of these lines (Past and Day One, Sonnet 5.5; the three blind readers were Opus subagents, each reading the whole packet alone). No line was edited, and none is suggested.

**What was read.** The first evening as played in three drawn-by-hand places (typed seeds, not drawn: Hinton, West Virginia `e8a1b3`; Napeague, New York `4c7d02`; Brian Head, Utah `a93f61`), by `scripts/words/first-evening-packet.ts`, on a scratch merge of core/fold-nov27 (e7385f9f) with the five word pull requests at the heads below. Nothing was pushed from the scratch merge. Two things were needed to make it run, neither a words change: the journal piece's `./stopgaps` import (the fold moved it to `../core2/stopgaps`) and baseline-json conflicts, both since fixed on the pull requests themselves (their heads moved after the packet was played; the bank files at the new heads differ from the played heads only in `src/director/data/stopgaps.json`).

| Batch                      | PR             | Head played | Head now   |
| -------------------------- | -------------- | ----------- | ---------- |
| The address                | #10735         | c18850a16d  | a82177087b |
| The Journal                | #10706         | 9da00ad88f  | bb57c8ff02 |
| Loading and person history | #10707         | 23f7b93b3b  | 0d260bec1d |
| The news                   | #10721         | 76f296f9aa  | 76f296f9aa |
| Household talk             | #10745 (draft) | 56d12e4dc2  | 6d81a98b3f |

**Coverage, honestly.** The packet plays one address, one first talk, one first-evening Journal chapter and a handful of stories per life. In three lives that is 17 address lines of a 2,455-piece address bank, 12 talk lines of 4,585 talk pieces, 21 Journal lines (chapter headings included) of 373, 21 loading lines of 1,156 person-history pieces and loading steps, and 49 news lines (headings included) of 1,183 news and headline pieces. Everything not played here is **not read**, including the other nine address kinds, every later Journal week, every other scene and every other story kind. This grades what played, and passes nothing else.

**The blind readers' raw scores.** Each of three Opus readers graded all 224 numbered lines of nine places: the three real lives above and six places of the owner's own played or graded lines mixed in unmarked (his round-8 Meadow, a page-1 Greeley, a Nov 12 life, and older good lines). Lines passed of 224: 83, 82 and 58. Raw verdicts, never changed toward a pass except where the owner's own words pass that exact line, quoted below.

| Class of his fail                          | Plants                            | Caught (of 3 readers)                                                                                |
| ------------------------------------------ | --------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Says the policy's name (1)                 | 2.16                              | 3 of 3                                                                                               |
| Quip, composed line (2)                    | 2.5, 2.7, 4.5, 4.12               | 2.5 and 2.7: 3 of 3; 4.5 and 4.12: 1 of 3                                                            |
| Narration repeats the screen (3)           | 2.7, 4.26                         | 2.7: 3 of 3; 4.26: 1 of 3                                                                            |
| Replies give one answer (4)                | 2.23 to 2.28                      | the set: 2 of 3 (B passed the set, failed the answer 2.28)                                           |
| A reply that doesn't fit (5)               | 2.17 to 2.20, 4.16 to 4.25        | the Meadow set: 3 of 3 (as a recurring set); 4.19 "You'll come around, Samantha. Or I will.": 0 of 3 |
| One skeleton (6)                           | 4.7 to 4.9                        | 4.8 and 4.9: 3 of 3; 4.7: 2 of 3                                                                     |
| A word that points at nothing (7)          | 4.10, 4.11                        | 3 of 3                                                                                               |
| Same line in every life (8)                | 2.3, 6.3, 7.3, 4.29               | 3 of 3                                                                                               |
| People the player can't place (9)          | 4.3, 4.11                         | 3 of 3                                                                                               |
| Jump with no bridge (12)                   | 4.4, 4.6, 4.13                    | 3 of 3                                                                                               |
| Developer talk in loading steps (13)       | 4.1                               | 3 of 3                                                                                               |
| Narration contradicts the scene (11)       | 4.14                              | 0 of 3, but the plant had no scene before it, so it proves nothing                                   |
| A list of facts where a story belongs (10) | the Meadow Journal and news lines | read as facts by all three                                                                           |

**The readers are too strict on his passes.** Of eight lines he passed (2.14 arrival "That's fine.", 2.17 "Same here, Mom." okay, 4.17 "I don't mind that reply", 4.22 "a fine response", 8.1 "Thank you all for being here." fine, 8.2 "Thank you very much.", 8.3 "Mr. Chair, I rise to speak briefly in gratitude today." fine, 9.1 "Appointing the cabinet"), the three readers passed 4.22 only (3 of 3) and 8.2 once. That is a grader that fails what he passes. It says nothing about the classes above, which it catches. A fail is still a fail below, except for the overrides.

**Overrides by his words (rule 11).** One. The arrival line "It's the evening of January 20. The news replays President X's noon speech." (1.14, 3.15, 5.15): the readers fail it as the same line in every life; he passed it ("That's fine.") in a packet where it was in all six lives. It passes.

## Failing lines by batch

Majority verdict (2 or 3 of 3 readers). A reason that cites a repeat in a place that is not one of the three real lives is dropped; what is left is shown. Rule ids are from `data/english/line-rules.json`.

### Loading and person history (#10707): 8 lines fail

- **1.1** "Steps: Building the town / Writing everyone's past / Opening the economy / Starting the world / Seating the government / Opening the elections / Opening the budgets / Sea": vary-the-shape: the same loading step list comes back word for word in 3.1 and 5.1 (and almost word for word in 2.1)
- **1.3** "told: You were born in 2007, under a Republican president.": vary-the-shape: "You were born in YEAR, under a X president." comes back in 3.3 and 5.3
- **1.5** "told: By 2012 you were in school in Peoria, learning to read and to wait in line.": vary-the-shape: "By 2012 you were in school in X, learning to read and to wait in line." comes back in 3.5
- **3.1** "Steps: Building the town / Writing everyone's past / Opening the economy / Starting the world / Seating the government / Opening the elections / Opening the budgets / Sea": vary-the-shape: the same loading step list as 1.1
- **3.3** "told: You were born in 2006, under a Republican president.": vary-the-shape: the same line as 1.3
- **3.5** "told: By 2012 you were in school in Napeague, learning to read and to wait in line.": vary-the-shape: the same line as 1.5
- **5.1** "Steps: Building the town / Writing everyone's past / Opening the economy / Starting the world / Seating the government / Opening the elections / Opening the budgets / Sea": vary-the-shape: the same loading step list as 1.1
- **5.3** "told: You were born in 2007, under a Democratic president.": vary-the-shape: the same frame as 1.3

### The address (#10735): 12 lines fail

- **1.9** "Fellow citizens. The oath I just took is one sentence long. Keeping it for four years is the job. Of everything on my list, fair lending has waited the longest, so it goe": vary-the-shape: the "Fellow citizens." opener comes back in 4.4
- **1.12** "Tell me where I am wrong, in writing, and sign it, because America is too big for me to see every corner.": vary-the-shape: the "tell me where I'm wrong / hold me to it" move recurs (2.11, 4.9, 5.12)
- **1.13** "Thank you for being here, and thank you to Vice President Lisa Workman for standing with me today. Thanks, everyone.": address-name-check-does-work: the Vice President is named only to be thanked; the same close comes back in 5.14 and "Thanks, everyone." comes back in 3.14
- **3.9** "Thank you, everyone. I swore to defend the Constitution a few minutes ago, and so did Vice President Kelly Jimenez. My first job is what work pays.": address-name-check-does-work: the Vice President is named only to say he took the oath too; the "Thank you, everyone." opener comes back in 5.9
- **3.10** "I'm thinking today about everyone the storms touched. I'll ask the agencies I run how long a family waits for help, and I'll publish the answer every year of the next fou": Reader rule 5: the speech turns from pay to storms with no bridge; the storms line comes back in 4.6 and 5.11
- **3.12** "Is it time to increase foreign aid? Not while I'm President. I believe families here come before spending overseas.": speech-has-one-theme: foreign aid is off the pay theme. The question-then-"no" shape comes back in 5.10, and "families here come before spending overseas" comes back in 5.12 and 5.21
- **3.14** "Thanks, everyone.": vary-the-shape: the "Thanks, everyone." close comes back from 1.13
- **5.9** "Thank you, everyone. I've sworn to the Constitution, not to a party, and I'll hold to that for four years. I'm putting how we stand with other countries first because wai": vary-the-shape: the "Thank you, everyone." opener comes back from 3.9
- **5.10** "Should we grow defense spending? I don't think so, since our money should go to needs here at home first.": vary-the-shape: the rhetorical question answered "no" comes back from 3.12
- **5.11** "Plenty of families are still waiting to get back home after the storms this past year.": Reader rule 5: storms with no bridge; the storms slot recurs (3.10, 4.6)
- **5.12** "I've believed for a long time that families here come before spending overseas. Send me a bill to increase foreign aid and you'll get it back with a veto. If I get the wi": vary-the-shape: "I've believed for a long time that" comes back from 2.11, and "families here come before spending overseas" comes back from 3.12
- **5.14** "Thank you for being here, and thank you to Vice President Maria Hudson for standing with me today. God bless us.": address-name-check-does-work: the Vice President is thanked only for standing there; the same close as 1.13

### First talk at home (#10745): 7 lines fail

- **1.16** "says: Congress ought to leave this alone, the way the President says.": no-pointing-at-the-unnamed: "leave this alone" never says what "this" is
- **1.18** "reply 2: I think he has that wrong.": no-pointing-at-the-unnamed: "that" has nothing named behind it
- **1.20** "answer: I've always thought a family with poor credit still needs somewhere to borrow.": Reader rule 2 (a reason a person would say out loud): Mom repeats the President's sentence from 1.11 word for word. The "I've always thought" frame comes back in 1.22 and 5.21
- **1.24** "reply 2: You and I both think a full day's work ought to pay enough to live on.": player-never-says-unchosen: the reply repeats the brother's sentence and says what the player thinks for them
- **1.26** "answer: Do the math.": no-non-replies: "Do the math." does not answer "Why say that?" and gives no reason
- **5.17** "says: There's something to what the President said about foreign aid. That's how it looks from Brian Head, and I'm not the only one saying so.": no-pointing-at-the-unnamed: the line never says what the President said about foreign aid, or what "saying so" agrees with
- **5.21** "answer: I've always thought families here come before spending overseas.": Reader rule 2: Dad repeats the President's 5.12 sentence word for word; the "I've always thought" answer frame recurs (1.20, 1.22)

### The Journal (#10706): 11 lines fail

- **1.28** "I was born in Peoria, Arizona in 2007. My mother Jennifer brought me up. My father Aaron lived in another home. My brothers Arthur and Aaron were already here when I was ": vary-the-shape: "were already here when I was born" recurs (3.18)
- **1.30** "When I was 10, we left Arizona for Hinton, West Virginia in 2017. We had left Arizona behind.": The second sentence says the first one again ("We had left Arizona behind.")
- **1.31** "When I was 10, I started at Hinton Public Schools.": vary-the-shape: "When I was N, I started at X Public Schools" recurs (2.31, 3.19, 5.24); "When I was 10" twice in a row
- **1.33** "I turned eighteen.": journal-entry-has-story-around-it: a bare event with nothing around it; it comes back in 5.26
- **1.35** "The President made the case that a family that needs cash fast can still find a lender willing to make the loan. The speech came back to fair lending more than once. I wo": vary-the-shape: "The speech came back to X more than once" comes back in 3.21, and "The President made the case that" comes back in 5.28. "I would want" is stiff and in the wrong tense
- **3.18** "I started out in Napeague, New York. My father Michael and my mother Casey kept a separate home. My sister Ashley was already here when I was born.": Reader rule 4: "kept a separate home" does not say literally who lived where or who raised the player
- **3.19** "Back when I was 5, I started at Napeague Public Schools.": vary-the-shape: "Back when I was 5, I started at X Public Schools" comes back in 5.24
- **3.21** "I stayed for all of Samuel Roberson's speech, by myself. The speech came back to pay for a day's work more than once.": vary-the-shape: "The speech came back to X more than once" comes back from 1.35
- **5.24** "Back when I was 5, I began school at Brian Head Public Schools.": vary-the-shape: the same line as 3.19
- **5.26** "I turned eighteen.": journal-entry-has-story-around-it: a bare "I turned eighteen.", the same as 1.33
- **5.28** "We all watched Debbie Schmidt's speech together tonight. The President made the case that we already spend more on defense than the next several countries together. Most ": The journal says the President made a defense-spending claim the speech never made. The "The President made the case that" and "mostly about" frames recur (1.35, 2.34)

### The news (#10721): 34 lines fail

- **1.36** "Story: New York puts Consumer Data Privacy Act into effect (Liberty News Network)": news-comes-from-a-record: a New York law story in a West Virginia town, printed by five outlets
- **1.37** "paragraph: New York began living under the Consumer Data Privacy Act on January 15, 2025.": news-reads-as-a-story: the headline restated as the body
- **1.38** "paragraph: The law concerns control over the personal data that businesses collect.": policy-said-by-people-not-the-catalog: a catalog description; it repeats in 1.48 and 1.51
- **1.39** "Story: New York puts Consumer Data Privacy Act into effect (Lodestar News Network)": The same story again, from a second outlet
- **1.40** "paragraph: The Consumer Data Privacy Act is in effect in New York as of January 15, 2025.": news-reads-as-a-story: the headline restated
- **1.41** "paragraph: It is about control over the personal data that businesses collect.": Catalog description repeated; "It" leans on the headline
- **1.42** "Story: New York puts Consumer Data Privacy Act into effect (The Porchlight)": The same story again, from a third outlet
- **1.43** "paragraph: The Consumer Data Privacy Act took effect in New York on January 15, 2025.": news-reads-as-a-story: the headline restated
- **1.44** "paragraph: It is about control over the personal data that businesses collect.": Word for word the same as 1.41
- **1.45** "Story: Meet Mary Patrick (The Porchlight)": news-reads-as-a-story: a headline with no body; Mary Patrick is never said to be anyone
- **1.46** "Story: Consumer Data Privacy Act starts (The Federal Courier)": The same story again, from a fourth outlet
- **1.47** "paragraph: In New York, the Consumer Data Privacy Act has been the rule since January 15, 2025.": news-reads-as-a-story: the headline restated
- **1.48** "paragraph: The law concerns control over the personal data that businesses collect.": Word for word the same as 1.38
- **1.49** "Story: Consumer Data Privacy Act begins in New York (Town Square Show)": The same story again, from a fifth outlet
- **1.50** "paragraph: New York put the Consumer Data Privacy Act into effect on January 15, 2025.": news-reads-as-a-story: the headline restated
- **1.51** "paragraph: The law concerns control over the personal data that businesses collect.": Word for word the same as 1.38
- **3.25** "Story: Estate tax rate was signed into law on November 30, 2024.": bill-called-by-what-people-call-it: the headline is a catalog name with no article, and the sentence is repeated as the body
- **3.26** "paragraph: Estate tax rate was signed into law on November 30, 2024.": news-reads-as-a-story: the headline repeated word for word as the body
- **3.27** "Story: Social Security tax rate was signed into law on November 30, 2024.": bill-called-by-what-people-call-it: the same catalog-name headline frame as 3.25
- **3.28** "paragraph: Social Security tax rate was signed into law on November 30, 2024.": news-reads-as-a-story: the headline repeated word for word
- **3.33** "paragraph: Barry Allen was chosen District 1 legislator on November 5, 2024 with 57 percent of the vote.": vary-the-shape: 3.36 has the same sentence with the same 57 percent
- **3.34** "paragraph: Seven ballots were cast.": "Seven ballots were cast" for a district legislator race is not believable; the count is the same as 3.37
- **3.35** "Story: Olson wins District 2 legislator": headline fragment ("wins District 2 legislator")
- **3.36** "paragraph: Carlos Olson was chosen District 2 legislator on November 5, 2024 with 57 percent of the vote.": vary-the-shape: the same sentence and figure as 3.33
- **3.37** "paragraph: Seven votes were counted.": The same seven-vote count again; not believable
- **5.29** "Story: The Budget Ordinance gets a yes from the Iron County Commission (KGEG-TV)": vary-the-shape: the same headline comes back in 5.31
- **5.30** "paragraph: The Budget Ordinance came out of the Iron County Commission on January 1, 2025 with a 7 to 0 vote behind it. Not one no vote was cast on the Budget Ordinance i": The second sentence says the first one again
- **5.31** "Story: The Budget Ordinance gets a yes from the Iron County Commission (Brian Head Register)": The same headline as 5.29, from a second outlet
- **5.32** "paragraph: Donald Yates's Budget Ordinance passed the Iron County Commission, 7 to 0, on January 1, 2025. All the members who voted in the Iron County Commission were for": The second sentence says the first one again
- **5.33** "Story: Cooper Manufacturing opens for business (Brian Head Register)": vary-the-shape: the same business-opens frame as 2.41 and 2.44
- **5.38** "paragraph: Police in Brian Head saw more break-ins this month than the month before.": vary-the-shape: the same sentence as 2.48
- **5.39** "paragraph: Vandalism climbed too.": vary-the-shape: the same follow-on as 2.49
- **5.43** "Story: First day for Anti-Discrimination Repeal Act in the U.S. Virgin Islands (Bulwark News Network)": news-comes-from-a-record: news from the Virgin Islands in a Utah town, and "First day" contradicts a law in effect since December
- **5.45** "paragraph: It is about an end to the ban on discrimination in housing and work.": policy-said-by-people-not-the-catalog: "It is about an end to the ban..." is a catalog description

**Not graded, and why.** The packet script's own notes are not game text: the "Kind: ..." heading of each address (1.8, 3.8, 5.8), the speaker cards with an empty "()" (1.15, 1.21, 5.16) and "nobody in the household has anything to say" (3.16). Eight more fails (1.10, 1.17, 1.22, 5.25, 5.34 to 5.37) rest only on a repeat in one of the mixed-in places, which proves nothing about the three lives, so they are not counted either. The empty "()" is worth one look from Story: if a card shows it as played, a relationship label is missing.

## Failing reply sets (the three real lives)

- **1.16 to 1.20.** The mother's line leans on "this" and "that" with nothing named behind it ("Congress ought to leave this alone"), so both replies agree or disagree with an unnamed thing; the answer (1.20) is the President's own sentence from the address, word for word. Reader rule 2 (a reason a person would say) and `no-pointing-at-the-unnamed`.
- **1.22 to 1.26.** The brother's line is about wages after an address about fair lending, so it comes from nowhere; reply 2 (1.24) repeats his sentence back and speaks for the player (`player-never-says-unchosen`); the answer "Do the math." (1.26) is a non-reply (`no-non-replies`).
- **5.17 to 5.21.** The father's line never says what the President said about foreign aid; the answer (5.21) is the President's own sentence again, with the same "I've always thought" frame as 1.20 and 1.22.

## Failing slots across the three real lives

- The loading step list is the same in all three (1.1, 3.1, 5.1); only the town changes in the finished steps. (The step list is also what the owner said must be short, dry and about what the game builds; whether this list is that is his ear to say.)
- "You were born in YEAR, under a X president." (1.3, 3.3, 5.3) and "By 2012 you were in school in X, learning to read and to wait in line." (1.5, 3.5). The first is his class 8 ("You were born in 2000 again"); the second is a quip ("learning to read and to wait in line") in the life story, which he wants plain.
- "Thank you for being here, and thank you to Vice President X for standing with me today." (1.13, 5.14); "Thank you, everyone." opens two addresses (3.9, 5.9).
- The address's storms line with no bridge (3.10, 5.11), the question answered "no" (3.12, 5.10) and "families here come before spending overseas" (3.12, 5.12).
- "I've always thought ..." as the answer (1.20, 1.22, 5.21), each the President's sentence back.
- The Journal: "Back when I was 5, I started at X Public Schools" (3.19, 5.24), "I turned eighteen." (1.33, 5.26, a bare event), and the speech entry's frames: "The President made the case that" and "The speech came back to X more than once" (1.35, 3.21, 5.28). 5.28 says the President made a defense-spending claim the speech never made (5.28 against the address 5.10: the address said the opposite).
- The news: one story printed by five outlets with the same catalog sentence under it ("The law concerns control over the personal data that businesses collect.", 1.36 to 1.51, three outlets word for word); a headline restated as its own body (1.37, 1.40, 1.43, 1.47, 1.50, 3.26, 3.28); "Seven ballots were cast." for a district race, twice, with the same 57 percent (3.33 to 3.37); a story with a headline and no body (1.45 "Meet Mary Patrick"); stories from a state or territory the town is not in with no tie to the town (1.36 to 1.51, 5.43).

## What passed

Majority pass in the three lives: 1.7, 1.11, 1.19, 1.23, 1.25, 1.27, 1.29, 1.32, 1.34, 3.7, 3.11, 3.13, 3.17, 3.20, 3.22, 3.23, 3.24, 3.29, 3.30, 3.31, 3.32, 5.5, 5.7, 5.13, 5.18, 5.19, 5.20, 5.22, 5.23, 5.27, 5.40, 5.41, 5.42, 5.44. The arrival lines 1.14, 3.15 and 5.15 pass by the override above, and the loading year cards (1.2, 1.4, 1.6, 3.2, 3.4, 3.6, 5.2, 5.4, 5.6) are headings. Passing means "no reader found a reason", not that he would pass it.

## Test gaps to send Story

- `vary-the-shape` and `news-reads-as-a-story` are `awaiting-test`: nothing fails a headline restated as its body, the same sentence under five outlets' headlines, or a slot that comes back in every life. The sameness gate (`scripts/sameness/gate.ts`) needs its recorded inputs (`scripts/sameness/inputs/*.jsonl`) and was not run for this read.
- The line "Seven ballots were cast." has no test: a count that cannot be a real race's.

## What this read did not do

No "before" packet on the same seeds (the batches' own before-and-after is Story's to post). The sameness gate and the draw count were not run. Three drawn places were checked by hand, not by a script that draws them. The reader session was Sonnet 5.5 with Opus readers, not an Opus pre-grader (`pre-grade`, rule 10). The grades are "pre-graded", never his pass.
