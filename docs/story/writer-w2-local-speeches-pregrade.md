# Pre-grade: Writer W2, local and campaign speeches (opening-speech.json)

Pre-grader, 2026-11-24. Branch `story/w-stand-close` at `8416afbf`, `data/english/parts/outline-local.json`, every line authored by this writer at that head (169 lines). Verdicts carry over by exact text from earlier heads; lines not judged before were read new.

- **Result:** 165 of 169 pass (98%); 4 fail.
- **Calibration:** C4 8/8, E3 8/8, F1 8/8, MA 8/8, MB 8/8, NB 8/8, NC 8/8, ND 8/8, NE 8/8, NF 8/8, NG 8/8, PA 8/8, R1 8/8, S3 8/8, V1 8/8, W1 8/8. Each reader's chunk had 8 of the owner's graded lines (4 passed, 4 rejected) planted unmarked; a chunk that missed one would have been rerun.
- **Read by:** one blind reader per chunk of about 150 lines (Opus, medium), then the Pre-grader read every verdict against `data/english/line-rules.json`, `notes-not-rules.json`, the owner's grades and `OWNER-DECISIONS.md`.
- **Played:** at `8416afbf` through `scripts/words/speech-sheets.ts` (the local head's address and a town member's campaign speech in its three drawn places: Rainelle, Midway, Washington County): 34 of these lines played.
- Fails quote the line and give his rule or words; no new wording is suggested.

## story/no-leave-moves at `8700a973` (newest): the {to} lines, read as played, PRE-GRADED

My own read, not a blind reader's. Pre-graded, not his pass; his grading page is the gate. It covers:
- the 56 opening-speech `ask` lines with {to};
- the 8 outline-local {to} lines;
- the speech sheets played at this head (`scripts/words/speech-sheets.ts`): Rainelle (5466652, 2f25fb7e), Midway (4949820, af873500) and Washington County (2409400, eb7bf596), each with an inaugural, a governor's address, a local head's address and a town campaign speech;
- every {to} fill in `question-names.json` (94 questions), checked inside each sentence frame.

### What played

None of the 56 opening-speech ask lines drew in these three worlds. These outline-local {to} lines played:
- PASS: "I'll push to do more to care for our creeks and woods at every meeting." (Rainelle address)
- PASS: "I want us to do more to care for our creeks and woods." (Midway address)
- PASS: "I'll push to fix up our parks at every meeting." (Midway address)
- PASS: "Is it time to give civilians oversight of the police? No, because…" (Washington County address)
- PASS: "I can't back the push to require affordable units in new buildings, since…" (Washington County campaign)
- **FAIL, as played:** "Some of you will want to allow apartments in single-family zones, and I understand why. I'm against any bill to allow apartments in single-family zones." (Rainelle campaign). The {to} phrase is said twice in two sentences (`vary-the-shape`), and a city council passes ordinances, not bills.
- **FAIL, as played:** "I'll vote against any bill to guarantee tenants a lawyer in eviction cases, every time it comes up." (Rainelle campaign). "Bill" again, from a council member.

### What fails on every fill (checked against all 94 questions)

1. **{side} repeats {to}.** In `question-names.json`, `for` is word for word the same as `to` for all 94 questions. So every stance-for line that has both slots says the phrase twice, for example: "I support the bill to raise the minimum wage, so I ask the Groton Select Board to raise the minimum wage before the year is out." That covers all 20 "…the bill to {to}…, … to {side}…" / "…let's {side}…" lines (support, want, back, for, in favor of, behind, stand for, and "On the bill to {to}, I ask {body-name} to {side}"). FAIL.
2. **"The bill to {to}" claims a bill that no record holds.** Those lines require only `law-not-in-force`, not a bill on file, so "the bill" points at a bill that may not exist. Same 20 lines (`every-line-gives-its-context`, false for its facts).
3. **"Bill" in a town address or a town campaign speech.** A town body passes ordinances; the bank's own `{measure}` lines exist for this. FAIL for town use:
   - "I'm against any bill to {to}. I'll ask {body-name} to vote it down.";
   - "I oppose any bill to {to}, and I ask {body-name} to reject it.";
   - the two with {belief};
   - all the town-address "the bill to {to}" lines;
   - outline-local "I'll put my name on every bill to {to}.", "I'll vote against any bill to {to}, every time it comes up." and "I'm against any bill to {to}.".
   The state-of-the-state and State of the Union "bill" lines are right.

### To check, not graded

- **Budget-line fills in against-lines.** Fills such as "fix our roads", "fund the clinic and the hospital" and "fix up our parks" read as goods, so "I'm against any bill to fix our roads" would be absurd. Check whether a `budget-line:*` question can reach a stance-against {to} line. If it can, those fills fail there.

### Pass on the fills

The stance-against State of the Union and state-of-the-state lines read cleanly with every non-budget fill: "I will not sign a bill to {to}.", "Don't send me a bill to {to}. I won't sign it.", "I'm against any bill to {to}, and I'll veto it." and the {measure} family ("Any {measure} to {to} gets a no from me."). So do "I ask Congress to {to} this year." and "I'm asking the legislature to {to}, and I'm not letting up.".

Seen in play, not W2's line, for the Story lead: Maryland's governor says the same reason twice in one paragraph ("No citizen should be turned away from the polls for lacking the right card. For me, any plan to require photo ID to vote fails on one point: no citizen should be turned away from the polls for lacking the right card.").

## #10390 at `1ca359b2` (newest): W2's 32 budget-line stand lines, 19 of 32 pass

- Read blind in chunk Q1 on the owner-calibrated reader: 13 of his own bad lines planted (all failed) and 6 good (all passed).
- **Why they fail:**
  - bare holds and noes with no reason ("I'd hold the road budget… where it is.");
  - the budget's catalog name said aloud ("corrections", "natural resources spending");
  - a "last round" or "last increase" the record may not hold;
  - "other needs" that names nothing.
- **What passes:** a concrete stake and a plain stand ("Everyone in {realm-name} has hit the same pothole. I'm for putting more into the roads.").
- Not played.

