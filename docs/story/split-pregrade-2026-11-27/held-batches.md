# Story's held batches, read by a session that wrote none of them (Nov 27, 2026, 5 p.m.)

Past and Day One. Nothing here edits a line, and no new wording is suggested. How each batch was read is stated per batch; "not read" means exactly that.

## W2 #10812 (the filing counter), head 91c0fd65f3, read at three drawn places

Played with the PR's own `scripts/story/filing-packet.mts` (run seed `pg27`, three drawn places: Kingston, New Mexico, a U.S. Senate race; Bennettsville, South Carolina, a council seat; Walland, Tennessee, a state House special). The head conflicts with fold2/nov27 in `data/english/parts/scene-talk.json` and four judged files (fold2 changed the same banks); for the read I took W2's side of those files. **Story needs to merge fold2 into #10812 before it can fold.** Three blind Opus readers graded all 135 numbered lines of a nine-place packet, the three real visits (44 lines) plus six places of the owner's own graded lines mixed in unmarked. Raw scores: 51, 49 and 35 lines passed of 135.

**Calibration (better than the first read, still a filter):** he-fails caught by all three readers: the policy named by its name, the "That's how the state says hello" quip, "You were born in 2006, and nobody asked you first" in three lives, the work-reply set as a set (all three flagged 2.19 to 2.22), the one-skeleton lines, "make it last and to reach people it has not reached yet", "Come to do this work with our eyes open", a jump with no bridge, the storms line, and the repeated "It's hard to think about the race". Missed or split: "It's January 2025" (2 of 3), the non-reply answer "I'll check on you again this morning" (0 of 3). His passes: the arrival line and "No argument from me, Logan." were passed by all three; "Thank you all for being here." by one of three. So this read passes what he passes in two of three tested cases; it is not the skill's full regression, which I did not rerun.

**Fails in the three real visits, by reason (all three readers unless marked):**

- **A date with its year said aloud** (`no-year-in-speech`): "June 2, 2026", "November 3, 2026", "February 3, 2026" in the clerk's lines and in the replies offered (1.4, 1.5, 1.8, 1.13, 1.15); the petition narration also carries a dated deadline (1.11, 3.11, 5.11, `no-day-or-place-in-narration`).
- **The petition narration speaks as the clerk** ("Have you run a campaign before, or should I walk you through it?") and is not narration (1.11, 3.11, 5.11).
- **The same frame in every visit** (`vary-the-shape`): the opener "If you're running in X, you're in the right spot" (1.1, 3.1, 5.1); "Alright, X. Let's get the papers for Y done." as the first reply of every set; "Good to know. File me for Y anyway." and "I'll sleep on that, X, and come back before…" (3.8, 5.8); "Done. Your name goes on the list for Y next to Z's." (1.10, 3.10, 5.10); "There's no primary for this one. Everyone who files goes straight onto the ballot" (3.4, 5.4); the petition reply sets with "I'll handle Y myself" (1.12, 5.12) and the clerk's "the law sets the number and the day" (1.15, 5.15).
- **"Who else is running?" is answered with only the first filer**, even where six have filed and the clerk had just named one (1.7, 3.7, 5.7; the PR itself lists this as unfixed): `reply-follows-the-line-before`. "Next to Jessica Scott's" when six filed (1.10).
- **A reply asks what the clerk just said** (3.6 "Has anyone else filed" right after "two candidates so far, Melissa Chan filed first yesterday"; 5.6 "Is the state House in the 8th District contested, or am I walking into it alone?" right after "four candidates").
- **Developer words in the clerk's title** (5.1): "Michael Pickett, with the State Election Commission (original) and Coordinator of Elections (duplicate)." A data label from the filing office's records reaches the player; `no-developer-words`.
- **A set of one reply** (5.2): no choice offered.
- **Not literal or not said by a person:** "Doors first: signatures come one neighbor at a time… a way to reach the voters who don't answer for the U.S. Senate" (1.14); "The U.S. Senate ought to have a real choice." (1.9); every petition reply bolts on the office name ("I'll handle the U.S. Senate myself", 1.12); "Is the field in Kingston stacked before I even file?" for a statewide race (1.5); "See you on November 4" (3.13).
- **What passed** (majority): the opening names who the clerk works for, the first pick of a race, and the clerk's leave line; a count of 44 real lines, 35 failing by all three readers, 3 by two, 6 passing in all three.

