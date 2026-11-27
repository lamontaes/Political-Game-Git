# Play first: the prompt

Part of the `play-first` skill. The paste prompt that starts an agent on the lane.

## The prompt

> Read AGENTS.md, then docs/play-first/README.md, LAW.md, ORDER.md and PROGRESS.md in lamontaes/Political-Game-Git. You are the next agent on the play-first lane; the lane is the owner, you are its hands. Take the first item in ORDER.md marked [open], or [claimed]/[in PR] with no push in the last 3 hours (check the branch); claim it: `node --import tsx scripts/pool/index.ts claim <id> --branch play-first/<id>` (or check out the existing branch). Work it to its You-will-see line inside its time box. Push every 30 minutes or every green step; open the draft PR at the first push with the item id on line 1 and before/after screenshots. Before you stop for any reason, append the handoff block from HANDOFF-TEMPLATE.md to PROGRESS.md on main (never on your branch) and push. Honor every line of LAW.md. Take only items marked `checked: fable`. Never dev mode to get past something; never force-push; never merge your own PR. Cloud environment: OCD_STORAGE_OVERRIDE="cloud session, owner approved Oct 14" on every npm command; never ask the owner to confirm it.

- **The bench reads `controls.json` once, when it starts** (Dev Mode, Nov 8). A new control label returns an empty string in the browser until the bench is restarted, and the control looks broken (a status line that stays blank). Restart the bench after changing any label file before judging a browser check.

- **A lone screen control can be shown from the real page without playing to it** (Small fixes, Nov 8): open `/play` in Playwright, unhide the panel, toggle its class, and take 1440x900 shots at 0 ms, 150 ms and 1 s for an animation; say in the PR that the state was forced and which place and seed were not drawn. Some `src/bench` tests (dev-why, printed-words) draw a random place each run and take 3 to 9 minutes: run only the file you changed, with output to a file, and read the failing assertion before blaming your change (a printed-words failure on housing-purchase stories for cabinet and president households is not a cause-group bug).

- **Restore only files your check changed.** Calendar proof goes under the ignored `test-results/proof/calendar` directory. Attach the images to the PR.