- FAIL `outline-local.stand.more-money-for-the-police-in-isn-t-the-answer-on-its-own-i-d-say-no-to`: "More money for the police in {realm-name} isn't the answer on its own. I'd say no to the increase." — no-stock-phrases: "Isn't the answer on its own" is a stock phrase and "the increase" points at a proposal the line never names, so it argues nothing.
- FAIL `outline-local.stand.i-m-not-for-spending-more-on-assistance-in-before-we-fix-who-it-reache`: "I'm not for spending more on assistance in {realm-name} before we fix who it reaches." — every-line-gives-its-context: "Fix who it reaches" is unclear: the listener can't tell whether it reaches too many, too few or the wrong people.
- FAIL `outline-local.stand.assistance-spending-in-has-grown-enough-i-d-say-no-to-more`: "Assistance spending in {realm-name} has grown enough. I'd say no to more." — address-argues-not-announces: A bare assertion that spending "has grown enough" with no why, and it claims growth the record may not show.
- FAIL `outline-local.stand.what-we-leave-in-for-our-kids-starts-with-its-water-i-m-for-putting-mo`: "What we leave in {realm-name} for our kids starts with its water. I'm for putting more into it." — no-literary-phrasing: An epigram ("what we leave... starts with its water") and the closing "it" could be the water or the kids.
- FAIL `outline-local.stand.i-m-not-for-spending-more-on-natural-resources-in-while-the-roads-go-u`: "I'm not for spending more on natural resources in {realm-name} while the roads go unfixed." — bill-called-by-what-people-call-it: Speaks the budget catalog name "natural resources" aloud, and its roads-first reason twins the parks line.
- FAIL `outline-local.stand.i-d-say-no-to-more-natural-resources-spending-in-this-year`: "I'd say no to more natural resources spending in {realm-name} this year." — bill-called-by-what-people-call-it: Catalog name "natural resources spending" in speech and a bare no with no reason.
- FAIL `outline-local.stand.i-d-hold-the-parks-budget-in-where-it-is`: "I'd hold the parks budget in {realm-name} where it is." — address-argues-not-announces: A bare hold-the-line with no reason, the same shape as the road-budget line.
- FAIL `outline-local.stand.i-m-not-for-more-housing-spending-in-until-we-see-what-the-last-round-`: "I'm not for more housing spending in {realm-name} until we see what the last round built." — false for its facts: Asserts a "last round" of housing that built something, which the record may not hold, and repeats the wait-and-see shape of the police and schools lines.
- FAIL `outline-local.stand.more-money-for-the-schools-in-isn-t-what-i-d-vote-for-this-year`: "More money for the schools in {realm-name} isn't what I'd vote for this year." — address-argues-not-announces: A bare no with no reason; it announces instead of arguing.
- FAIL `outline-local.stand.i-m-not-for-spending-more-on-roads-in-while-other-needs-go-short`: "I'm not for spending more on roads in {realm-name} while other needs go short." — a stance that points at nothing named: "Other needs" names nothing, so the listener can't tell what the speaker would fund instead.
- FAIL `outline-local.stand.i-d-hold-the-road-budget-in-where-it-is`: "I'd hold the road budget in {realm-name} where it is." — address-argues-not-announces: A bare hold-the-line with no reason, the same shape as the parks line.
- FAIL `outline-local.stand.people-leaving-jail-in-need-a-way-back-i-m-for-putting-more-into-corre`: "People leaving jail in {realm-name} need a way back. I'm for putting more into corrections." — bill-called-by-what-people-call-it: Says the catalog name "corrections" aloud, and the reentry reason does not match money for running the jail.
- FAIL `outline-local.stand.i-d-say-no-to-a-bigger-corrections-budget-in-this-year`: "I'd say no to a bigger corrections budget in {realm-name} this year." — address-argues-not-announces: A bare no with the catalog name "corrections budget" and no reason.
- PASS `outline-local.stand.officers-in-are-stretched-thin-i-d-put-more-money-into-the-police`: "Officers in {realm-name} are stretched thin. I'd put more money into the police."
- PASS `outline-local.stand.people-in-want-an-officer-who-gets-there-fast-i-m-for-paying-for-more-`: "People in {realm-name} want an officer who gets there fast. I'm for paying for more of them."
- PASS `outline-local.stand.i-m-not-for-adding-to-the-police-budget-in-until-we-know-what-the-last`: "I'm not for adding to the police budget in {realm-name} until we know what the last increase bought."
- PASS `outline-local.stand.neighbors-in-are-one-bad-month-from-asking-for-help-i-d-spend-more-on-`: "Neighbors in {realm-name} are one bad month from asking for help. I'd spend more on assistance."
- PASS `outline-local.stand.families-in-shouldn-t-lose-their-coverage-over-paperwork-i-m-for-putti`: "Families in {realm-name} shouldn't lose their coverage over paperwork. I'm for putting more into assistance."
- PASS `outline-local.stand.the-land-and-water-of-are-worth-protecting-i-d-spend-more-to-look-afte`: "The land and water of {realm-name} are worth protecting. I'd spend more to look after them."
- PASS `outline-local.stand.every-family-in-should-have-a-park-within-walking-distance-i-d-spend-m`: "Every family in {realm-name} should have a park within walking distance. I'd spend more on parks."
- PASS `outline-local.stand.the-ball-fields-and-trails-in-are-worn-down-i-m-for-putting-money-into`: "The ball fields and trails in {realm-name} are worn down. I'm for putting money into them."
- PASS `outline-local.stand.i-m-not-for-spending-more-on-parks-in-when-the-roads-need-it-first`: "I'm not for spending more on parks in {realm-name} when the roads need it first."
- PASS `outline-local.stand.there-aren-t-enough-homes-people-in-can-afford-i-d-spend-more-on-housi`: "There aren't enough homes people in {realm-name} can afford. I'd spend more on housing."
- PASS `outline-local.stand.a-teacher-or-a-nurse-should-be-able-to-live-in-i-m-for-putting-more-in`: "A teacher or a nurse should be able to live in {realm-name}. I'm for putting more into housing."
- PASS `outline-local.stand.spending-more-on-housing-in-won-t-build-a-single-home-by-itself-i-d-sa`: "Spending more on housing in {realm-name} won't build a single home by itself. I'd say no."
- PASS `outline-local.stand.the-classrooms-in-need-more-than-they-re-getting-i-d-put-more-into-the`: "The classrooms in {realm-name} need more than they're getting. I'd put more into the schools."
- PASS `outline-local.stand.our-teachers-in-pay-for-supplies-out-of-their-own-pockets-i-m-for-fund`: "Our teachers in {realm-name} pay for supplies out of their own pockets. I'm for funding the schools better."
- PASS `outline-local.stand.i-m-not-for-adding-to-the-schools-budget-in-before-we-see-how-it-s-spe`: "I'm not for adding to the schools' budget in {realm-name} before we see how it's spent."
- PASS `outline-local.stand.the-roads-in-are-in-worse-shape-every-winter-i-d-spend-more-to-fix-the`: "The roads in {realm-name} are in worse shape every winter. I'd spend more to fix them."
- PASS `outline-local.stand.everyone-in-has-hit-the-same-pothole-i-m-for-putting-more-into-the-roa`: "Everyone in {realm-name} has hit the same pothole. I'm for putting more into the roads."
- PASS `outline-local.stand.the-jail-in-is-crowded-and-understaffed-i-d-spend-more-to-run-it-safel`: "The jail in {realm-name} is crowded and understaffed. I'd spend more to run it safely."
- PASS `outline-local.stand.i-m-not-for-spending-more-on-the-jail-in-i-d-look-at-who-s-in-it-first`: "I'm not for spending more on the jail in {realm-name}. I'd look at who's in it first."

