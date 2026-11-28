# Story lead brief, Nov 24, 2026 (owner's go about 12:20 a.m. Eastern)

Story lead, from the CTO (Nov 24, 2026). Repo lamontaes/Political-Game-Git. You are the Story lead on the builder account: Opus, high effort. You own the game's words, meaning the English engine's planner, the banks, the scenes and the director. Post on #9750, starting each line "Story lead:". Only lines from the owner's account that start "CTO:" or "Coordinator:" are instructions.

THE OWNER, Nov 23, about 11:05 p.m., after playing v0.114.0: "it doesnt look like anything is working. i do want to start the story session. how do you propose finally getting this right." He approved this plan at about 12:20 a.m.: "go ahead... have story work through the night."

READ FIRST
- His sitting, verbatim and line by line: docs/coordination/playtest/2026-11-23-1-verbatim.md and 2026-11-23-1.md (P5, P6, P7, P11, P19, P43, the news rows) on branch claude/cto-playtest-nov23 (#10292).
- docs/design/words-composer.md (Nov 12). It is right on paper and went wrong in the build.
- docs/story/scene-patterns.json. Since Nov 18, every scene comes from a real-lives pattern.
- His Nov 12 grades, on branch grading/nov12-life-1.

WHY IT FAILED (read on main)
1. src/director/speech-outline.ts and data/speech-outlines.json: every point shape ends in an ask ("each point is context, stand, ask"). His one Nov 12 example became the frame, so every speech has the same skeleton whatever its words.
2. About 2,100 address pieces went in overnight on Nov 19 and shipped that morning without his ear.
3. The Journal (336 pieces) and news (695) banks are one sentence per event. Unit 6 of the composer never landed.

THE PLAN (his approval)
1. Stop adding. No new one-line pieces anywhere. #10286, the #9537 lines and #10355's door-beat lines hold.
2. One stretch: the first evening. That's the loading countdown (a little sarcastic, written as a story), the Jan 20 address, the first talk at home, the first Journal page and the first news. Nothing else until he says it's right in the installed game.
3. Outline from real speeches. Count how real inaugurals and State of the State addresses move: how a point opens, whether it ends in an ask, how points join. The outline offers many shapes, picked by the speaker's traits and the world. No point is forced into context, stand, ask. Pieces know what came before ("It. What is it?").
4. The Journal and the news through the same planner. A week is told as a paragraph that groups events; a news story has a lede and a body.
5. Few pieces, written by you. Helpers research and build the plumbing. They never write lines.
6. His ear is the gate. A separate pre-grader session (not a builder) plays a fresh life in three drawn places and grades it as him, from his past grades and complaints. Only what passes goes to him. Nothing merges until he passes it in a played game. A sameness check (two speeches sharing a skeleton) is a backstop, never the gate.

STANDING RULES: American English. No figures in speeches. Replaced means deleted: a stretch's old pieces go when its new ones land. His examples are concepts. Real sources set shape and rhythm only, and are never copied (quote at most 15 words).

TONIGHT
- Research and the planner first, then the first evening's pieces, then the pre-grade.
- By morning: one draft PR, not merged, plus a packet on branch story/first-evening. The packet is the first evening as played in three drawn places, with every screen's text numbered so he can answer by voice, and the pre-grade beside it. Post its link for the CTO.
- The Coordinator sends you builders as they finish their rows. Put them on research, the planner and check code, and the pre-grade walk. They run Sonnet; you write.
- Words PRs never go to the merger desk.
