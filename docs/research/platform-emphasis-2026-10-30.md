PLATFORM EMPHASIS: OWN CONVICTION VERSUS THE VOTERS' AGREEMENT (synthesis, 2026-10-30)

Bottom line: Candidates pick the questions they campaign on mostly by where they think voters already agree with them. They keep their positions and change only what they talk about. Silence is the usual answer to a question where they are on the losing side. Only one study measures how strongly emphasis follows agreement (Nixon 1972: about +38% space per +10 points of support on all issues, +58% on domestic issues). No study measures how a candidate weighs their own conviction against agreement, and no US study measures this for council or school-board races. The agreement slope is ESTIMATED, the conviction term's shape is TUNABLE, and the local checks are descriptive totals.

All quotes below were checked against the researchers' downloaded copies in this scratchpad (dl_issue/djo2004.txt, wb.txt, goodmanlucas.txt, dl_issue/ndi_afgh.txt, lepennec.txt, dl_issue/ass2001.txt, dl_acl/a.txt, dl_minozzi/m.txt, dl_dkp/d.txt, kc.txt). Three are exceptions, taken from the researchers' returns because no copy was saved: Ballotpedia, Butler and Dynes, and Pereira.

---

1. THE RULE (sliding, no dice)

---

Which questions are on the table: those the place's own records make live this season, such as a crime record, a tax or fee change, a pending ordinance or a school closure. Local agendas vary with local conditions. The Danish study of 98 local agendas names "geography, urbanisation, and the perceived competence of the incumbent mayor." (https://econpapers.repec.org/RePEc:sae:envirc:v:31:y:2013:i:4:p:571-584)

For each live question q, a candidate's score is:

score(q) = conviction(q) x exp( 0.043 x support(q) + 0.010 x salience(q) ) x (1 + w_record x record(q))

conviction(q): |the candidate's own position| on q, 0 to 1, from their traits and principles. It is fixed for the whole race.
support(q): the percent of the candidate's electorate the candidate believes is on their side of q, 0 to 100.
This is the candidate's belief, not the true share. It is read from the people the candidate has met
and the polls and news they have received. Centering does not change rankings, so no midpoint is needed.
salience(q): the percent of the electorate naming q the most important local problem. This is the same
measure the Nixon study used for "importance". The voter-group model supplies it, so counted
groups are read with the same rule as full people, times their count.
record(q): 0 to 1, how far the candidate's own record (votes, job, past acts) bears favorably on q.

Platform: the top 3 questions by score.
Emphasis share (space in speeches, flyers, questionnaire answers, ads and news quotes): score(q) / (sum of the three scores).
Every other question gets silence. The candidate never raises it, and states their unchanged position only when a record asks directly (a questionnaire, a debate question or a reporter).

What the weighting means in play:

- Each +10 points of believed support multiplies a question's score by about 1.54 (exp 0.43).
- A question with 20 more points of agreement outranks another unless the candidate cares about the other 2.4 times as much (exp 0.86 = 2.36).
- A conviction of 1.0 at 50% support ties a conviction of 0.65 at 60% support.
- Salience is weak: 40 points of salience multiplies the score by 1.49.
  Nothing flips at a threshold, and nothing is rolled.

Do positions move? No, not during a race. Only emphasis moves, along with which questions get silence. A position changes only through whatever already changes a person's views between races (what they learn and live through), never as a campaign tactic. Evidence:

