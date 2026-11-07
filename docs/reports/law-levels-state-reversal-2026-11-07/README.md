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

[Ban paper](ban-paper.png) and [restoration paper](restore-paper.png) were captured from the native Politics → Your office → Read the bill screen, after the sequence. Both show the bill text, roll call and enacted decision. The ordinary floor process added other sections: S3 repeals the cash-bail question and S4 repeals the teacher-salary question. Those sections are retained in the proof.

The papers' right-hand estimates read today's law: reopening S3 after S4 says “Amends S4,” and a local-power switch is displayed as a percentage. These are observed presentation limitations, not historical evidence. The roll calls and decisions are historical; the saved law-reader answers above establish suspension and restoration. No screen code was changed.

Hamburg, New Jersey (place `3429220`), replay `8d5e52aae98296b1`, world seed `8d7626e2436513a931b1b81a4ac846ecda301b2b4ffb642a4544f941d44d0155`.

Reproduce from the repository root (use the required environment for every npm command):

```sh
OCD_STORAGE_OVERRIDE="cloud session, owner approved Oct 14" NODE_OPTIONS=--max-old-space-size=8192 node --import tsx scripts/law-levels-state-proof.ts 8d5e52aae98296b1 --serve
```

The script writes `/tmp/law-levels-state-proof.json`, leaves the senator selected and serves `/play`. Continue the existing life, open Politics and Your office, read S3 on page one and S4 on page two. Without a replay argument it draws a fresh place; a losing vote is reported as an unsuccessful proof, never forced through.

This proves the state half of the requested played reversal. Congress's played enactment/repeal, exhaustive starting-law repeal coverage and the remaining federal authority research are still open.
