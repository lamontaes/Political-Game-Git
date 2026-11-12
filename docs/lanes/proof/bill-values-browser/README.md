# Bill card and paper browser proof

Source `37d827ddf9`, November 4, 2026. Normal Advanced new-life generation and generated local officeholders; no supplied law, vote or enactment. Brookside uses its fixed replay; the two other towns preserve the prior all-56 draw. Four draft/paper pairs pass exact text, record and amount comparisons, with no page errors. Random Lake and Bear River City offer no allowed income-tax card; their existing budget cards are checked, without changing eligibility.

[Records and replays](proof.json). Each town key has draft and paper screenshots beside this file. The earlier two unit mismatches, stale-pager failure and canceled first synchronization helper remain described in [the unit proof](../bill-values-jurisdiction.md).

To replay, start the existing bench server from the repository root with `OCD_STORAGE_OVERRIDE="cloud session, owner approved Oct 14" NODE_OPTIONS=--max-old-space-size=8192 npm run bench`, then run `NODE_OPTIONS=--max-old-space-size=8192 node docs/lanes/proof/bill-values-browser/replay.mjs`. Set `PLAYWRIGHT_CHROMIUM_EXECUTABLE` if using a separately installed Chromium. This script differs from the passing local runner only in portable import, browser executable and output paths. It waits for the prior bill pager to detach before reading a refreshed page, with no sleep and no relaxed assertions.
