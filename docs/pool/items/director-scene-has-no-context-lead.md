---
id: director-scene-has-no-context-lead
title: "Scenes the player is shown that open on who arrived and never say why: gathering-missing, apology, filing, accusation"
area: director
kind: bug
priority: 2
size: S
status: in-pr
claimed-by: story/director-context-lead
pr: 8084
blocked-on:
lead: words
milestone: play-first
source: "owner, Nov 9: no irrelevant scenes; one drawn year played for three places (Snohomish, Washington; Harrison, Wisconsin; Windsor, Colorado)"
claimed-at:
---

**What.** One played year at each of three drawn places, with the player and their household watched as the game watches them, staged 71, 53 and 19 scenes. Every scene's cause involved the player or their household, so the director's cause gates held. What the capture did show is scenes whose narration names who arrived and never says why: a gathering-missing scene ("Andrea Lambert comes to the house."), an apology ("Kelsey Lambert stops in at the house."), a filing ("you head out, and Nicole Ruiz comes over."), an accusation ("you get to Calumet County Telephone Cooperative, and Jessica May comes over."). The bank has `lead-gathering-missing-other` but no lead is said for these, so the scene opens with no context.

**Done when.** In a played year at a drawn place (name the place, seed and record ids), each of those four scene types opens with a lead that names the cause (the missed gathering, the quarrel, the filing, the accusation) from its cause record, or the type is skipped. The test in `src/director/reads-wrong.test.ts` reads the narration of every staged scene and finds none that names only an arrival.

**Rules.** Wire to the world: the lead reads the cause record that staged the scene, and no sentence is typed in code, so the words come from the scene-words bank.

**Files.** src/director/scene.ts, data/english/parts/scene-words.json, src/director/data/circumstances.json

**Notes.** Found by the director helper of story/director-trade-and-address. Not a gate: the cause is right and the cast is right. Also seen and left alone: the job-offer scene repeated every two weeks for a player who never answers (a jobs-engine matter, offers lapse unanswered), and the grading harness watching 64 locals, which stages scenes no player sees.

**Time box.** 2 hours.

**You will see.** A visit at the house that starts by saying what it is about.

**Screenshot.** The four scenes' opening paragraphs in a played year.

**Re-check on story/director-context-lead (Nov 9).** The scenes stack already gave gathering-missing, apology and accusation their own talk narration. Only filing still opened on the clerk's action without saying what for; its two office-less narrate pieces now exclude the `office` fact, and a third piece names the office. News-arrives and the other types carry a lead. Sources read: Columbia, Missouri council filing notice (yahoo.com/news/politics/articles/columbia-city-council-candidate-filing-084923840.html) and the Los Angeles City Clerk's candidate information (cityclerk.lacity.org/election/General_Info_Municipal_Election_Candidates_2026.pdf).
