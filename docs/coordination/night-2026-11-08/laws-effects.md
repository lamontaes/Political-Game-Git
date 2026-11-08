You are Laws and effects for lamontaes/Political-Game-Git. Common rules: `docs/coordination/night-2026-11-08/README.md` ("Rules for every session"); read it first.

## The owner's words

- Nov 7: "these should all be able to be reversed." Every law at every level (town, county, state, Congress) can be passed and repealed by the body that has the power, and the higher level governs where real law says it does.
- Nov 8: "I definitely want that one law finished. I want the rest of the research finished." (The one law is the consumer loan cap; the Dev Mode session on the CTO's account is proving it.)
- Standing since Sept 27, said at least three times: "the priority is to make the laws do something real... it's not just financial... education, infrastructure, healthcare, social stuff... Environment. Everything." Measure a law by all its real effects firing on real records, never by money alone.
- Standing: legislation across every policy area is the backbone of the game; never narrow it to one proof route.
- From the voice note (`docs/coordination/voice-notes/2026-11-08-story-and-night.md`): "Can people start moving to different states because they're desirable? Do other states change their laws?"

## Found on main (Nov 8)

- **Law levels and reversals** (the Astra session, now stopped; its goal is in this brief's history, PRs #7308 to #7353): a test requires a repeal path for every law in force at the start (#7330); Congress can pass and repeal in play (#7326, Hamburg, New Jersey) and has bills for income tax, wages, cannabis, the Social Security age and work rules. Not shown in a played game: a state legislature voting a town ban on and the town's rule stopping, then voting it off and the rule returning. Federal reach is still partial: Congress acts on only some of the questions real federal law reaches (`src/core2/data/legislature/bill-catalog.json`).
- **The effects web** (`docs/reports/law-wiring-table.md`, Nov 1): 175 of 246 researched links reach people; 21 the research puts at about zero (they stay at zero; never invent an effect the research doesn't support); about 50 are read by no engine. `docs/reports/effects-web-plan-2026-10-29.md` groups them into families (treasury interest, medical bills, voting relief, jobs pull to work, sentencing, place prices, child health, births into credit, and a research PR for sizes), and parks the ones whose record doesn't exist yet (heat and weather by place and day, water violations).
- **Breadth:** the bill menu has 18 subjects with 133 topics, and only 45 topics have any policy a bill can enact. Immigration, defense and veterans, foreign affairs and trade, and parks and culture have none; neither do water, flood control, debt and borrowing (bonds), campaign finance, criminal sentencing, or marriage and custody.
- **Open from State Sessions:** the Nevada, Vermont and New Hampshire minimum wage lists disagree; use each state labor department's posted 2026 rate and cite it.
- Whether people move between places as laws and places drift apart, and whether states copy each other's laws, is not known: test it first.

## Done when, each shown in a played game (through dev mode as it lands), with place, seed and a screenshot or a trace

1. **Every law reversible at every level, and the higher level governs where real law preempts**, through the one rule in `resolveLawInForce`; the state town-ban vote on and off shown in play; Congress is a level for every question real federal law reaches, each one sourced (statute or ruling, cited, nothing guessed).
2. **The unread effects reach people**, family by family as the plan sets out, each proven in two random places; records the effects need (weather by place and day, for heat) are built where the research supports them; the research PR gives each its size and lag.
3. **More of the bill menu can be enacted**, by real law at each level, starting with what towns, counties, states and Congress actually pass most often (bonds and borrowing, water, flood control, campaign finance, sentencing, and at the federal level immigration, defense and trade), each with its real effects wired the same way.
4. **People and places respond as places drift apart**, if the research supports it: households move between places for jobs, rents and taxes; states take up laws their neighbors passed. Build each through the existing engines, never as a script.
5. The wage lists fixed and cited.

## Files

Yours: the law-level files (`laws-in-force`, `policy-authority`, `laws`, the bill catalog and `scripts/research/build-bill-catalog.py`), the effects web (`outcome-web`, `law-reach`, `data/research`), and world legislating once State Sessions (CTO's account) posts its final report. The Legislation session owns how a bill moves (`src/core2/modules/legislature.ts` and the bill screens); when a new policy needs the bill paper to show it, tell Legislation through the coordinator. Story owns scenes; a law's effect that should become a scene goes to Story through the coordinator. Speed may touch your files for speed only.

If this is too much for one session by morning, the coordinator splits it (for example, levels and breadth in one session, the effects web in another). Keep going until 1 to 5 hold on main; report what you proved and what you left open.
