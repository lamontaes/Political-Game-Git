# Stand-in triage: words (Nov 10, 2026)

Owner test (Nov 10): kept 0 (with what the player sees), dropped 3 (too in depth), of which borderline 0.

Rows: 3. Still faked 3, already replaced 0, partly replaced 0, could not tell 0. Closes by: code 2, research 0, data 0, design 1, owner call 0. New items: 0.

| Stand-in                                | Still true? | What closes it | Pool item                                    | Size | May stay at early access?                                                         | In plain words                                                                                                  | Where the player sees it              |
| --------------------------------------- | ----------- | -------------- | -------------------------------------------- | ---- | --------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| SG-WORDS-nation-no-moved-from-tie       | still faked | code           | none (dropped: too in depth (owner, Nov 10)) | S    | yes: minor; family, work and neighbor ties already read                           | The national news heading does not count a state you moved away from as a link to it.                           | dropped: too in depth (owner, Nov 10) |
| SG-WORDS-milestone-birthday-full-people | still faked | design         | none (dropped: too in depth (owner, Nov 10)) | M    | yes: the press is basic at early access; counted residents have no name until met | The paper prints round-birthday and retirement notices only for named residents, never for unnamed townspeople. | dropped: too in depth (owner, Nov 10) |
| SG-WORDS-letters-counted-readers        | still faked | code           | none (dropped: too in depth (owner, Nov 10)) | M    | yes: the press is basic at early access; full readers write letters               | Only named readers write letters to the editor; unnamed readers never do.                                       | dropped: too in depth (owner, Nov 10) |

## Evidence

- `SG-WORDS-nation-no-moved-from-tie`: src/bench/nation-news.ts:11-14 comment says moving away is not a tie; no moved-from field found in types.ts. Marker is a comment at line 13 (register line 0).
- `SG-WORDS-milestone-birthday-full-people`: src/core2/modules/press.ts:3089-3098 loops c.peopleByPlace full residents only; marker at 3095. Replacement rule decided by CTO Nov 1 (fill in when printing).
- `SG-WORDS-letters-counted-readers`: src/core2/modules/press.ts:3233-3236 outlet loop picks letter writers from full stances; marker at 3236. Rule decided by CTO Nov 1 20:00.

## Questions for the owner

None.
