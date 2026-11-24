# Stand-in triage: jobs (Nov 10, 2026)

Owner test (Nov 10): kept 0 (with what the player sees), dropped 1 (too in depth), of which borderline 0.

Rows: 1. Still faked 1, already replaced 0, partly replaced 0, could not tell 0. Closes by: code 0, research 0, data 1, design 0, owner call 0. New items: 0.

| Stand-in                                   | Still true? | What closes it | Pool item                                    | Size | May stay at early access?                                                                                                                    | In plain words                                                                                                                                                       | Where the player sees it              |
| ------------------------------------------ | ----------- | -------------- | -------------------------------------------- | ---- | -------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| SG-JOBS-corporate-office-as-service-seller | still faked | data           | none (dropped: too in depth (owner, Nov 10)) | L    | yes: the row cites the NAICS 55 basis and marks the kind ESTIMATED; staff are now paid (item world-corporate-office-opens-unfunded is done). | A regional office of a firm earns money as if it sold services to outsiders, instead of being paid by its parent firm, because the game does not record who owns it. | dropped: too in depth (owner, Nov 10) |

## Evidence

- `SG-JOBS-corporate-office-as-service-seller`: src/core2/data/business-books.json:459-465 (enterprise:corporate-office -> kindId professional, fundingRoute business, stopgapId at 464). No firm-ownership record read anywhere for it. Closing needs firm ownership data, then a parent-allocation payer; keep it by counts.

## Questions for the owner

None.
