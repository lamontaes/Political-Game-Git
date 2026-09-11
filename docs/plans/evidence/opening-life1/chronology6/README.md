# OPENING chronology follow-up

Source base c5463eb1446b96fcc7b0db9010c38a557a276c74. Requested UI failure head ff82c80b342b006a652c8d8b76cf92ef6e6ab579. UI workspace untouched; exact combined proof uses isolated /private/tmp/pg-opening-chronology-ui.

Reproduced narrative-life.test.ts:551. EpisodeInstanceSummary firstPlayedAt and lastPlayedAt are IsoDate, while ordinary scenes now legitimately continue later within the same day. Requiring different dates would invent a delay; using >= would no longer prove chronology. The proof instead captures canonical epoch minutes before each actual story choice, binds them by instanceKey, checks the complete stage list and first/last reported dates, and requires every adjacent stage to occur strictly later. Original seeds, stage inclusion, identity hashes and wording controls remain unchanged.

A related actual adapter defect: life-story charged the opening definition's duration for all stages. It now uses the authored five minutes for follow-through. Regression proves the actual adult reading moment's disclosed15minutes followed by the continuation's disclosed5minutes, totaling20. This does not modify the episode writer, schema or historical date projections.

Donor narrative35/35 and OPENING22/22 pass. Exact UIff82c80 plus this three-file patch:63/63 across narrative-life, opening-repair6 and unchanged ordinary-conversation-integration. No full/heavy run. LAND owns that slot.

The corpus transcript gap remains open. Both original fixed six-choice traces now include a same-day free-time continuation, consuming one choice and changing the later history reached. This explains why a fixed number of scenes is not a stable duration. No seed, family exclusion, outcome override, catalog filtering or assertion relaxation is offered as a repair. Corpus artifact regeneration is still actual-tree evidence; the final scanner measured53,802 literals /2,115 inventoried /367files.

LEARN: test elapsed-time promises at canonical clock precision; day-only summaries cannot distinguish same-day sequential actions. Check the disclosed per-stage duration through both scene and story adapters.
