# Prior rulings: the press and news

Current as of 2026-10-23 (a frozen digest of the owner's Drive rulings; later rulings in OWNER-DECISIONS.md win)

Read-only research from the owner's Google Drive, run 2026-10-14. Searches: 15 `fullText contains` queries (press, news, newspaper, reporter, journalist, interview, outlet, headline, canned news, recap, bias, media, Bezos, Suzerain, TV), each pageSize 15, MEDIUM snippets. Files read in full or truncated: 10 (marked READ). Other entries come from search snippets (marked SNIPPET) and are less certain.

Rule applied: most recent wins unless the older one makes more sense. Each entry says whether it is an owner ruling, a CTO ruling, a research memo, or a finding.

Gaps: the "Decision Register" (04_CURRENT_DECISION_CHANGE_AND_TRACEABILITY_REGISTER, id 1bZWrzjUgDql2CIo_k1ElcQ2GrBZOzC_xJs8D-JswKpE, modified Oct 6) is the binding register for decisions. It was not read, only its title and bill-numbering snippet came back. Read it before relying on this file for anything the register might have changed.

---

## Rulings, newest first

**1. Oct 5 owner answer, recorded in a spec dated Oct 6. Election night is precinct by precinct.** (OWNER, via b03 spec, READ)

> "Owner answer (this round): election night is a played scene with your real people, precinct by precinct, crowd behind sized by turnout (Session 13 stays the one writer of counts)."
> File: "b03-election-night-scene" (id 1NP-75apMhOlDN2tmY_MJ9iqJ3-MWcuI8whwiNymaiNo), modified Oct 6.
> Binds: the election-night scene reports by precinct, with the crowd sized by real turnout. Session 13 is the only writer of counts. Supersedes the Sept 22 "aggregate reports" rule (entry 21).

**2. Oct 5 owner ruling. Personal-life scandals are in; the fixed penalty is deleted.** (OWNER, via b26 spec, READ)

> "Owner ruling Oct 5: personal-life scandals are IN from the start, from real recorded events, with presentation settings to soften them. The fixed 300/150 basis-point scandal penalty is DELETED."
> File: "b26-scandals-and-press-record" (id 10X0zvfR4Afg8S0sJhe2tvpS3T6GklxMR9GdPRtWqpr4), modified Oct 6.
> Binds: a reporter calls the player for a response with five choices (deny, apologize, attack the source, go quiet, resign). Lying is always an option and is recorded. Views move by provability, reporter, and relationship. No scandal store or fixed support loss. The setting `personalLifeDepiction` changes wording only. See the Conflicts section.

**3. Oct 5 owner decision. Corruption is caught only by investigation, leak, record, or a turned witness; lies are found by contradicting facts.** (OWNER, via b15 spec, SNIPPET)

> "Oct 5: corruption 'caught ONLY via investigations, leaks, records, or people who turn on you. No detection roll.' Lies 'found out by anyone with contradicting facts; damage by who and their personality.'"
> File: "b15 Investigations and opposition research" (id 1eXs8KBoZj2M7JLF7qkYtxlyXcMmV0Uzrgqr-zZv2_Oo), modified Oct 6.
> Binds: detection of misconduct and lies. No detection roll.

**4. Owner settings, "this round" (undated in the spec). Difficulty settings include press standards.** (OWNER, via b25 spec, SNIPPET)

> "pick a gentler or tougher press corps (stricter or looser standards before they print an allegation, more or less dogged reporters)." Also: "Votes, elections, prices and people's decisions are never tilted by a setting."
> File: "b25 Optional difficulty settings" (id 1WGXJWeFoGW4coc-X50NzrrDdFcpP5AcSpF77s3Ri9HM), modified Oct 6.
> Binds: press strictness and reporter dogedness can be set as options, after the 1.0 core. Conflicts with entry 2 (see Conflicts, item 1).

**5. Owner's Sept 26 register, quoted in a spec dated Oct 6. News reaches you like real life; each person has a news habit.** (OWNER, via b22 spec, READ)

> "Register, world outside (Sept 26): 'news from other towns arrives with natural lags'; 'Ordinary readers. Each person has a news habit shaped by age, interests and temperament.'"
> "Economy visibility scales with office. Other places' politics reaches you through the news (national big stories, your state in more detail)."
> File: "b22 Economy by office and news from elsewhere" (id 1Fq7Y0hbKunYb87DuYBU4ghANfq4wU1VEeZPRUviCYqI), modified Oct 6.
> Binds: national outlets carry big stories from anywhere. Your state's paper covers your state. Your town paper covers your town. Other towns' small news stays out unless it grows or touches you. Outlets are added as the player takes office or travels, not for all 56 places at once.

**6. Sept 29, 11:37 a.m. CTO ruling. The paper gets a news history on day one.** (CTO, via "03 CTO RULINGS" doc, READ)

> "The News front pages show only the two canned stories and nothing before January 5, so the world has no news history. On day one the paper carries the real recent news of this world: the November 2025 results; laws that took effect January 1; the council's recent votes; local business openings and closings; deaths and obituaries from the records. ... It comes after the canned-news removal."
> File: "03 CTO RULINGS — 11:37 a.m. EDT, Sept 29 — PLAYTEST SCREEN 11" (id 194-xEItKhD1NDsk2b0YagXyDCNuVYU6gzuvJBLBTyMo).
> Binds: the first paper of a new life comes from the world's own pre-day-one history. It must come after entry 8.

**7. Sept 29, 11:31 a.m. CTO ruling. The TV news animation fits the TV in the scene.** (CTO, READ)

> "Personal: the animated TV news is flat and doesn't fit the TV screen in the art. Map the animation to the TV's screen area in each backdrop (a live surface with its own corner points), with perspective, so it sits in the set."
> File: "03 CTO RULINGS — 11:31 a.m. EDT, Sept 29 — PLAYTEST SCREEN 9" (id 16NZgly25UCBwXzZPhTrGQctUkW2an9bFvphX1FLtZt8).
> Binds: how the TV news is drawn in the room. Presentation only. Also says the People portraits must load at once (not press).

**8. Sept 29, 11:07 a.m. CTO ruling after Lamontae found canned news in play. Remove canned news.** (CTO, READ; the owner's complaint is quoted)

> Lamontae: "something about fishing rights in shared waters is hardcoded into the news."
> "Delete INTERNATIONAL_SUBJECTS and the international family entirely ... No fake international news. International news appears only when something real in the world produces it ... If nothing happened, the paper doesn't invent it." "Delete LOCAL_SUBJECTS. Local 'matters open for comment' come only from real local records: a council's filed ordinances and votes (Build 25), budget hearings, zoning cases." "Delete DEVELOPMENT_DISPUTES and the crisis draw keyed to them ... A pressure crisis may start only from real friction the world records, with a recorded cause and no roll."
> File: "03 CTO RULINGS — 11:07 a.m. EDT, Sept 29 — REMOVE CANNED NEWS" (id 1RZxAp8gLj8eJjUf1pjyV4OatgpxgERKb5JaluOzSKXc).
> Binds: no ready-made news sentences. Every story comes from a record. Adds a guard test that fails if either canned sentence returns. Build 23 owns this.

**9. Sept 29, 10:02 a.m. CTO ruling (quoted in Research 2). A sourced near-zero law still makes news.** (CTO, quoted, SNIPPET)

> "Claude CTO's rulings of 10:02 a.m. EDT on September 29, 2026 said a sourced near-zero effect counts as wired, and that such a law, for example local control of library materials, should still make news."
> File: "07 LAW EFFECT SIZES — The press (Build 23) — Research 2 — 10:20 a.m." (id 1c8bc7GNHFdEi1E2WQIidOrgL8BzjhQzRk6IeZ6AQ5qk), Sept 29. READ.
> Binds: laws with near-zero effects still make news when they pass. Whether a year-later story runs is not settled (see Conflicts, item 4).

**10. Sept 29 Build 23 hand-back (FINAL, 12:15 p.m.). Open questions for the CTO.** (HAND-BACK, not a ruling; READ)

> "Readership, waiting on Claude CTO. Today a law story reaches only readers with a recorded reason ... Pick (a) a household subscribes ... or (b) leave readership unmodeled ... I recommend (a)."
> "Still waiting on Claude CTO: the scale of the campaign-finance fine, the news owners' 14 rows and the 2 reporter ages."
> "Remove the canned news ... Old saves don't matter (10:02 a.m. ruling), so drop the old records."
> File: "03 HAND-BACK — Build 23 · FINAL (12:15 p.m. EDT, Sept 29)" (id 11bpGHUrlt6DmrkmbIKmTtjB3yUoE3UDKcdUlDbqhCkU).
> Binds: nothing decided yet. Open: readership (household subscription vs unmodeled), birth-rate reporting, news owners, reporter ages. Also states that the 11:50 hand-back is superseded.

**11. Sept 29, 4:05 a.m. (superseded) Build 23 hand-back. Open questions on owners and reporter ages.** (HAND-BACK, SNIPPET)

> "Still open ... the news owners, (a) park or (b) build a newsroom money record; and the two reporter ages, (a) generated people or (b) keep on the inventory. I recommend (a) for both."
> File: "03 HAND-BACK — Build 23 · Speeches Remembered (Opus High) — 4:05 a.m. EDT, Sept 29 (superseded)" (id 1fe4b7yhSc0Hwma_MTD6dBOmFzUROVSY55JzT9VGvftI).
> Binds: nothing decided. Recommends parking the news owners and generating the reporters' people.

**12. Sept 29, superseded 11:50 a.m. Build 23 hand-back. Law news design.** (HAND-BACK, SNIPPET)

> "Build 23's job is to make every law that changes something produce news in the places it touches." "Today a law story reaches only people with a recorded reason to read it ... Pick (a) a household subscribes ... I recommend (a)." "Pick (a) report births counted in the town the year before and after; or (b) leave it. I recommend (a)."
> File: "03 HAND-BACK — Build 23 · The press: laws make news (Opus High) — 11:50 a.m., Sept 29 (superseded)" (id 1OgMBSfCIVpQuJqF-3-w3ExJTZIvVRMFo_YOCUjqLl6c).
> Binds: nothing decided. Its readership and birth-rate recommendations carry into entry 10.

**13. Sept 29 research (not a ruling). Law news sizes, link by link.** (RESEARCH, READ)

> Outlets: "206 counties ... have no outlet ... and 1,561 have one." Coverage: "least to most coverage: 28% more likely (relative) to recall the member's name." Turnout: "+0.3 percentage points" per added daily paper. Closure: "+5.5 to 10.6 basis points" on borrowing cost over three years.
> File: "07 LAW EFFECT SIZES — The press (Build 23) — Research 2 — 10:20 a.m." (id 1c8bc7GNHFdEi1E2WQIidOrgL8BzjhQzRk6IeZ6AQ5qk).
> Binds: nothing decided. The owner's "one rule for all places" and "no UNKNOWN" apply to the outlet estimate. The suggested first wire is the knowledge row.

**14. Sept 28 research (not a ruling). Places and scenes.** (RESEARCH, SNIPPET)

> "Recommended build: wire the two that have real producers today (election night, town hall) and hold the other four until a producer exists. Do not add fake events to fill the pictures."
> File: "07 RESEARCH FOR CTO REVIEW, Sept 28 — R8 Places and Scenes" (id 172e0tikAgt4Rq9968Bl0yIhtvI8dIWsrQQkFRUXIDOA).
> Binds: nothing decided. Gives a rule against decorative press events.

**15. Sept 28 owner decision, via a checkpoint doc. Investigations should take place.** (OWNER, via b15 spec, SNIPPET)

> "Sept 28 #6: 'Investigations: federal, state, congressional and local investigations should take place.' D-5 approved. 'Investigations are mostly delegated.'"
> File: "Investigations and opposition research: design checkpoint (CLOUD H, Sept 28)" (id 1sItECooLfquHWO73JeL5SiprF8i2vEZ4pKTMQMHJ-2Q) and the b15 spec.
> Binds: a reporter may dig, and a rival may dig. Each digger reaches only what its authority reaches. Stays in b15, not press.

**16. Sept 27 CTO walkthrough (SNIPPET). Reuse the existing recap.** (CTO, SNIPPET)

> "Pressing Day changes the date and nothing visible happens. No summary. (Watch the World already has a 'While you were away' summary. Reuse it.)"
> File: "WAVE · TEAM D · Flow, time and being there" (id 1EqcKF8YK0rX1xJnsX88Vx0i1vrLlMNFz1RA5xAiu8pc), Sept 27.
> Binds: the recap screen reuses the existing "While you were away" summary.

**17. Sept 22 owner decision (media owners). Editors and staff can resist an owner directive.** (OWNER, READ)

> "Owner decision received 2026-09-22: editors and staff can resist an owner directive, with consequences. The exact forms of resistance and employment consequences still need bounded design and source support."
> File: "OCD MEDIA OWNERS COORDINATING OUTLETS — OWNERSHIP AND ACTIONS — 2026-09-22.md" (id 1FZzxbAEfP0sTi6JvOcLo64NxxAAdVoe_). The companion file "Our Civic Duty - media owner practices evidence gaps - September 22 2026.md" (id 1E6Wq23bc-zn34QVlAWoGUZO7smBZ2api) repeats it.
> Binds: owner directives reach outlets as separate actors. Outlets can refuse, with consequences. Group action is kept apart from the truth of a story.

**18. Sept 22 owner decision on election results. Skippable updates from aggregate reports.** (OWNER, quoted in b03, SNIPPET)

> "Sept 22 election-results decision: 'election night has a few skippable updates using aggregate reports'; results are unofficial until canvass/certification."
> File: "b03-election-night-scene" (id 1NP-75apMhOlDN2tmY_MJ9iqJ3-MWcuI8whwiNymaiNo).
> Binds: results are unofficial until certification. Superseded for the scene's structure by entry 1 (precinct by precinct). The skip control remains.

**19. Sept 22 finding (not a ruling). The front page duplicates one sentence across three outlets.** (FINDING, READ)

> "Three papers printing the identical sentence is not [right]." "Ten of the twelve stories under the lead are one of three sentences." "The headline is the event's internal summary field, which exists to identify a record, printed at a reader."
> File: "What the front page actually prints" (id 1U-M-gEHTEH1imJGipU9El5dQQPudAaiX_-EsBFAk5-M).
> Binds: nothing decided; it sets the basis for entry 8 and the headline-writing rule (prose process, civic-prose).

**20. Sept 22 finding (not a ruling). Canned sentences appear on every screen.** (FINDING, SNIPPET)

> "one line about fishing rights sits on top of every screen there is." "None of the three is a missing feature ... All three are words on a surface."
> File: "A morning's play, on main at 453b6893" (id 1todYfNfL2W0kJWMIP5IpGwpLNw-ebmYXJx5_CKb3EfA), Sept 22.
> Binds: nothing decided. Background for entry 8.

**21. Sept 22–23 findings (not rulings). Same five stories repeat for ten years; same news in every town.** (FINDING, SNIPPET)

> "The same five news stories repeat for ten years, in both towns." "Every world reports 'Shipping delays were reported along a busy international trade route.' ... Every town's council cycles through the same three items."
> Files: "2026-09-23 0140 ET | Michigan and Mississippi ... The same five news stories repeat for ten years" (id 16oEj9S0zu2TMFz9HWThpPuaFNa-Wc-cRn_n4Abh-RVg); "2026-09-23 0405 ET | Six Southern states ... Same news, jobs and scenes in every town" (id 1DDEAIXBSM0vzFO_2PLIWbTGF0n1bTq9JKepi9xirscg).
> Binds: nothing decided. Evidence for entry 8.

**22. Sept 23 Codex handoff (snippet). Owner outlets run one another's stories with credit.** (HANDOFF, SNIPPET)

> "Newsrooms that lose reporters now cover less, and an owner's outlets can run one another's stories with credit."
> File: "CODEX HANDOFF: Media ownership" (id 1CNifIdg98FZmE-JlYpWW2E-GQomVpUW47pxL4SF1xd8).
> Binds: a Codex-built media-ownership lane. Waits on a news-writing change tied to issue #510. Not a ruling.

**23. Sept 15 handshake (snippet, design not ruling). A recap of at most three changes since the last visit.** (DESIGN, SNIPPET)

> "a compact 'While you were away' note in the HUD lists at most 3 meaningful public or known changes since the recorded frontier ... Secondhand accounts are attributed."
> File: "ALIVE43 ROLE L — increment 1 READY FOR RECEIVING REVIEW — 2026-09-15" (id 1aUHEr8SQSESHKdJZlzJw7VAUUaoRZyk-VHuOA1K0pPU).
> Binds: nothing set by the owner. A session's design. Superseded where the CTO asked for reuse (entry 16).

**24. Undated owner standing rules (quoted in b26 and b22). Opinion and standards.** (OWNER, quoted, SNIPPET / READ)

> "Opinion: word of mouth and local paper at council; real polls higher up." "Local reporter knows you, calls for quotes, digs into your record, remembers how you treated them." "OCD-PRESS-003: familiarity affects willingness to talk 'without guaranteeing favorable reporting'; 'off the record' is not a magic privacy button." Constitution #17: scandals "causally grounded rather than arbitrary spectacle."
> Files: b26 (id 10X0zvfR4Afg8S0sJhe2tvpS3T6GklxMR9GdPRtWqpr4), b22 (id 1Fq7Y0hbKunYb87DuYBU4ghANfq4wU1VEeZPRUviCYqI).
> Binds: opinion reaches people by word of mouth and the local paper. Polls are only for higher offices. Familiarity does not buy favorable coverage. Off the record is not private.

---

## Conflicts

**1. Press-corps settings (b25, Oct 6) against the depiction setting (b26, Oct 5 ruling).** Both are dated Oct 6.

- Older side and newer side: entry 2 says `personalLifeDepiction` "never changes what the world knows or how people judge" and changes only wording. Entry 4 (b25) lets the player pick "stricter or looser standards before they print an allegation, more or less dogged reporters", which changes what gets printed, and so changes what people learn.
- Which wins: b26 is the owner ruling of Oct 5 and is the more specific rule for scandals. b25 is a spec that says "owner (this round)" but does not give a date. It also says "Votes ... never tilted by a setting", which a stricter press contradicts. My reading is that the press-corps setting cannot be built as written, since it changes what people see. Flag for the owner. Either limit b25's press setting to standards and dogged-ness applied only before publication (and not to what becomes public), or confirm the owner wants it to change coverage.

**2. Readership: household subscriptions (Build 23, Sept 29) against "others reached as groups" (b22, Oct 6).**

- Entries 10 and 12 recommend that each household subscribe to its town's paper from its own traits and money (option a).
- b22 (Oct 6, newer) says knowledge is written only for people the player sees person by person, and "Everyone else is reached as modeled groups at their next scheduled update." It also sets each reader's news habit from age, interests and temperament.
- The AGENTS.md two-level population rule (Oct 11) says full individuals exist only where they matter. Option (a) would make a full household subscription for every town household.
- Which wins: b22 is newer and carries the two-level rule. Build 23's (a) is still a recommendation with no ruling. Flag as open. Recommend the owner rule on it, with b22 as the baseline.

**3. Election night: precinct by precinct (Oct 5) against skippable aggregate updates (Sept 22) and batches (b03 itself).**

- Entry 1 (Oct 5) says precinct by precinct. Entry 18 (Sept 22) says aggregate reports. b03 groups precincts into reporting batches, "one beat per reporting batch ... capped at 6", with a setting `electionNightBeatCount`.
- Which wins: Oct 5 controls. The batch cap is a setting the owner has not confirmed. Flag the cap and default as open. It may read as "not precinct by precinct" to the owner, who should confirm.

**4. Near-zero laws and news (10:02 a.m. ruling, Sept 29) against the "year later" story (Build 23 FINAL, Sept 29).**

- Entry 9 says a sourced near-zero law "should still make news." The 12:15 p.m. FINAL hand-back says it makes news when it passes, but a year on "it gets no story, because a near-zero effect changes no figure."
- Which wins: the 10:02 ruling is the owner-level rule. The FINAL is a team's implementation, and it is the later document. Flag: the owner's ruling says news, the implementation says news on passage only. Confirm which he means.

**5. Canned news: removal (11:07 a.m.) against the existing paper's "international news" (Sept 22 finding and Build 23 step 1).**

- Entry 8 says no international news unless a real law or trade change produces it. The Sept 22 finding and the Sept 29 hand-back both treat the shipping and fishing stories as the canned content to delete.
- Which wins: no conflict in the rules, because entry 8 is newer and the FINAL follows it. Noted for completeness: the Sept 22 record "The same five news stories repeat" is out of date.

**6. Off-Drive owner rule that binds the press (not from Drive, for completeness).** AGENTS.md "An effect is a read, not a record (Oct 13)" and "This is a game, not a spreadsheet (Oct 14)" say depth comes from people, money and places reacting, not from more paperwork, and that a mechanic is built only when the golden path needs it or the owner asked for it by name. Entry 10's question on a "campaign-finance fine" and entry 11's question on "news owners' 14 rows" are both paperwork-like and may need that test before a decision.

---

## Counts

- Drive searches: 15 (required 12).
- Files read in full or truncated: 10.
- Dated rulings and quoted decisions listed above: 24 (7 owner, 4 CTO, 2 of them via quotes; the rest are hand-backs, research, findings and designs, each labeled).
- Conflicts: 6.