**Not run:** the batch's own claim "red before, green after" tests; no browser view of the counter (the PR says the same).

## Liked-lines batches #10819, #10837, #10839, #10840, #10854 and #10856 (W5): mechanical read, then a read of the changed ones

Read from the PR heads against fold2/nov27: each new row of `restored-liked-lines.json`, the piece its `parts` key names, and whether any existing piece's text changed.

- **No existing line was edited** in any of the six (0 text changes among the pieces both sides hold). Every `parts` key resolves to a piece.
- **Meaning kept (the piece is the graded line with an insert added, nothing else):** most rows. Examples: "Is now a bad time?" to "Is now a bad time to talk about {bill}?"; "Sorry to bother you." to "Sorry to bother you about {bill}."; "Thank you all for being here." to "Thank you all for being here in {place}." (W5); "Then I'll find a candidate who listens." to "…listens on {bill}." (#10819).
- **The piece says more than he graded** (an insert was added and a commitment came with it; the CTO's 9:06 a.m. ruling allowed "a piece that says the same thing"):
  - "How could I say no?" now "How could I say no? I'll take {office}." and "I slept on worse. Fine. Yes." and "When you put it like that, yes." now end "I'll take {office}." (#10839).
  - "Alright." now "Alright. I'll see about {office}." (#10839): a bare acknowledgment now promises something.
  - "Not for any price." now "Not for any price, and not on {bill}." (#10839).
  - "You know how this works." now "You know how this works, and {bill} is no exception." (#10837).
- **The wording changed, not only the insert** (a read for Story and the CTO, since he graded the old words):
  - "Even then. It's the right call." is now "Even if it costs me votes. {bill} is the right call." (#10837).
  - "This is a two-way street. I'll need your vote on mine." is now "This is a two-way street. You get my vote on {bill} when I get yours on mine." (#10837).
  - "We have it on the record." is now "{outlet} has it on the record." (#10837); "I won't forget this." is now "I won't forget how you vote on {bill}." (#10837).
  - "Then say we didn't buy it. We knocked it, door by door." is now "…We won {office} door by door." (#10839): "knocked it" became "won an office", a different claim.
  - "A thank-you doesn't weigh that much. Take it back." and "A thank-you is a card. This is not a card." are now "…weigh {bribe-weight}…" and "{bribe-weight} is not a card." (#10839): the slot's value decides whether they still say what he graded.
  - "Let me sleep on it. I'll call you Tuesday." is now "Let me sleep on {office}…"; "Let me sleep on it before I answer." is now "Let me sleep on that cut of {cut} before I answer." (#10839).
  - "Then let me answer it on the record." is now "Then let me answer {outlet} on the record." (#10837).
- **#10840** (one row): "I had no job after {lost_employer}." says exactly what was graded under a new key; it passes.
- **Not run:** the three-place play check for these (the scenes need a donor, press or bribe talk to fire in a played world; `scripts/words/donor-walk.ts` and `bribe-walk.ts` exist and were not run).

## W1 #10793 (ten elements), head a8555be49a: mechanical read

All ten element files carry `issues: ["none"]`, sources with a URL and a real headline, a summary and a `realLife` paragraph. None names a real person or quotes real words. Passes the element rules in the writer-spec as far as they can be checked without a play. (Not a words batch: no line plays from it.)

## W3 #10868 (played packets for the door, the donor's call and the vote ask), head bcd9023525: read by me alone, not blind

I read the three packets (Hinton WV donor call, Bardolph IL door, Longwood FL vote ask). Findings:

- **Door (Bardolph):** the talk with Wendy Fowler is the stretch he failed on Nov 24 ("I haven't been well. I can't think about the race… right now." / "How are you feeling? The race… can wait." / "I haven't been well. It's hard to think about the race…"), with the same repeated "I haven't been well" inside one talk: class 8. "Apartments in single-family neighborhoods. We own here, and others should get the same chance." is said by someone whose recorded stand is "say no to apartments in single-family neighborhoods": the line contradicts the record.
- **Donor (Hinton):** the employer slot is filled with "the Buyers and sellers outside the town" (a market, not an employer): "Have someone from the Buyers and sellers outside the town bring it to my office", "People at the Buyers and sellers outside the town are counting on you". The bill is called by its formal name ("the Transit First Funding Ordinance") in nearly every line (`bill-called-by-what-people-call-it`). The packet's second read of the same gift as "$9,000,000" says "puts $9,000,000 on the record as a gift between friends": an amount nobody would say as a gift between friends.
- **Vote ask (Longwood):** reads as talk; the replies take stances with reasons; the leave reply "I can't stay on HB 11 any longer." is a non-reply.
- **The player in the door packet is a television reporter** (`person:press:outlet:television…:reporter:0`) filing for office: not a words defect, an engine one, for World.
- **Not run:** the three-place check beyond the PR's own three packets.

## The W6 stack #10857, #10859, #10861, #10862, #10864, #10865, #10866, #10873, #10877, #10880: mechanical read, with a small fit read

Compared to the base of each pull request, over the same bank file: **no piece's text changed in any of the ten** (0 of about 2,800 pieces), every element id a piece now cites exists in the element bank, and the only change to a piece is its `elements` list (146, 156, 488, 455, 394, 391, 381, 241, 149 and 282 pieces tied). The fit of a cited element to its line was read on six random pieces per batch (sixty), not on the rest. Findings from those sixty:

- Weak ties: "What would it take on {cause}?" cites `member-asked-for-a-vote-stays-undecided-until-the-floor` (a vote, not a cause) (#10877); "The rent bill has grown {change-rent} since this term started." cites `a-cashier-says-we-deserve-a-fair-wage` (#10865); "{measure} went into force in {place} on {date}." cites `warehouse-fills-while-textile-buyers-retreat` (#10880); "Our roads has slipped {change-roads} since I came in." cites a road-funding plan element and the sentence itself is ungrammatical ("roads has") (#10865).
- No piece quotes a real person's words in the sample. **Not read:** the other ~2,700 ties.

## #10813 (the scene-gaps list)

Closed on GitHub; it is a script and a generated list, not words. Not read.

## Addendum, 5:25 p.m.: the donor and bribe walks at three drawn places for #10839 and #10837

`scripts/words/donor-walk.ts` and `bribe-walk.ts` (seed `pw27`, labels a, b, c: Newcastle OK, Waimea HI, Manitou KY, and Yorktown IN for the donor walk; the donor walk skipped one place for "no council or board race open for filing") were run on the heads of #10839 and #10837. Of #10839's 30 restored lines, three played in those walks: "Can we close the door? It's about Ordinance 2025-19." (4 times), "I'll keep this short. It's about Ordinance 2025-3." and "I wanted to thank you in person about Ordinance 2025-3." All three read as the graded line plus a plain insert, and the bill is called by its formal name ("Ordinance 2025-19"), which `bill-called-by-what-people-call-it` asks people not to do. The restored "Alright. I'll see about {office}." did not play (its walks only played the older "Alright." close). **None of #10837's 23 restored lines played** (its press-comment and confirm-vote lines are not reached by these two walks), so for #10837 and the remaining 27 of #10839 the three-place play check was not run.
