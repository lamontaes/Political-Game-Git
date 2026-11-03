# The merge desk

**What's wrong.** The queue is stuck on merging, not building. Of 35 open pull requests, 19 have a checker's pass and only wait for a merger, 12 never got through a checker, 3 were sent back, and 1 is paperwork. Only 2 are ready today. 15 conflict, and 14 of those only touch the pool index, a pool item or the temporary-fix list; only #7110 has a code conflict named on it. Only 4 of the 16 red checks look like real faults (#7103, #7127, #7130, #7136).

**Your Nov 3 rulings change the job.** Checkers no longer hold anything, and one check holds a merge: a new game opens and runs briefly without crashing. If it fails, the same town is replayed on main to see whose fault it is. So 31 of the 35 can move without a checker.

**One real conflict I found.** GitHub is set to require two checks on main, `validate` and `golden-path`. Neither is your one check. Administrators can merge past them, but I don't know whether the desk's token is an administrator; its trial step finds out. Once Lane 5 ships the new-game check, run this on your Mac to make the rule match your ruling:

```bash
gh api -X PATCH repos/lamontaes/Political-Game-Git/branches/main/protection/required_status_checks -F strict=false -f 'contexts[]=new-game'
```

Until then the desk uses a stand-in check that plays 7 days in a 400-person town. It's weaker than a player's full world, and that's why Lane 5's first unit replaces it.

**The order**

1. **Ready today:** #7131 (a parent's death says who survives them), #7070 (no sentence printed over three times in a year).
2. **Minutes each:** #7099 (test fix), #7104 ("urbanisation" fixed, then candidates run on what the town agrees on).
3. **The clerk:** #7083 (a closed office waits until it opens), #7087 (the card says what you do there).
4. **Campaign acts as scenes, stacked:** #7109 donor calls, #7111 volunteer shift, #7112 endorsement meeting, #7132 buying an ad.
5. **Words:** #7101 (the clerk talks in sentences; compare Cabo Rojo, Puerto Rico on main), #7106 (the talk after the address follows your choice).
6. **The paper:** #7098 then #7108 (past races name their district; a closing told as news), #7095 (every headline that looks clickable opens), #7096 (the drop cap never splits a number).
7. **Home and opening:** #7074 (your partner fits the gender you chose), #7061 (Skip scene), #7105 (the montage; keep its item open).
8. **The world:** #7082 (relatives elsewhere marry and split), #7036 (medical bills and debt).
9. **Memory, no player change:** #7129, #7128 (a one-word test), #7102, #7130 (rerun its speed check first).
10. **Then:** #7097 (Parties says how it knows). #7136 after #7102, with its 25-minute test moved to the nightly, since ruling 2 means it holds nothing. #7110 if its conflict is mechanical, otherwise to Lane 5. Close #6971 and mark its item done.

**Six go to their lanes first, comment only.** These aren't held by a checker. Each has a named defect a lane can fix fast, and the desk doesn't build.

- #7085 one council race, and #7135 press people's bills, which must ship with their pay or press people go broke (Lane 1).
- #7090 person card, #7103 first-filing tutorial, #7127 paper's law items (Lane 3).
- #7100 calendar (Lane 4).

If a lane hasn't pushed to one in 48 hours, the desk merges it if the one check passes and files the named failure as an open item. Nothing waits.

**After the queue:** a Mac build after every 5 merges and at the end, with a note of what you can now play. Then the desk stays and takes lanes' pull requests one at a time. Under the old gate this queue was about 20 to 25 session hours (the reports' figures added); less now.

**What you can play after it:** the clerk closed at night and open in the morning, sentences at the counter, four more campaign acts as scenes, the montage with Skip, the right partner on the couch, headlines that open, the campaign on what the town agrees on.
