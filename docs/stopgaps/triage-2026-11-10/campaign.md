# Stand-in triage: campaign (Nov 10, 2026)

Owner test (Nov 10): kept 2 (with what the player sees), dropped 1 (too in depth), of which borderline 0.

Rows: 3. Still faked 2, already replaced 1, partly replaced 0, could not tell 0. Closes by: code 1, research 1, data 0, design 1, owner call 0. New items: 0.

| Stand-in                                | Still true?      | What closes it | Pool item                                    | Size | May stay at early access?                                                                                                                   | In plain words                                                                                                           | Where the player sees it                                                          |
| --------------------------------------- | ---------------- | -------------- | -------------------------------------------- | ---- | ------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------- |
| SG-CAMPAIGN-offer-full-people-only      | still faked      | code           | none (dropped: too in depth (owner, Nov 10)) | M    | yes: the campaign's own asks and the two-tier fill-in reach the wider town; golden path does not need counted offers                        | Only people the game already names offer to volunteer for a candidate; the unnamed wider town never walks up and offers. | dropped: too in depth (owner, Nov 10)                                             |
| SG-CAMPAIGN-manager-changes-nothing-yet | still faked      | research       | research-campaign-manager-effect (new)       | M    | no: the owner asked for the manager (Oct 27); a staffer who changes nothing is a faked mechanic, but it can stay until the research is done | Someone close can run your campaign and shows up in scenes, but the campaign runs exactly the same with or without them. | His own campaign: the manager he chose (owner asked Oct 27) and how the race goes |
| SG-CAMPAIGN-volunteer-shift-no-scene    | already replaced | design         | none                                         | S    | yes: replaced                                                                                                                               | A volunteer's evening of doors now shows up in the journal.                                                              | The journal line about a volunteer's evening of doors                             |

## Evidence

- `SG-CAMPAIGN-offer-full-people-only`: src/core2/modules/campaigns.ts:2055-2075 offersToHelp skips candidates with no knownIds and works from full people only (marker in doc comment at :2055). Closing would be monthly, by counts times volunteerReason.
- `SG-CAMPAIGN-manager-changes-nothing-yet`: src/core2/modules/campaigns.ts:1980 managerReason; staffIds (:156) read only to add/remove staff (:1844-2033, :2481), no decision reads it. Cheap: read staffIds where a campaign already decides.
- `SG-CAMPAIGN-volunteer-shift-no-scene`: Marker still at src/core2/modules/campaigns.ts:2824-2825 (emit of volunteer-shift). Reader: src/director/data/journal-rows.json:494 kindPrefix event:volunteer-shift (doors fact) and src/director/data/director.json:1044 cause channel, with bank line journal.office-line-volunteer-shift in data/english/parts/journal.json:9222; added in commit 09a28996 (2026-11-10, pool release play-stop-02). Row's own replacement allowed 'the week's journal line'. Replaced by: a journal row (src/director/data/journal-rows.json, kindPrefix event:volunteer-shift) and a director cause (src/director/data/director.json, eventKind volunteer-shift) read the event, worded by data/english/parts/journal.json (commit 09a28996). The marker and api.stopgap call remain at src/core2/modules/campaigns.ts:2824

## Questions for the owner

None.
