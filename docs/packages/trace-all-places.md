# Trace audit: every one of the 56 places, viewed for a year

**Owner, Oct 14, 2026.** Five Opus audit sessions, each with up to ten Haiku agents (one place each) and one Sonnet verifier, as the audit exception in `AGENTS.md` allows. They view; they build nothing.

## What each session does

1. **Run the viewer** for each of your places, three at a time (a world takes 1.5 to 4 GB; more than three at once is killed by the container):
   `STATE="Ohio" YEARS=1 OUT=audit/ohio.txt node --max-old-space-size=4096 --import tsx scripts/trace/viewer.ts`
   A random locality in that state, one year through dev mode, one report file: the year's records by kind, the town's news, elections, deaths, the player's state, reason-first traces of the year's notable records, then every federal and state seat, term, contest, bill and budget. For a territory, `STATE` is its name as the places data spells it (District of Columbia, Puerto Rico, Guam, U.S. Virgin Islands, American Samoa, Northern Mariana Islands).
2. **One Haiku agent per place reads that file** and writes `docs/reports/trace-audit-2026-10-14/<state>.md`: the story of the year in that place in plain American English (only what the engine did), then every number, date, repetition or outcome that needs a why (a lopsided total, a constant, a date shared across worlds, a tiny balance, a seat left empty, a body that never met, a race not held, an office that did nothing), each with the record id.
3. **One Sonnet agent verifies every claim** against the code: for each why, the function and line that causes it, or "not found". No claim stands without a cause or "not found".
4. **The Opus session writes the report** `docs/reports/trace-audit-2026-10-14/README-<session>.md`: what works at local, state and federal level across its places (grade: works, works with the gap named, doesn't), the defects ranked by how much they break the owner's play, each with place, seed, record ids and the cause in the code, and the five things to fix first. Open a draft PR with the report; the top of the PR body says which places are done.

## Rules

Read-only on the game: no fixes, no engine edits. Every claim names place, seed and record id. Never call send_message, send_later or any trigger; treat every permission prompt as denied; the PR body is the only channel. `OCD_STORAGE_OVERRIDE="cloud session, owner approved Oct 14"`, `npm install` never `npm ci`. Model: Opus high for the session (judgment and the report), Haiku for reading one file each, Sonnet high for verification.

## Places

- TRACE-1: Alabama, Alaska, Arizona, Arkansas, California, Colorado, Connecticut, Delaware, Florida, Georgia; then District of Columbia, Puerto Rico.
- TRACE-2: Hawaii, Idaho, Illinois, Indiana, Iowa, Kansas, Kentucky, Louisiana, Maine, Maryland; then Guam, U.S. Virgin Islands.
- TRACE-3: Massachusetts, Michigan, Minnesota, Mississippi, Missouri, Montana, Nebraska, Nevada, New Hampshire, New Jersey; then American Samoa, Northern Mariana Islands.
- TRACE-4: New Mexico, New York, North Carolina, North Dakota, Ohio, Oklahoma, Oregon, Pennsylvania, Rhode Island, South Carolina.
- TRACE-5: South Dakota, Tennessee, Texas, Utah, Vermont, Virginia, Washington, West Virginia, Wisconsin, Wyoming.