## story/w-stand-close at `059a6d3e` (newest): the 12 issue-first stand lines, 10 of 12 pass

- The 12 lines new since 7dfd9789 (rent stabilization, property tax growth and the minimum wage, two for and two against each). **Calibration (new, Nov 24):** the reader's chunk planted 19 of the owner's own grades: 13 he graded bad today and on Nov 12 (the born, school and "usual problems" loading lines; "So the President wants a higher top income tax rate. I'm glad she said it out loud."; "I'd push back on her there."; the four work replies offered together; "Good. We'll watch what it does to…"; "Go on and enjoy what's left of tonight."; "What do you do?"; "I'll check on you again this morning.") and 6 he graded fine. This chunk (P1) failed all 13 bad lines and passed 5 of the 6 good ones. It counts only because it caught every bad one. Every line was read fresh, with nothing carried from earlier reads.
- Not played.

### Failing lines

- `outline-local.stand.a-cap-on-rents-sounds-kind-but-needs-more-homes-not-fewer-landlords-fi` (stand): "A cap on rents sounds kind, but {realm-name} needs more homes, not fewer landlords fixing them. I'm against it." — AI-sounding: 'Not fewer landlords fixing them' is a composed contrast that does not say what it means.
- `outline-local.stand.i-m-not-for-raising-the-minimum-wage-if-it-costs-the-corner-store-in-i` (stand): "I'm not for raising the minimum wage if it costs the corner store in {realm-name} its only part-timer." — stance-is-plainly-for-or-against: 'Not for... if it costs' is a conditional, not a plain against, and the corner store is a stock image.

### Passing lines

- `outline-local.stand.families-in-shouldn-t-be-priced-out-of-their-own-homes-i-d-cap-how-muc`: "Families in {realm-name} shouldn't be priced out of their own homes. I'd cap how much rent can go up in a year."
- `outline-local.stand.renters-in-should-know-what-next-year-s-rent-will-be-i-m-for-a-cap-on-`: "Renters in {realm-name} should know what next year's rent will be. I'm for a cap on the yearly increase."
- `outline-local.stand.i-d-rather-build-new-homes-in-than-put-a-cap-on-rents`: "I'd rather build new homes in {realm-name} than put a cap on rents."
- `outline-local.stand.no-one-in-should-be-taxed-out-of-the-house-they-own-i-m-for-a-cap-on-h`: "No one in {realm-name} should be taxed out of the house they own. I'm for a cap on how fast property taxes can grow."
- `outline-local.stand.a-neighbor-on-a-fixed-income-shouldn-t-lose-a-home-in-to-a-tax-bill-i-`: "A neighbor on a fixed income shouldn't lose a home in {realm-name} to a tax bill. I'd cap the yearly increase."
- `outline-local.stand.a-cap-on-property-taxes-sounds-good-until-the-plows-and-the-schools-in`: "A cap on property taxes sounds good until the plows and the schools in {realm-name} go short. I'm against it."
- `outline-local.stand.i-won-t-cap-property-taxes-in-and-then-cut-the-services-people-count-o`: "I won't cap property taxes in {realm-name} and then cut the services people count on."
- `outline-local.stand.a-full-day-s-work-in-should-pay-enough-to-live-on-i-m-for-raising-the-`: "A full day's work in {realm-name} should pay enough to live on. I'm for raising the minimum wage."
- `outline-local.stand.people-in-work-full-time-and-still-need-a-second-job-i-d-raise-the-min`: "People in {realm-name} work full time and still need a second job. I'd raise the minimum wage."
- `outline-local.stand.a-higher-minimum-wage-hits-the-small-shops-in-first-i-m-against-it`: "A higher minimum wage hits the small shops in {realm-name} first. I'm against it."

## Play findings (whole speeches, not one line)

- No grammar or fact faults in the six speeches at this head, and the three campaign speeches now close on three different send-offs.
- To check against the seat record: "As your council member, I've worked on the cost of a place to live, and I want to finish the job." (Midway campaign) is true only if the speaker holds the seat; the line's own facts should require that.

## Failing lines by rule

### no-literary-phrasing (2)

- `outline-local.report.you-saw-it-too-was-in-front-of-us-all-year`: "You saw it too: {theme-name} was in front of us all year." — 'You saw it too: X was in front of us all year' is visibly composed colon texture and presumes what the listener saw.
- `outline-local.report.money-was-tight-this-year-and-felt-it`: "Money was tight this year, and {theme-name} felt it." — '{theme-name} felt it' personifies a theme; it says nothing about what the tight money did.

