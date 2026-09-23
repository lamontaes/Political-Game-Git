# The Alaska report and the game both sound like internal records

The report's narration and several player-facing lines it quotes sound like internal records. The current main source still contains the quoted game wording. In several cases, the game already records the underlying event or decision, but displays it in internal language. The report adds a procedural voice and a few claims broader than the walk measured. Filing eligibility, incumbent reelection, and election results also have separate gameplay defects; prose cannot close them.

## What the player encountered

The [Alaska playtest](https://docs.google.com/document/d/1bGBzaiAqKhlsAUiO4sqh80mYZLeE_0mHHlldRryUH10/edit) quotes these lines:

- “Recorded qualification for a dated executive term was entered.”
- “filed as a candidate for a Governor”
- A congressional notice ending “held on 2028-01-16 in this game.”
- “The Governor of Alaska is not on the ballot: they cannot or will not stand again under this game profile.”
- “The recorded district-residence interval does not yet satisfy the sourced 1-year requirement.”

A related source line reads “While time was passing, something came up that only you can decide.” The opening repeatedly labels instant choices “No time passes.” These are source strings in the current build; the crisis sentence and zero-time labels were not re-walked for this note.

The report opens its story with “The player starts a normal life” and “The game draws Lucia Moran,” then repeatedly narrates panel navigation. That makes Lucia's life feel like a test script even though the report has a real sequence of events. Its analysis says “The case cost her the fine and nothing else,” then describes two close contacts distancing themselves. It says “Nothing she did as governor has a consequence,” though newspapers reported her refusal to request disaster help. The narrower measured claims are that the fine changed her cash and that the walk observed no further political or governing response to those actions.

The [new running-record playtests](https://drive.google.com/file/d/1RH6lxdeapC71sydpYpq9IXIG7WiBrd9L/view) show the same writing problem across other surfaces: about 300 identical door-knocking sentences above one result, a job paying “a median of 17.03 an hour, 35410 a year,” “(fictional)” in employer names, and a Journal paragraph repeating an invitation about 50 times. Those walks used main at 6b1fc39f. That head predates PR #444's time-notice change, so its “990 minutes passed” example does not show that the merged fix failed.

## Why these lines survive

Source review shows that the crisis sentence is a fixed frame around actual protected-decision kinds. The game knows whether the interruption concerns health, a state disaster request, a federal declaration, or an international decision ([crisis-shell.ts](/Users/lamontae/Documents/PG-LAND/src/presentation/crisis-shell.ts:399)). It still renders “something came up” before naming the decision ([crisis-shell.ts](/Users/lamontae/Documents/PG-LAND/src/presentation/crisis-shell.ts:444)). This is a wording failure over existing facts.

Source review shows that an executive qualification event stores the person, contest, jurisdiction, date and office tag ([executive-work-entry.ts](/Users/lamontae/Documents/PG-LAND/src/simulation/executive-work-entry.ts:474)). Its public summary is the abstract sentence quoted above ([executive-work-entry.ts](/Users/lamontae/Documents/PG-LAND/src/simulation/executive-work-entry.ts:491)). The executive-work projection can display event summaries directly ([executive-work.ts](/Users/lamontae/Documents/PG-LAND/src/presentation/executive-work.ts:140)). A governor filing similarly records a public event but inserts the office title after “a,” producing “a Governor” ([campaigns.ts](/Users/lamontae/Documents/PG-LAND/src/simulation/campaigns.ts:799)). These are measured source templates, not a new fact-generation request.

Source review shows that the House special-election transition has a scheduled date. Its sentence prints the machine date and adds “in this game” ([office-continuity.ts](/Users/lamontae/Documents/PG-LAND/src/simulation/governing/office-continuity.ts:286)). The provenance explicitly records that the interval is a game profile; that caveat belongs in developer records, not the character's notice. The [Game Constitution](/Users/lamontae/Documents/PG-LAND/docs/GAME-CONSTITUTION.md:69) keeps source and provenance off every player-facing surface.

## Correction for the player-text lane

Render the specific known decision or event in the register of its surface. For the state-disaster case, a grounded direction is “Decide whether to request a federal disaster declaration.” For the candidacy record, the known action can read “Lucia Moran filed to run for governor.” The special-election notice can give the scheduled date as “January 16, 2028” without the phrase “in this game.” These are examples for review against each exact fact packet; they are not approved strings for every decision kind, office, or date.

Do not hide an incomplete or fictitious rule behind fluent prose. The House listing/refusal disagreed about eligibility, district residence began on the game-start date, and the sitting governor had no normal filing route in the Alaska walk. Those require the candidacy owners to resolve the rule and action path. Once corrected, the player should get a brief race rule with more explanation on request. Source citations stay in developer records.

The owner chose to leave instant choices unlabeled. Show a time cost on a choice when it takes time, and keep the Calendar's exact time. Do not change the clock to make the label read better.

## Correction for owner reports

Keep the Alaska walk's dates, amounts, exact screen quotes, and what was pressed. Begin with Lucia and the situation rather than “The player starts” or “The game draws.” Use panel names only when they explain what Lucia could see or what action was available. Move code causes and branch comparisons into the analysis, as this report already tries to do. Narrow broad verdicts to what the walk actually showed, and separate visible consequences from consequences found only in the record or code. The original report remains the evidence at its named build; a reader-facing rewrite should preserve its findings rather than erase it.

## What happens next

The player-text lane should revise the cited renderers, inspect the assembled screens, and ground-check the resulting sentences against their event facts. The report owner should revise the Alaska write-up using the report guidance above. The candidacy lane owns eligibility, incumbent filing, and the rule behind any refusal. The playtest lane should re-open those exact screens at a new place after changes land. PR #444 already changed the separate “minutes passed” notice; this handoff does not reopen that completed fix.

Method: the Alaska playtest recorded the quoted screens on main at 616dcdb5. The source strings above remained in `origin/main` at c3faaed82 on September 22, 2026. This note did not run a new browser playthrough or change game code.