- Ansolabehere, Snyder and Stewart (https://scispace.com/pdf/candidate-positioning-in-u-s-house-elections-2s308hreqd.pdf): "Even in the U.S., when candidates – incumbents, challengers, and open seat contestants alike – balance the broad policy views of the local district and the national party, the national party dominates." / "Competing candidates in congressional elections almost never converge." Strong, peer-reviewed, partisan House races.
- Le Pennec, French legislative manifestos 1958-2017 (https://www.carloalberto.org/wp-content/uploads/2020/01/20200121_LePennec_JMP.pdf): weaker candidates move "by emphasizing consensus-based non-policy issues (e.g. individual traits or local issues) as opposed to their party platform." Moderate to strong; working paper; not US.
- NDI Political Campaign Planning Manual (https://www.ndi.org/sites/default/files/Afgh-campaign-planning-manual-ENG.pdf): "it is much easier to turn the focus of the debate onto issues where your candidate is well positioned." Practitioner.
- Butler and Dynes, AJPS 2016 (https://isps.yale.edu/research/publications/isps15-016): "politicians systematically discount the opinions of constituents with whom they disagree." Strong; this is the mechanism, not a campaign measure.
- Who's on Board (see C4): sitting school-board members match their district's majority on polarizing issues only about half the time, so local positions are not picked for popularity.

The candidate's belief about support is not accurate, and that is intended. Pereira (APSR 2021) found Swiss local officials' predictions of majority opinion "increased 4 to 9 percentage points when encouraged to avoid availability heuristics" (https://cambridge.org/core/product/FBD98EFF932D264B1D489FEE9C5A8872/core-reader). Reading belief from the people the candidate knows reproduces that availability bias without a roll. If no engine yet keeps a candidate's belief about support, use the true share from the voter groups and register a stopgap. The true share overstates how well local candidates know their voters.

Left out of the first version: a competitiveness term and an answer-the-opponent term.

- The evidence for them is directional only: engagement "increases with the competitiveness of the race" (Kaplan, Park and Ridout); "candidates increase the attention they devote to issues as their opponents' emphasis of these same issues increases" (Banda); ownership effects appear only in competitive races (Minozzi).
- None of them gives a number that carries over to local races.
- Add these terms only if check C6 fails.

---

2. CALIBRATION TARGETS (totals checked over a played year, every place)

---

C1 (primary). Emphasis rises with believed support.

- What to measure: across all (candidate, question) pairs in contested races, compare the mean emphasis share of questions whose believed support differs by 10 points.
- Target: +10 points of support gives about +58% emphasis (domestic questions). Accepted band +27% to +86%, which is exp(10 x 0.024) to exp(10 x 0.062), ±1 SE. The all-issues figure of +38% falls inside the band.
- Picking only the top 3 sharpens the slope, so start the slope at 0.043, measure, and adjust it within its spread until the measured total is in the band.
- Source: https://faculty.wcas.northwestern.edu/jnd260/pub/Druckman%20Jacobs%20Ostermeier%20JOP%202004.pdf
  Quotes: "if support for Nixon's position on a domestic issue increased by 10% over the overall average (from 47.89% to 57.89%), and we hold importance and approval at their means, the space Nixon devoted to a domestic issue would increase an average of 58%." / "if support for Nixon's position on a given issue increased by 10% over the average (from 47.89% to 57.89%) and we hold importance and performance approval at their means, we would see an average increase of 38% in the space Nixon devoted to an issue." / Table 2 row: "Support For Nixon's .031* .043* -.056 Policy Positions (.016) (.019) (.067)" (all issues, domestic, foreign; N 182, 153, 29). Here "10%" means 10 percentage points.
- Strength: strong design (private polls lagged one month, content analysis, negative binomial). But it covers one presidential campaign.

C2. Support matters more than salience.

- Target: holding support fixed, the measured salience slope stays well below the support slope.
- Same source: "Nixon focused on the public's support for his issue positions—more than information on its evaluations of job performance or issue importance—to figure out which issues to prime". Table 2: "Issue Importance .006 .010 .048 (.020) (.022) (.041)".
- Strength: same study. Practitioner guides weight importance more heavily (see weaknesses).

C3. Silence on the divisive question.

- Target: about 27% of local winners in a season have no stated stance on their place's most divisive question.
- Accepted band 17% to 37%. This band is my judgment, not sourced.
- Source: https://news.ballotpedia.org/2022/12/08/ballotpedia-reports-how-hot-button-issues-affected-nov-8-school-board-elections/
  Quote: "Candidates whose stances could not be identified won 27%" (1,779 seats, 545 districts, Nov 8, 2022)
- Strength: descriptive count from a non-random sample.

C4. Positions are not chosen for popularity.

- Target: about half of sitting local officials hold the position of their place's majority party on a polarizing question. The share runs from 43% to 70% depending on the question.
- Source: https://wallacefoundation.org/sites/default/files/2025-10/whos-on-board-school-boards-and-political-representation-in-age-of-conflict.doi_.10.59656%252FEL-G4421.001.pdf
  Quote: "We find that only about one-half of school board members hold views on a variety of polarizing issues that match the views of the majority party in their district: charter schools (43 percent matching), book restrictions (51 percent), local schools' emphasis on racism (48 percent), and teachers' unions (53 percent)." The transgender items are 68 and 70 percent.
- Strength: 5,205 members, but an 8.7% response. District opinion is proxied by the 2020 presidential vote. Not peer-reviewed.

C5. What local candidates prioritize.

- Target: of local candidates' top priorities, fiscal and economic questions are about 36% and governance and administration about 22%.
- Winners and losers do not differ, and size of place does matter.
- Source: https://cjur.uwinnipeg.ca/index.php/cjur/article/download/44/32/148
  Quotes: "Taken together, the two categories in Table 1 most clearly related to economic and fiscal concerns—"Taxes and Civic Finances" and "Economic Development and Jobs"—represent about 36 percent of the total responses." / "Taken together, these two categories represent 22 percent of responses." / "It does not vary in statistically significant ways across successful and unsuccessful candidates, urban and rural candidates, or incumbent and non-incumbent candidates."
- Strength: moderate. Ontario 2014, 299 of 832 candidates, self-selected.
- This checks the agenda and conviction supply that feeds the rule more than the weighting itself.

C6. Overlap between opponents (partisan state legislative and federal races only).

- Target: two opponents' theme overlap is about 0.27 on the Ruzicka similarity scale, against about 0.47 if they chose themes at random.
- The rule produces this avoidance on its own: where one candidate's side has 70% support, the other's has 30%.
- Source: https://econ.la.psu.edu/wp-content/uploads/sites/5/2024/08/2024-11-07_acl_political_dialogue.pdf
  Quote: "the average similarity would be σ Ruzicka = 0.4681, whereas the average in our data (conditional on both candidates in a race advertising at least once) is σ Ruzicka = 0.2658"
- Strength: moderate. Large data (House and Senate, 2012-2020), not peer-reviewed. There is no local number.

C7 (input check, optional). A candidate's belief about support is off in a consistent direction, not randomly.

- Target: for candidates with no poll, the belief misses the true share by roughly 10 to 20 points.
- Source: https://calgara.github.io/Pol157_Spring2019/Broockman%20&%20Skovron%202018.pdf
  Quote: "Republicans overestimate support for the conservative position on every issue by over ten percentage points and often by over 20 percentage points."
- Strength: strong, but US state legislators. The bias runs toward the conservative side, not simply toward each candidate's own view.

---

3. PARAMETERS TO ADD

---

P1 (the main one): platformSupportSlope

- Value: 0.043 per percentage point of believed support, on the log of emphasis.
- Tag: ESTIMATED. Source: Druckman, Jacobs and Ostermeier, JOP 2004, Table 2, domestic coefficient .043 (SE .019); the all-issues figure is .031 (SE .016). It is directly measured, but for one presidential campaign with private polls, so carrying it over to local candidates is an assumption. That is why it is not tagged SOURCED.
- Spread: 0.024 to 0.062 (±1 SE). The all-issues 0.031 lies inside. Checked against C1.

P2: platformSalienceSlope

- Value: 0.010 per percentage point naming q the most important problem.
- Tag: ESTIMATED. Same table, domestic .010 (SE .022), not significant.
- Spread: 0 to 0.032. The ±1 SE lower bound of -0.012 is floored at 0, because a question cannot lose emphasis by mattering more. Checked against C2.

P3: platformIssueCount

- Value: 3.
- Tag: ESTIMATED from practitioner convention. The NDI manual says "you want to concentrate on only two or three". The League of Women Voters guide asks for "the top three (3) Priority Issues" (https://my.lwv.org/sites/default/files/leagues/wysiwyg/%5Bcurrent-user%3Aog-user-node%3A1%3Atitle%5D/vg2020generalschoolmadison.pdf).
- Spread: 2 to 3. Checked against C3, because fewer picks means more silence.

P4: platformRecordWeight (w_record)

- Value: 0.5.
- Tag: TUNABLE. Sellers (APSR 1998) gives the direction only: "candidates tend to focus on this type of issue when choosing campaign themes" (https://econpapers.repec.org/RePEc:cup:apsrev:v:92:y:1998:i:01:p:159-171_20). No number.
- Spread: 0 to 1. Checked only in that C1 must stay in band with it on.

No parameter is needed for the conviction term: it enters linearly (exponent 1). Its shape has no source, so it rides on the TUNABLE check of C1.

---

4. WEAK OR MISSING

---

- No study measures how a candidate weighs their own conviction against voters' agreement. The Nixon study measures agreement only, never Nixon's own priority. The sourced half of the rule is the agreement slope; the conviction side (linear) is a modeling choice.
- The one agreement slope comes from a 1972 presidential campaign that had private polls, and the effect appears only on domestic issues. Local candidates rarely poll. Treating the slope as a candidate's believed support, read from the people they know, is an assumption.
- Issue ownership measures a party's advantage on an issue, not the popularity of the candidate's own position, and its evidence conflicts:
  - weak or small tilt: Sides 2006; Druckman, Kifer and Parkin, mean 1.77 (SD 9.55) on a scale of -20 to 26;
  - strong party-driven differences: Spiliotes and Vavreck 2002.
    This bounds the rule but does not calibrate it.
- No US council or school-board study relates emphasis to the popularity of a position. The local evidence is foreign or descriptive: Ontario, Quebec, France, Switzerland, Denmark, Ballotpedia and Who's on Board.
- C3 and C4 come from sources that are not peer-reviewed. Who's on Board proxies opinion by presidential vote and has an 8.7% response. The 17% to 37% band on C3 is my judgment.
- No number carries competitiveness over to local races. Kaplan et al., Minozzi and Le Pennec give the direction only, so the pressure term is left out.
- No number on answering the opponent carries over to local races (Banda's work is statewide).
- The cost of a flip-flop (14 points) comes from a student write-up of a talk. It is excluded. The rule needs no position-change cost because positions do not move during a race.
- Paywalled, abstracts only: the convergence levels in Sigelman and Buell 2004, Kaplan, Park and Ridout 2006, and Sides 2006. Simon 2002 has no number.
- The Nixon study's +38% is slightly above exp(0.31) = 1.36. That is because the authors computed it by simulation (Clarify), which averages over coefficient uncertainty. Use the published +38% and +58% as the targets and the coefficients as the starting knob.
- The Ballotpedia, Butler and Dynes, and Pereira quotes rest on the researchers' fetches. No copy was on disk to recheck them.

## Quote verification (independent, Oct 30)

Quote check: platform-emphasis synthesis, 2026-10-30

I fetched every source myself (curl, then pdftotext and grep; WebFetch for the ACL PDF and the Sellers page). Copies are in /tmp/claude-0/-home-user-Political-Game-Git/e700904c-357a-5300-94c3-1f79cca80131/scratchpad/verify-emph/

Result: 21 quotes verified, 7 verified but with a wrong or incomplete reading, 1 misread outright, and 1 not found (Banda's quoted sentence). Four citations carry no quote, so there was nothing to check.

QUOTE CHECKS

1. Danish agendas, "geography, urbanisation, and the perceived competence of the incumbent mayor." (econpapers envirc)
   -> VERIFIED. One note: the 98 "campaign agendas" were built from a voter survey (N = 3336) "asking respondents to point out the most central issue in their respective municipality". They are what voters saw as the agenda, not what candidates chose.

2. Ansolabehere, Snyder and Stewart, "...the national party dominates." and "Competing candidates in congressional elections almost never converge." (scispace PDF; the copy is the August 2000 working-paper draft)
   -> VERIFIED, but the synthesis leaves out the qualifier. The same paper says "District-by-district competition exerts some pressure on candidates to fit with their constituents" and "While there is a statistically significant amount of responsiveness, it is not the main story." The study compares positions across districts; it does not observe positions changing during a race. "Positions never move" is a modeling simplification, not this paper's finding.

3. Le Pennec, "by emphasizing consensus-based non-policy issues (e.g. individual traits or local issues) as opposed to their party platform."
   -> VERIFIED. The sentence's subject is "candidates who benefit from the support of fewer base voters in their district", and the move happens between the first round and the runoff. In the model the party platform "is exogenously fixed and cannot be altered", so that is an assumption, not a finding.

4. NDI, "it is much easier to turn the focus of the debate onto issues where your candidate is well positioned."
   -> VERIFIED quote, MISREAD meaning. "Position" in NDI's worksheet means "how well your candidate does on these issues in comparison to your major opponents ... the voters believe the candidate will best be able to address issue G". That is perceived competence, not agreement with the candidate's stance.

NDI also weights importance as heavily as position: "Your campaign should focus on the issues that fall into the upper-right-hand quadrant ... important and ... best positioned". It adds that the "Less Important/Good Position ... will not help your candidate very much." This cuts against the weak salience weight in the rule.

5. NDI, "you want to concentrate on only two or three"
   -> VERIFIED.

6. Butler and Dynes, "politicians systematically discount the opinions of constituents with whom they disagree."
   -> VERIFIED (ISPS abstract). The subjects are "state and local politicians" in survey experiments. The study bears on how politicians form beliefs about and respond to voters, not on what they emphasize.

7. Pereira, "increased 4 to 9 percentage points when encouraged to avoid availability heuristics"
   -> VERIFIED. What rose was "the probability of representatives correctly predicting majority preferences", among 2,917 Swiss local officials.

The same abstract also says the social-projection prompt "reduced the tendency to overstimate support for policies endorsed". (The typo "overstimate" is in the source.) So local officials do overestimate support for their own positions. That is relevant to C7.

8. Kaplan, Park and Ridout, "issue engagement increases with the competitiveness of the race"
   -> VERIFIED (EconPapers abstract, RePEc:wly:amposc:v:50:y:2006:i:3:p:724-736). The data are US Senate races, 1998 to 2002.

9. Banda, "candidates increase the attention they devote to issues as their opponents' emphasis of these same issues increases"
   -> NOT VERIFIED. I could not find this sentence.

The "directional only" label is also MISREAD. Banda's LSE blog post (researchonline.lse.ac.uk/id/eprint/75788) gives sizes: "her Democratic opponent responds by airing about 22 additional ads ... in a competitive election ... around 42 more ads" per 100 opponent ads. For Republicans the figures are "about 20" and "approximately 31". These come from 93 Senate campaigns, so they still don't carry over to local races, but they are numbers.

10. Druckman, Jacobs and Ostermeier, the +58% domestic sentence, the +38% all-issues sentence, and the Table 2 rows ".031* .043* -.056 (.016) (.019) (.067)", N 182 / 153 / 29
    -> VERIFIED, with several points the synthesis misses:

- The source says "increased by 10% over the overall average (from 47.89% to 57.89%)", which is 10 percentage points.
- The outcome is "the number of lines Nixon devoted to each issue" per month, modeled with negative binomial regression.
- The period is January 1969 to November 1972, using private polls.
- Table 4, which adds image controls, gives support coefficients of .006 (.007) for all issues, .028* (.013) for domestic and -.012 (.007) for foreign. The text says "support for Nixon's positions had no effect on all issues taken together or just foreign policy issues." So the all-issues +38% does not hold up, and the domestic slope runs from .028 to .043 depending on the model. The synthesis does not mention this.

11. Druckman, Jacobs and Ostermeier, "Nixon focused on the public's support for his issue positions—more than information on its evaluations of job performance or issue importance—to figure out which issues to prime", and Table 2 "Issue Importance .006 .010 .048 (.020) (.022) (.041)"
    -> VERIFIED. Importance is measured as "how many respondents viewed a particular problem or issue as the single most important one", which matches the synthesis. Footnote: "We exclude performance approval and issue importance because neither was significant in previous analyses."

12. Ballotpedia, "Candidates whose stances could not be identified won 27%" (1,779 seats, 545 boards)
    -> VERIFIED quote, but "no stated stance" is a stretch. Ballotpedia's method is "If we cannot determine a stance, we mark the winner unclear."

- That is Ballotpedia failing to find a stance, which includes candidates who were silent but is not the same thing.
- It covers three "conflict topics" (race in education, COVID-19 responses, sex and gender), not the place's single most divisive question.
- The sample is races already chosen because candidates took stances on those topics.

13. Who's on Board, "We find that only about one-half of school board members hold views ... charter schools (43 percent matching), book restrictions (51 percent), ... racism (48 percent), and teachers' unions (53 percent)."
    -> VERIFIED. The 70% top of the range is "athletic activities" (70 percent), with bathrooms at 68 percent.

- Response: "5,346 individuals from 3,093 school districts ... response rate of 8.7 percent"; the full sample is 5,205.
- A "match" is defined against the 2020 Trump/Biden two-party vote in the district.
- Publisher: Thomas B. Fordham Institute, October 2025. These are sitting members' views, not their campaign positions.

14. CJUR (Goodman and Lucas, Ontario 2014), "about 36 percent of the total responses", "represent 22 percent of responses", and "It does not vary in statistically significant ways across successful and unsuccessful candidates..."
    -> VERIFIED. The survey question was "What should the main priorities of [Municipality Name] municipal government be for the next term?" and only "the top priority listed by each candidate" was coded. That makes it a measure of conviction or priority, not of campaign emphasis.

- Size does matter: "in small and medium-size municipalities, more candidates are concerned about economic development and jobs, whereas ... large municipalities ... transportation and congestion".
- Sample: 832 candidates, 485 started the survey, 299 completed it.

15. ACL (Anderson, Ciliberto and Leyden, November 7, 2024), "the average similarity would be σ Ruzicka = 0.4681, whereas the average in our data (conditional on both candidates in a race advertising at least once) is σ Ruzicka = 0.2658"
    -> VERIFIED quote, MISREAD scope. The data are "U.S. House and Senate races from 2012 to 2020", which is federal TV advertising only. There are no state legislative races in it.

16. Broockman and Skovron, "Republicans overestimate support for the conservative position on every issue by over ten percentage points and often by over 20 percentage points."
    -> VERIFIED, but the synthesis's "for candidates with no poll" is not in the source.

- The 10 to 20 point figure is for Republicans only. Democrats err less ("Republican politicians do so to a much greater extent").
- The pattern holds "among both candidates and sitting officeholders" in state legislatures.

17. League of Women Voters, "the top three (3) Priority Issues"
    -> VERIFIED. It is one voter guide's questionnaire format (Madison School District, Michigan, 2020). It says nothing about how many issues candidates actually emphasize.

18. Sellers, "candidates tend to focus on this type of issue when choosing campaign themes"
    -> VERIFIED (EconPapers abstract; APSR 1998, congressional campaigns). "This type" refers to "issues on which candidates have built a record that appears favorable to voters."

19. Druckman, Kifer and Parkin, mean 1.77 (SD 9.55) on a scale of -20 to 26
    -> VERIFIED in the fetched APSR 2009 PDF. The values are "1.77 (9.55)" and "(The range is −20 to 26, with negative scores being the inverse of ownership and 0 being neutral.)" The variable is "Weighted relative partisan advantage of issues discussed" on congressional candidates' websites.

20. Minozzi, Sides 2006, and Spiliotes and Vavreck 2002
    -> NOT VERIFIED. The synthesis gives no quote or URL for these.

The synthesis's arithmetic is correct: exp(0.43) = 1.54, exp(0.86) = 2.36, 0.65 x 1.54 = 1.00, exp(0.40) = 1.49, and the band exp(0.24) to exp(0.62) is +27% to +86%.

CALIBRATION TARGETS AND PARAMETERS, REWRITTEN FROM VERIFIED QUOTES ONLY

C1 (primary): emphasis rises with believed support

- Measure: across (candidate, question) pairs in contested races, the change in emphasis share for +10 points of believed support.
- Target: +58%, on domestic or local questions only. Source: Druckman, Jacobs and Ostermeier, JOP 2004, "the space Nixon devoted to a domestic issue would increase an average of 58%."
- Accepted band: +15% to +86%. The low end comes from the Table 4 domestic coefficient .028 (.013), whose lower edge is exp(0.15) = 1.16. The high end comes from Table 2 .043 (.019), whose upper edge is exp(0.62) = 1.86.
- Drop "+38% all-issues falls in band" as support. Table 4 shows the all-issues effect at .006 (.007), and the paper says it had "no effect on all issues taken together".
- Strength: one presidential campaign with private polls, 1969 to 1972; the outcome is lines per issue per month.

C2: support beats salience (from the same paper)

- Target: the measured salience slope stays below the support slope. Evidence: Table 2 importance .010 (.022), not significant, and "neither was significant in previous analyses."
- Flag the conflict: NDI's practitioner grid tells campaigns to focus on issues that are important AND where the candidate is "best positioned". That supports a larger salience weight than Nixon's data does.

C3: silence on the conflict topics

- Target: about 27% of school-board winners in conflict races are ones whose stance Ballotpedia "could not be identified" (1,779 seats, 545 boards, three conflict topics).
- Read this as an upper bound on silence, since "unclear" also covers stances that were taken but not found.
- The ±10 point band is unsourced judgment.

C4: positions are not chosen for popularity

- Target: 43% to 53% of sitting board members match their district's majority party on four polarizing questions; 68% to 70% match on two transgender-policy questions. Source: Fordham, October 2025, 8.7% response, match defined by the 2020 presidential vote.
- Supporting reading, from Ansolabehere, Snyder and Stewart: "almost never converge", with "a statistically significant amount of responsiveness".

C5 (input check, convictions not emphasis)

- Target: top-priority shares of fiscal/economic about 36% and governance/administration about 22%, with no difference between winners and losers. Source: Ontario 2014, 299 of 832 candidates.
- Allow differences by municipality size, which the source reports.

C6 (federal TV advertising only)

- Target: opponents' theme overlap Ruzicka 0.2658, against 0.4681 under random choice. Source: US House and Senate, 2012 to 2020, races where both candidates advertised.
- There is no state or local figure.

C7 (input check)

- Republicans' beliefs overstate conservative support by more than 10 points and often by more than 20; Democrats' errors are smaller (state legislators and candidates).
- Separately, local officials overestimate support for the policies they endorse (Pereira's social projection finding). Belief should therefore lean toward the candidate's own side as well as conservative.
- Drop "for candidates with no poll", which the sources don't say.

P1, platformSupportSlope

- Value 0.043 per point of believed support, on the log of emphasis. ESTIMATED from Druckman, Jacobs and Ostermeier, Table 2 domestic .043 (.019).
- Spread 0.015 to 0.062, widened downward to include Table 4 domestic .028 (.013).
- Do not cite the all-issues .031, which drops to .006 (not significant) with controls. Checked against C1.

P2, platformSalienceSlope

- Value 0.010, spread 0 to 0.032. ESTIMATED from Table 2 domestic .010 (.022), not significant.
- Note NDI's contrary practitioner advice. Checked against C2.

P3, platformIssueCount

- Value 3, spread 2 to 3. ESTIMATED from practitioner sources: NDI's "only two or three"; the League of Women Voters questionnaire's "top three (3) Priority Issues"; and the Ontario survey, which asked for "up to three priorities" but found "wide variation in the number of priorities that candidates actually provided".

P4, platformRecordWeight

- Value 0.5, spread 0 to 1. TUNABLE. Sellers gives only the direction: "candidates tend to focus on this type of issue when choosing campaign themes", meaning issues with "a record that appears favorable to voters".

Competitiveness and answer-the-opponent terms

- Kaplan, Park and Ridout give only a direction. Banda gives sizes, but only for 93 Senate campaigns (22 to 42 response ads per 100 opponent ads), so neither carries over to local races. Leaving both terms out of the first version still holds.
- Correct the scope note on C6 to read "federal House and Senate only".