### no-stock-phrases (1)

- `outline-local.report.what-did-do-this-year-a-lot-of-it-was-about`: "What did {realm-name} do this year? A lot of it was about {theme-name}." — A mayor asking what the town did and answering it himself is a canned rhetorical setup that sounds simulated.

### stance-is-plainly-for-or-against (1)

- `outline-local.report.the-books-held-steady-this-year-so-we-could-stay-with`: "The books held steady this year, so we could stay with {theme-name}." — 'Stay with {theme-name}' says nothing clear about what the town did or will do.

## As played

- pass: `outline-local.running.what-brought-me-into-this-race-for-is` → **a town member's campaign speech, 5466652, seed 2f25fb7e, part 1** Hello, neighbors. What brought me into this race for council member is our land and water.
- pass: `outline-local.creed.i-ve-held-the-view-for-years-that` → **the local head's address, 2409400, seed eb7bf596, part 3** I've held the view for years that a call for help should be answered fast. I'll work to give the police department more to work with, and I won't quit at the first no.
- pass: `outline-local.pledge.i-ll-work-to-and-i-won-t-quit-at-the-first-no` → **the local head's address, 2409400, seed eb7bf596, part 3** I've held the view for years that a call for help should be answered fast. I'll work to give the police department more to work with, and I won't quit at the first no.
- pass: `outline-local.pledge.i-ll-be-against-every-time-it-comes-up` → **a town member's campaign speech, 2409400, seed eb7bf596, part 2** I've held the view for years that builders build more homes when the rules don't make them lose money. I'll be against an affordable-housing requirement for new buildings every time it comes up.
- pass: `outline-local.stand.i-m-for-and-that-doesn-t-change` → **the governor's address, 5466652, seed 2f25fb7e, part 2** At the moment, the minimum wage has gone up, and so have paychecks. I'm for the higher minimum wage, and that doesn't change.
- pass: `outline-local.stand.i-see-it-the-other-way` → **the governor's address, 4949820, seed af873500, part 3** Not everyone agrees. Some would build public broadband. I see it the other way. Government shouldn't compete with the companies already building internet lines.
- pass: `outline-local.question.is-it-time-to` → **the local head's address, 4949820, seed af873500, part 2** Is it time to get families in need what they qualify for sooner? Yes, because a family in trouble shouldn't wait weeks for aid it qualifies for.
- pass: `outline-local.question.is-this-the-year-we` → **a town member's campaign speech, 5466652, seed 2f25fb7e, part 2** Is this the year we do more to care for our creeks and woods? Yes, because clean water is cheaper to keep than to win back.
- pass: `outline-local.answer.no-because` → **the local head's address, 2409400, seed eb7bf596, part 2** Is it time to give civilians oversight of the police? No, because an officer should be judged by people who have done the job.
- pass: `outline-local.answer.i-wouldn-t-since` → **a town member's campaign speech, 4949820, seed af873500, part 3** Is it time to allow apartments in single-family zones? I wouldn't, since the people who bought into a neighborhood should shape it.
- pass: `outline-local.answer.yes-because` → **a town member's campaign speech, 5466652, seed 2f25fb7e, part 2** Is this the year we do more to care for our creeks and woods? Yes, because clean water is cheaper to keep than to win back.
- pass: `outline-local.stand-reason.to-me-comes-down-to-this` → **the local head's address, 5466652, seed 2f25fb7e, part 2** To me, more assistance spending comes down to this: a family in trouble shouldn't wait weeks for aid it qualifies for.
- pass: `outline-local.stand-reason.i-m-for-keeping` → **the governor's address, 2409400, seed eb7bf596, part 4** I'm for keeping the photo ID law. No citizen should be turned away from the polls for lacking the right card.
- pass: `outline-local.greeting.friends-and-neighbors-of-thank-you` → **a town member's campaign speech, 2409400, seed eb7bf596, part 1** Friends and neighbors of Washington County, thank you. Most of what I'd do as commissioner comes back to the cost of a place to live.
- pass: `outline-local.report.the-budget-held-up-this-year-and-is-where-should-look-next` → **the local head's address, 2409400, seed eb7bf596, part 1** Neighbors and friends from across Washington County, welcome. The budget held up this year, and how we keep people safe and treat them fairly is where Washington County should look next.
- pass: `outline-local.send-off.thank-you-i-ll-see-you-at-the-next-meeting-of` → **the local head's address, 5466652, seed 2f25fb7e, part 3** Thank you, Rainelle. I'll see you at the next meeting of the Rainelle City Council.
- pass: `outline-local.send-off.thanks-for-listening-i-d-be-glad-to-be-your` → **a town member's campaign speech, 5466652, seed 2f25fb7e, part 3** Thanks for listening, Rainelle. I'd be glad to be your council member.
- pass: `outline-local.running.most-of-what-i-d-do-as-comes-back-to` → **a town member's campaign speech, 2409400, seed eb7bf596, part 1** Friends and neighbors of Washington County, thank you. Most of what I'd do as commissioner comes back to the cost of a place to live.
- pass: `outline-local.stand.i-m-for` → **the governor's address, 5466652, seed 2f25fb7e, part 2** At the moment, the minimum wage has gone up, and so have paychecks. I'm for the higher minimum wage, and that doesn't change.
- pass: `outline-local.stand.i-m-against` → **a town member's campaign speech, 4949820, seed af873500, part 2** Today, eviction court works the way it always has, between the two sides. I'm against a lawyer for tenants facing eviction.
- pass: `outline-local.today.today` → **a town member's campaign speech, 4949820, seed af873500, part 2** Today, eviction court works the way it always has, between the two sides. I'm against a lawyer for tenants facing eviction.
- pass: `outline-local.greeting.neighbors-department-heads-and-members-of-thank-you` → **the local head's address, 4949820, seed af873500, part 1** Neighbors, department heads, and members of the Midway City Council: thank you. What did Midway do this year? A lot of it was about how we help people through hard times.
- pass: `outline-local.send-off.get-home-safe-and-thank-you` → **the local head's address, 2409400, seed eb7bf596, part 4** Get home safe, Washington County, and thank you.
- pass: `outline-local.send-off.tell-a-neighbor-what-you-heard-today-and-tell-me-if-i-got-it-wrong` → **a town member's campaign speech, 2409400, seed eb7bf596, part 3** Tell a neighbor what you heard today, Washington County, and tell me if I got it wrong.
- pass: `outline-local.send-off.if-you-ve-got-a-question-on-i-ll-stay-and-answer-it` → **a town member's campaign speech, 4949820, seed af873500, part 4** If you've got a question on housing, I'll stay and answer it.
- pass: `outline-local.greeting.you-didn-t-have-to-come-out-for-this-and-i-m-glad-you-did` → **the local head's address, 5466652, seed 2f25fb7e, part 1** You didn't have to come out for this, Rainelle, and I'm glad you did. We spent a lot of this year on how we help people through hard times.
- pass: `outline-local.greeting.i-m-glad-to-be-asking-for-your-vote-in-person` → **a town member's campaign speech, 4949820, seed af873500, part 1** Midway, I'm glad to be asking for your vote in person. As your council member, I've worked on the cost of a place to live, and I want to finish the job.
- pass: `outline-local.send-off.thank-you-all` → **the local head's address, 4949820, seed af873500, part 3** Thank you all.
- pass: `outline-local.greeting.hello-neighbors` → **a town member's campaign speech, 5466652, seed 2f25fb7e, part 1** Hello, neighbors. What brought me into this race for council member is our land and water.
- pass: `outline-local.running.as-your-i-ve-worked-on-and-i-want-to-finish-the-job` → **a town member's campaign speech, 4949820, seed af873500, part 1** Midway, I'm glad to be asking for your vote in person. As your council member, I've worked on the cost of a place to live, and I want to finish the job.
- pass: `outline-local.greeting.neighbors-and-friends-from-across-welcome` → **the local head's address, 2409400, seed eb7bf596, part 1** Neighbors and friends from across Washington County, welcome. The budget held up this year, and how we keep people safe and treat them fairly is where Washington County should look next.
- pass: `outline-local.send-off.thank-you-everyone` → **the President's inaugural, 2409400, seed eb7bf596, part 1** Thank you, everyone. In November the votes came in, and now the work is mine for four years. Nothing I say today matters more than our place in the world.
- fail: `outline-local.report.what-did-do-this-year-a-lot-of-it-was-about` → **the local head's address, 4949820, seed af873500, part 1** Neighbors, department heads, and members of the Midway City Council: thank you. What did Midway do this year? A lot of it was about how we help people through hard times.
- pass: `outline-local.report.we-spent-a-lot-of-this-year-on` → **the local head's address, 5466652, seed 2f25fb7e, part 1** You didn't have to come out for this, Rainelle, and I'm glad you did. We spent a lot of this year on how we help people through hard times.

