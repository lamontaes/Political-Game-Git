# Hamburg: a state ban suspends a town rule, and repeal restores it

New Jersey lawmakers passed a ban that suspended Hamburg's rent rule, then restored local authority and brought the same town rule back into force. Both decisions appear on the native bill papers.

The replay was drawn before the first probe. The route opens an ordinary new life, uses the existing bill catalog, `draftBill` and `holdVote`, signs as the played governor or mayor through `/api/desk`, and advances the game's clock through its request handler. No members, preferences, laws, or roll calls are inserted. Sponsorship and executive signatures are explicit player choices; chamber votes are the engine's decisions. This is an engine-driven played route with native screen proof, not a claim that every action was clicked in the browser.

| Step                     | Body and bill              | Recorded vote | Law after the effective date                                 |
| ------------------------ | -------------------------- | ------------- | ------------------------------------------------------------ |
| Grant local power        | New Jersey legislature, S1 | 117 yes, 0 no | Town can legislate                                           |
| Enact rent stabilization | Hamburg council, 2025-3    | 4 yes, 1 no   | Town ordinance governs January 24                            |
| Bar local power          | New Jersey legislature, S3 | 117 yes, 0 no | State answer governs January 26; town ordinance is set aside |
| Restore local power      | New Jersey legislature, S4 | 83 yes, 37 no | Same town ordinance governs January 27                       |

The ordinance that returns is `law:place:3429220:city:us-policy-positions:housing-land-use.rent-stabilization:general:2025-01-24:2025-3`. The state answer during the ban is `law:US-NJ:state:us-policy-positions:housing-land-use.rent-stabilization:general:starting`. [Records](records.json) preserve the actual writer and reader output at each step, including bill IDs, effective dates, authority and governing record. Full roll calls are built on demand in the bill paper; the report keeps their tallies.

[Ban paper](ban-paper.png) and [restoration paper](restore-paper.png) were captured from the native Politics → Your office → Read the bill screen, after each vote and signature, before that act takes effect. S3 shows permission changing from 1 to 0; S4 shows 0 to 1 and correctly names S3 as the law it amends. Both show the bill text, roll call and enacted decision. The ordinary floor process added other sections: S3 repeals the cash-bail question and S4 repeals the teacher-salary question. Those sections are retained in the proof.

The permission switch still displays as a percentage, an observed presentation limitation. Reopening historical papers after later acts also makes the estimate read today's law. The screenshots avoid that ambiguity by recording each enacted bill before its effective date; the saved law-reader answers establish what governs after each date. No screen code was changed.

The law reader reuses its existing per-day result cache for all current-date callers, clears it on a law write or date change, and still resolves historical or traced reads afresh. A series with no grant/bar rows skips construction of an empty authority answer. The replay after those changes has the same bill IDs, vote counts and governing-law answers as the original screenshot run.

Hamburg, New Jersey (place `3429220`), replay `8d5e52aae98296b1`, world seed `8d7626e2436513a931b1b81a4ac846ecda301b2b4ffb642a4544f941d44d0155`.

Reproduce from the repository root (use the required environment for every npm command):

```sh
OCD_STORAGE_OVERRIDE="cloud session, owner approved Oct 14" NODE_OPTIONS=--max-old-space-size=8192 LAW_PROOF_SCREENSHOTS=/tmp/law-levels-state-papers node --import tsx scripts/law-levels-state-proof.ts 8d5e52aae98296b1 --serve
```

The script writes `/tmp/law-levels-state-proof.json` and captures the papers under `/tmp/law-levels-state-papers` with Playwright. Set `PLAYWRIGHT_BROWSERS_PATH` if the browser is installed outside Playwright's default location. It leaves the senator selected and serves `/play`. Continue the existing life, open Politics and Your office, read S3 on page one and S4 on page two. Without a replay argument it draws a fresh place; a losing vote is reported as an unsuccessful proof, never forced through.

This proves the state half of the requested played reversal. Congress's played enactment/repeal, exhaustive starting-law repeal coverage and the remaining federal authority research are still open.