## Passing lines

- `outline-local.greeting.members-of-department-heads-and-neighbors`: "Members of {body-name}, department heads and neighbors."
- `outline-local.greeting.to-the-members-of-and-to-everyone-from-who-came-out`: "To the members of {body-name}, and to everyone from {realm-name} who came out:"
- `outline-local.greeting.neighbors-across-and-members-of`: "Neighbors across {realm-name}, and members of {body-name}."
- `outline-local.greeting.neighbors-across-thank-you-for-coming-out`: "Neighbors across {realm-name}, thank you for coming out."
- `outline-local.greeting.neighbors-in-thanks-for-coming`: "Neighbors in {realm-name}, thanks for coming."
- `outline-local.report.the-budget-came-in-ahead-this-year-in-and-is-where-i-d-put-the-differe`: "The budget came in ahead this year in {realm-name}, and {theme-name} is where I'd put the difference."
- `outline-local.running.i-want-to-be-your-and-i-want-to-talk-about`: "I want to be your {office-title}, and I want to talk about {theme-name}."
- `outline-local.running.before-you-decide-on-your-hear-me-out-on`: "Before you decide on your {office-title}, hear me out on {theme-name}."
- `outline-local.running.what-brought-me-into-this-race-for-is`: "What brought me into this race for {office-title} is {theme-name}."
- `outline-local.running.i-filed-for-because-of`: "I filed for {office-title} because of {theme-name}."
- `outline-local.running.i-m-running-for-to-do-something-about`: "I'm running for {office-title} to do something about {theme-name}."
- `outline-local.creed.i-think-i-always-have`: "I think {belief}. I always have."
- `outline-local.creed.i-ve-held-the-view-for-years-that`: "I've held the view for years that {belief}."
- `outline-local.pledge.i-ll-put-my-name-behind`: "I'll put my name behind {about}."
- `outline-local.pledge.i-ll-push-for-at-every-meeting`: "I'll push for {about} at every meeting."
- `outline-local.pledge.i-ll-work-to-and-i-won-t-quit-at-the-first-no`: "I'll work to {to}, and I won't quit at the first no."
- `outline-local.pledge.i-ll-be-against-every-time-it-comes-up`: "I'll be against {about} every time it comes up."
- `outline-local.pledge.i-ll-stand-up-for-every-time-it-s-challenged`: "I'll stand up for {law-name} every time it's challenged."
- `outline-local.pledge.anyone-who-wants-to-weaken-will-have-to-get-through-me-first`: "Anyone who wants to weaken {law-name} will have to get through me first."
- `outline-local.pledge.i-ll-work-to-repeal`: "I'll work to repeal {law-name}."
- `outline-local.pledge.repealing-is-where-i-ll-start`: "Repealing {law-name} is where I'll start."
- `outline-local.today.`: "{today}"
- `outline-local.today.right-now`: "Right now, {today-clause}"
- `outline-local.today.here-in`: "Here in {realm-name}, {today-clause}"
- `outline-local.stand.i-m-for-and-that-doesn-t-change`: "I'm for {law-name}, and that doesn't change."
- `outline-local.stand.i-d-keep-just-as-it-is`: "I'd keep {law-name} just as it is."
- `outline-local.stand.i-m-against-and-i-want-it-repealed`: "I'm against {law-name}, and I want it repealed."
- `outline-local.stand.i-d-back-a-repeal-of-tomorrow`: "I'd back a repeal of {law-name} tomorrow."
- `outline-local.stand.i-d-back-the-day-it-comes-up`: "I'd back {about} the day it comes up."
- `outline-local.stand.i-d-say-no-to-if-it-came-up`: "I'd say no to {about} if it came up."
- `outline-local.stand.i-don-t-agree`: "I don't agree. {belief-sentence}"
- `outline-local.stand.i-see-it-the-other-way`: "I see it the other way. {belief-sentence}"
- `outline-local.contrast.some-people-argue-that-we-should`: "Some people argue that we should {other-side}."
- `outline-local.contrast.some-want-to-and-i-disagree`: "Some want to {other-side}, and I disagree."
- `outline-local.contrast.plenty-of-people-around-here-want-to`: "Plenty of people around here want to {other-side}."
- `outline-local.question.is-it-time-to`: "Is it time to {to}?"
- `outline-local.question.is-this-the-year-we`: "Is this the year we {to}?"
- `outline-local.question.is-worth-keeping`: "Is {law-name} worth keeping?"
- `outline-local.question.have-we-gotten-right`: "Have we gotten {law-name} right?"
- `outline-local.question.does-still-want`: "Does {realm-name} still want {law-name}?"
- `outline-local.answer.no-because`: "No, because {belief}."
- `outline-local.answer.i-wouldn-t-since`: "I wouldn't, since {belief}."
- `outline-local.answer.no`: "No. {belief-sentence}"
- `outline-local.answer.put-me-down-as-a-no`: "Put me down as a no. {belief-sentence}"
- `outline-local.answer.yes-because`: "Yes, because {belief}."
- `outline-local.answer.i-would-since`: "I would, since {belief}."
- `outline-local.answer.yes`: "Yes. {belief-sentence}"
- `outline-local.answer.put-me-down-as-a-yes`: "Put me down as a yes. {belief-sentence}"
- `outline-local.stand-reason.to-me-comes-down-to-this`: "To me, {about} comes down to this: {belief}."
- `outline-local.stand-reason.i-can-t-back-since`: "I can't back {about}, since {belief}."
- `outline-local.stand-reason.i-m-for-keeping`: "I'm for keeping {law-name}. {belief-sentence}"
- `outline-local.send-off.thank-you-for-coming-out`: "Thank you for coming out, {realm-bare}."
- `outline-local.send-off.please-vote-and-thank-you-for-hearing-me-out`: "Please vote, {realm-bare}, and thank you for hearing me out."
- `outline-local.send-off.i-d-be-proud-to-speak-for-as-your`: "I'd be proud to speak for {realm-name} as your {office-title}."
- `outline-local.greeting.residents-of-and-members-of-thank-you-for-being-here`: "Residents of {realm-name}, and members of {body-name}, thank you for being here."
- `outline-local.greeting.members-of-neighbors-friends`: "Members of {body-name}, neighbors, friends."
- `outline-local.greeting.thanks-for-coming-out`: "Thanks for coming out, {realm-bare}."
- `outline-local.greeting.thank-you-for-being-here`: "{realm-bare}, thank you for being here."
- `outline-local.greeting.friends-and-neighbors-of-thank-you`: "Friends and neighbors of {realm-name}, thank you."
- `outline-local.report.the-thing-kept-coming-back-to-this-year-was`: "The thing {realm-name} kept coming back to this year was {theme-name}."
- `outline-local.report.the-budget-held-up-this-year-and-is-where-should-look-next`: "The budget held up this year, and {theme-name} is where {realm-name} should look next."
- `outline-local.running.i-m-asking-for-your-vote-for-and-is-what-i-d-work-on`: "I'm asking for your vote for {office-title}, and {theme-name} is what I'd work on."
- `outline-local.running.when-i-decided-to-run-for-was-on-my-mind`: "When I decided to run for {office-title}, {theme-name} was on my mind."
- `outline-local.running.my-campaign-for-is-about`: "My campaign for {office-title} is about {theme-name}."
- `outline-local.running.i-want-to-be-your-so-we-can-do-better-on`: "I want to be your {office-title} so we can do better on {theme-name}."
- `outline-local.send-off.if-matters-to-you-come-to-the-next-meeting-of`: "If {theme-short} matters to you, come to the next meeting of {body-name}."
- `outline-local.send-off.thank-you-i-ll-see-you-at-the-next-meeting-of`: "Thank you, {realm-bare}. I'll see you at the next meeting of {body-name}."
- `outline-local.send-off.come-tell-what-you-think-about`: "Come tell {body-name} what you think about {theme-short}."
- `outline-local.send-off.i-d-be-proud-to-have-your-vote`: "I'd be proud to have your vote, {realm-bare}."
- `outline-local.send-off.if-you-vote-for-me-i-ll-work-for-you-as-your`: "If you vote for me, {realm-bare}, I'll work for you as your {office-title}."
- `outline-local.send-off.thanks-for-listening-i-d-be-glad-to-be-your`: "Thanks for listening, {realm-bare}. I'd be glad to be your {office-title}."
- `outline-local.report.as-i-spent-a-good-part-of-this-year-on`: "As {office-title}, I spent a good part of this year on {theme-name}."
- `outline-local.report.nothing-took-more-of-my-time-this-year-than`: "Nothing took more of my time this year than {theme-name}."
- `outline-local.report.the-budget-stayed-steady-this-year-and-that-let-us-keep-working-on`: "The budget stayed steady this year, and that let us keep working on {theme-name}."
- `outline-local.running.i-m-running-because-needs-somebody-s-full-attention`: "I'm running because {theme-name} needs somebody's full attention."
- `outline-local.running.most-of-what-i-d-do-as-comes-back-to`: "Most of what I'd do as {office-title} comes back to {theme-name}."
- `outline-local.greeting.good-to-be-with-you-all-here-in`: "Good to be with you all here in {realm-name}."
- `outline-local.greeting.friends-from-across-thank-you-for-coming`: "Friends from across {realm-name}, thank you for coming."
- `outline-local.send-off.i-ll-stay-a-while-after-this-if-you-d-like-to-talk-about`: "I'll stay a while after this, if you'd like to talk about {theme-short}."
- `outline-local.send-off.thank-you-for-the-work-you-do-for-all-of-you`: "Thank you for the work you do for {realm-name}, all of you."
- `outline-local.send-off.if-you-d-like-to-talk-about-i-ll-be-right-here`: "If you'd like to talk about {theme-short}, I'll be right here."
- `outline-local.send-off.whoever-you-vote-for-please-vote`: "Whoever you vote for, please vote, {realm-bare}."
- `outline-local.send-off.thank-you-for-listening-i-hope-to-see-you-at-the-polls`: "Thank you for listening. I hope to see you at the polls, {realm-bare}."
- `outline-local.stand.i-m-for`: "I'm for {about}."
- `outline-local.stand.i-m-against`: "I'm against {about}."
- `outline-local.stand.i-disagree-and-here-s-why`: "I disagree, and here's why: {belief}."
- `outline-local.contrast.some-of-you-will-want-to-and-i-understand-why`: "Some of you will want to {other-side}, and I understand why."
- `outline-local.contrast.some-people-around-here-would`: "Some people around here would {other-side}."
- `outline-local.stand-reason.i-d-repeal-and-here-s-why`: "I'd repeal {law-name}, and here's why: {belief}."
- `outline-local.today.today`: "Today, {today-clause}"
- `outline-local.greeting.good-evening-members-of-and-neighbors`: "Good evening, members of {body-name}, and neighbors."
- `outline-local.send-off.good-night-and-thank-you-for-coming-out`: "Good night, {realm-bare}, and thank you for coming out."
- `outline-local.send-off.good-night-i-hope-to-earn-your-vote`: "Good night, {realm-bare}. I hope to earn your vote."
- `outline-local.report.the-budget-came-up-short-this-year-in-and-is-where-we-felt-it`: "The budget came up short this year in {realm-name}, and {theme-name} is where we felt it."
- `outline-local.running.i-ve-held-this-seat-and-the-work-on-isn-t-finished`: "I've held this seat, and the work on {theme-name} isn't finished."
- `outline-local.running.i-think-we-can-do-better-on-than-we-have-and-i-d-like-the-chance-as`: "I think we can do better on {theme-name} than we have, and I'd like the chance as {office-title}."
- `outline-local.running.the-person-in-this-seat-hasn-t-done-enough-on-and-i-d-do-more`: "The person in this seat hasn't done enough on {theme-name}, and I'd do more."
- `outline-local.send-off.i-ve-asked-for-your-trust-before-i-m-asking-for-it-again`: "I've asked for your trust before. I'm asking for it again, {realm-bare}."
- `outline-local.send-off.if-matter-to-you-come-to-the-next-meeting-of`: "If {theme-short} matter to you, come to the next meeting of {body-name}."
- `outline-local.running.as-i-d-give-the-attention-it-hasn-t-had`: "As {office-title}, I'd give {theme-name} the attention it hasn't had."
- `outline-local.running.i-put-my-name-in-for-to-work-on`: "I put my name in for {office-title} to work on {theme-name}."
- `outline-local.running.nothing-changes-on-unless-someone-pushes-and-i-m-running-for-to-push`: "Nothing changes on {theme-name} unless someone pushes, and I'm running for {office-title} to push."
- `outline-local.running.i-ve-been-so-i-know-what-s-been-done-on-and-what-hasn-t`: "I've been {office-title}, so I know what's been done on {theme-name} and what hasn't."
- `outline-local.send-off.vote-the-way-you-think-is-best-that-s-all-i-ask`: "Vote the way you think is best, {realm-bare}. That's all I ask."
- `outline-local.send-off.come-find-me-after-this-and-tell-me-what-i-missed`: "Come find me after this, {realm-bare}, and tell me what I missed."
- `outline-local.send-off.i-m-easy-to-find-tell-me-what-you-think-about`: "I'm easy to find, {realm-bare}. Tell me what you think about {theme-short}."
- `outline-local.send-off.thanks-for-your-time-i-d-be-honored-to-serve-as`: "Thanks for your time, {realm-bare}. I'd be honored to serve as {office-title}."
- `outline-local.send-off.thanks-for-coming-if-you-want-to-talk-about-the-door-is-open`: "Thanks for coming, {realm-bare}. If you want to talk about {theme-short}, the door is open."
- `outline-local.send-off.questions-on-are-welcome-and-so-are-complaints`: "Questions on {theme-short} are welcome, and so are complaints."
- `outline-local.send-off.i-ll-take-your-questions-on-now`: "I'll take your questions on {theme-short} now."
- `outline-local.greeting.i-m-glad-to-be-here-with-and-the-people-of`: "I'm glad to be here with {body-name} and the people of {realm-name}."
- `outline-local.greeting.neighbors-department-heads-and-members-of-thank-you`: "Neighbors, department heads, and members of {body-name}: thank you."
- `outline-local.greeting.neighbors-of-i-appreciate-you-being-here`: "Neighbors of {realm-name}, I appreciate you being here."
- `outline-local.send-off.if-something-i-said-about-doesn-t-sit-right-with-you-tell-me`: "If something I said about {theme-short} doesn't sit right with you, tell me."
- `outline-local.send-off.i-d-rather-hear-from-on-than-guess`: "I'd rather hear from {realm-name} on {theme-short} than guess."
- `outline-local.send-off.my-office-is-open-to-anyone-in-who-wants-to-talk-about`: "My office is open to anyone in {realm-name} who wants to talk about {theme-short}."
- `outline-local.send-off.anyone-who-wants-to-help-with-knows-where-to-find`: "Anyone who wants to help with {theme-short} knows where to find {body-name}."
- `outline-local.send-off.have-a-good-rest-of-the-day`: "Have a good rest of the day, {realm-bare}."
- `outline-local.send-off.get-home-safe-and-thank-you`: "Get home safe, {realm-bare}, and thank you."
- `outline-local.send-off.i-m-out-here-because-i-want-the-job-thanks-for-hearing-why`: "I'm out here because I want the job, {realm-bare}. Thanks for hearing why."
- `outline-local.send-off.tell-a-neighbor-what-you-heard-today-and-tell-me-if-i-got-it-wrong`: "Tell a neighbor what you heard today, {realm-bare}, and tell me if I got it wrong."
- `outline-local.send-off.if-you-ve-got-a-question-on-i-ll-stay-and-answer-it`: "If you've got a question on {theme-short}, I'll stay and answer it."
- `outline-local.greeting.thank-you-to-to-the-staff-and-to-everyone-from`: "Thank you to {body-name}, to the staff, and to everyone from {realm-name}."
- `outline-local.greeting.neighbors-in-thank-you-for-making-time`: "Neighbors in {realm-name}, thank you for making time."
- `outline-local.send-off.you-ll-have-a-choice-for-and-i-hope-you-ll-think-of-me`: "You'll have a choice for {office-title}, {realm-bare}, and I hope you'll think of me."
- `outline-local.send-off.i-d-like-to-be-the-you-can-call-when-something-goes-wrong`: "I'd like to be the {office-title} you can call when something goes wrong, {realm-bare}."
- `outline-local.send-off.as-i-d-answer-to-you-first`: "As {office-title}, I'd answer to you first, {realm-bare}."
- `outline-local.greeting.members-of-and-the-people-of-they-serve`: "Members of {body-name}, and the people of {realm-name} they serve."
- `outline-local.greeting.the-people-of-and-members-of-thank-you-for-coming`: "The people of {realm-name}, and members of {body-name}: thank you for coming."
- `outline-local.send-off.thanks-for-letting-me-speak-on`: "Thanks for letting me speak on {theme-short}, {realm-bare}."
- `outline-local.send-off.ask-around-about-me-and-decide-for-yourself`: "Ask around about me, {realm-bare}, and decide for yourself."
- `outline-local.send-off.you-ve-heard-a-lot-from-me-now-i-d-like-to-hear-from-you`: "You've heard a lot from me, {realm-bare}; now I'd like to hear from you."
- `outline-local.greeting.you-didn-t-have-to-come-out-for-this-and-i-m-glad-you-did`: "You didn't have to come out for this, {realm-bare}, and I'm glad you did."
- `outline-local.greeting.thank-you-members-of-and-thank-you-to-everyone-from`: "Thank you, members of {body-name}, and thank you to everyone from {realm-name}."
- `outline-local.greeting.i-m-glad-to-be-asking-for-your-vote-in-person`: "{realm-name}, I'm glad to be asking for your vote in person."
- `outline-local.send-off.will-you-vote-for-me-i-d-be-grateful`: "Will you vote for me, {realm-bare}? I'd be grateful."
- `outline-local.send-off.thank-you-all`: "Thank you all."
- `outline-local.send-off.you-know-where-to-find-me`: "You know where to find me, {realm-bare}."
- `outline-local.greeting.welcome-everyone`: "Welcome, everyone."
- `outline-local.greeting.hello-everyone`: "Hello, everyone."
- `outline-local.greeting.hello-neighbors`: "Hello, neighbors."
- `outline-local.greeting.hi-everyone`: "Hi, everyone."
- `outline-local.running.as-i-d-start-by-working-on`: "As {office-title}, I'd start by working on {theme-name}."
- `outline-local.running.as-i-d-make-a-priority`: "As {office-title}, I'd make {theme-name} a priority."
- `outline-local.running.i-m-running-so-that-gets-a-fair-hearing-from-your`: "I'm running so that {theme-name} gets a fair hearing from your {office-title}."
- `outline-local.running.ask-yourself-what-your-has-done-on-i-d-do-more`: "Ask yourself what your {office-title} has done on {theme-name}. I'd do more."
- `outline-local.running.as-your-i-ve-worked-on-and-i-want-to-finish-the-job`: "As your {office-title}, I've worked on {theme-name}, and I want to finish the job."
- `outline-local.report.spent-a-good-part-of-the-year-working-on`: "{realm-name} spent a good part of the year working on {theme-name}."
- `outline-local.report.as-i-saw-come-up-again-and-again-this-year`: "As {office-title}, I saw {theme-name} come up again and again this year."
- `outline-local.report.the-subject-that-kept-coming-up-at-this-year-was`: "The subject that kept coming up at {body-name} this year was {theme-name}."
- `outline-local.report.much-of-what-took-up-this-year-had-to-do-with`: "Much of what {body-name} took up this year had to do with {theme-name}."
- `outline-local.greeting.neighbors-and-friends-from-across-welcome`: "Neighbors and friends from across {realm-name}, welcome."
- `outline-local.greeting.residents-of-thank-you-for-coming`: "Residents of {realm-name}, thank you for coming."
- `outline-local.greeting.good-evening-neighbors`: "Good evening, neighbors."
- `outline-local.greeting.hello-friends`: "Hello, friends."
- `outline-local.report.talked-about-all-year-and-so-did-i`: "{realm-name} talked about {theme-name} all year, and so did I."
- `outline-local.send-off.thank-you-i-m-always-glad-to-hear-from-you-on`: "Thank you, {realm-bare}. I'm always glad to hear from you on {theme-short}."
- `outline-local.send-off.any-questions-on-i-ll-stay-as-long-as-you-like`: "Any questions on {theme-short}? I'll stay as long as you like."
- `outline-local.send-off.thanks-for-coming`: "Thanks for coming."
- `outline-local.send-off.thanks-for-listening`: "Thanks for listening."
- `outline-local.send-off.thank-you-everyone`: "Thank you, everyone."
- `outline-local.send-off.i-d-be-glad-to-talk-more-about`: "I'd be glad to talk more about {theme-short}."
- `outline-local.report.we-spent-a-lot-of-this-year-on`: "We spent a lot of this year on {theme-name}."
- `outline-local.report.in-my-time-as-has-taken-more-of-my-attention-than-anything-else`: "In my time as {office-title}, {theme-name} has taken more of my attention than anything else."
- `outline-local.report.we-finished-the-year-with-money-to-spare-and-is-the-first-place-i-d-sp`: "We finished the year with money to spare, and {theme-name} is the first place I'd spend it."
