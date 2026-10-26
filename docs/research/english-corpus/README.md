> Owner, Oct 15, 2026: the attestation rule below ('kept when at least two documents say it and one is a public-domain record') was this session's own habit, never the owner's ruling, and is withdrawn. Banks are now built by development-time authoring to calibrated patterns (see `.agents/skills/words-engine/SKILL.md`); the corpus stays as one source of pieces and patterns.

# The mined English corpus (OPUS-WORDS)

How the phrase banks in `data/english/parts/` are built from real American speech, and where the raw text lives.

## The rule

- A bank part is a whole sentence (or a sentence's opening clause) that real people said or wrote, with the words that name a record (a person, an employer, a town, a date, a fee) replaced by slots the game fills from its own records.
- It ships word for word only from public-domain records: federal works (17 U.S.C. 105) and state works from states whose government works carry no copyright (Florida: _Microdecisions, Inc. v. Skinner_, 889 So. 2d 871, Fla. 2d DCA 2004). Every part records its source document, date, address and license.
- A part is kept when at least two documents say it and one is a public-domain record from 2015 or later, which becomes its source. A hearing's date is when it was printed, so hearings before the 114th Congress never serve as the source. The WPA life histories (1936 to 1940) count toward the two documents but never ship as the source.
- A part cites a record the government wrote or said itself (hearings, the Congressional Record, agency news releases and meetings) ahead of an oral history whenever both attest it. Some oral-history interviewees signed deeds of gift giving their rights to the United States, so their words may be government-owned rather than public domain; every part is a short, common sentence (short phrases carry no copyright, 37 C.F.R. 202.1(a)), and it is never taken from a transcript carrying a copyright or permission notice.
- The filing clerk's bank accepts one document, because few transcripts record a clerk explaining filing.
- A sentence that claims something about the speaker's life or the place ("I'm a nurse.", "My rent went up.") names the record fact it needs and is said only when that fact is in the record.
- A real politician's campaign slogan never ships, even from a public-domain record.
- Council minutes, meeting video, news, books, TV and interviews give patterns and counts only. `data/english/patterns/` holds older banks whose sources are not public domain; none of their text ships.

## The corpus

The raw text stays outside the repository. Rebuild it into any folder with one subfolder per source, each document as `<id>.txt` plus `<id>.json` (`id`, `source`, `title`, `date`, `url`, `license`).

| Source                                                  | Documents (Oct 12, 2026) | Where                                                             |
| ------------------------------------------------------- | ------------------------ | ----------------------------------------------------------------- |
| Congressional hearings, 2015 to 2026                    | 1,617                    | govinfo.gov, collection CHRG                                      |
| Congressional Record, House and Senate                  | about 450 days           | govinfo.gov, collection CREC                                      |
| NASA Johnson Space Center oral histories                | 317                      | nasa.gov                                                          |
| U.S. House oral histories                               | 115                      | history.house.gov                                                 |
| WPA Federal Writers' Project narratives                 | 38 and growing           | Library of Congress collections, Project Gutenberg transcriptions |
| U.S. Election Assistance Commission meeting transcripts | 65                       | eac.gov                                                           |
| Federal Election Commission guides and hearing captions | 253                      | fec.gov                                                           |
| Florida Division of Elections handbooks                 | 33                       | dos.fl.gov                                                        |

### Rebuilt October 12, 2026 (second run)

The cloud container that held the first corpus was reclaimed, so the second run rebuilt it. The first run's banks keep their parts; the second run's banks (the opening speech, news and TV, the counter, the journal's new moments) were mined over this corpus, 46,191 documents:

| Source                                                                                            | Documents | Where                                                                          |
| ------------------------------------------------------------------------------------------------- | --------- | ------------------------------------------------------------------------------ |
| Daily Compilation of Presidential Documents, 2009 to 2026                                         | 17,712    | govinfo.gov, collection DCPD                                                   |
| State of the Union addresses, 1790 to 2008 (count toward attestation only; never the source)      | 222       | Project Gutenberg eBook 5050                                                   |
| Congressional hearings, 2015 to 2026 (a sample)                                                   | 2,500     | govinfo.gov, collection CHRG                                                   |
| Federal agency news releases (Justice, EPA, Park Service, Treasury, Energy, NASA, FAA, FDA, NOAA) | 19,303    | each agency's newsroom on its .gov site                                        |
| National Weather Service text products, one week                                                  | 3,072     | api.weather.gov                                                                |
| NASA oral histories                                                                               | 1,388     | nasa.gov                                                                       |
| U.S. House oral histories                                                                         | 300       | history.house.gov                                                              |
| U.S. Senate oral histories                                                                        | 51        | senate.gov                                                                     |
| Eisenhower Library oral histories                                                                 | 15        | eisenhowerlibrary.gov                                                          |
| Election Assistance Commission transcripts, guides and pages                                      | 330       | eac.gov                                                                        |
| Federal Election Commission guides, transcripts and pages                                         | 288       | fec.gov                                                                        |
| Florida state, county and city election and clerk pages                                           | 420       | dos.fl.gov and Florida county and city sites (only .gov pages can be a source) |
| usa.gov pages                                                                                     | 260       | usa.gov                                                                        |
| Federal counter pages (IRS, Social Security, National Archives, GSA, Postal Service)              | 330       | each agency's site (only .gov pages can be a source)                           |

### Oral-history rebuild for the memoir journal (October 14, 2026)

The memoir shapes (`memoir-*` groups in `shapes/journal.json`) were mined over a smaller oral-history corpus, 1,095 transcripts. The first run's journal parts keep their entries; the memoir parts are added beside them.

| Source                     | Documents | Where             |
| -------------------------- | --------- | ----------------- |
| NASA oral histories        | 981       | nasa.gov          |
| U.S. House oral histories  | 107       | history.house.gov |
| U.S. Senate oral histories | 7         | senate.gov        |

Kept out: 424 Truman Library interviews, which carry the notice "may not be published in full except by permission". A bank's shapes may name the collections it counts (`sources`); the opening speech counts only what Presidents said.

### Family scenes and the office scene (October 15, 2026)

The Words session rebuilt a corpus for the director's family scenes (a parent's lost job, an eviction) and the office scene's one-on-one ask, 11,442 documents. The family-scene shapes (`family-open`, `job-cause`, `job-hope`, `eviction*` in `shapes/conversation.json`) and the office ask (`member-ask` in `shapes/address.json`) were mined over it; earlier parts keep their entries and the new ones are added beside them.

| Source                                                                                         | Documents | Where                        |
| ---------------------------------------------------------------------------------------------- | --------- | ---------------------------- |
| Congressional hearings, 2015 to 2026 (a sample)                                                | 2,500     | govinfo.gov, collection CHRG |
| Congressional hearings on housing, jobs, families and the like (by title), 2015 to 2026        | 1,192     | govinfo.gov, collection CHRG |
| Congressional Record granules, 2015 to 2026                                                    | 2,342     | govinfo.gov, collection CREC |
| Daily Compilation of Presidential Documents: town halls, roundtables and remarks, 2009 to 2026 | 3,511     | govinfo.gov, collection DCPD |
| NASA oral histories                                                                            | 1,244     | nasa.gov                     |
| U.S. House oral histories                                                                      | 580       | history.house.gov            |
| U.S. Senate oral histories                                                                     | 59        | senate.gov                   |
| National Park Service oral histories                                                           | 14        | nps.gov                      |

Still unattested twice with a 2015-or-later public-domain source, so unsaid: a parent saying they were laid off ("I was laid off.", "They let me go."), that they are looking for work, why the household was evicted ("We couldn't pay the rent.") and where it goes next ("We're going to stay with {relation}."). The director leaves those unsaid; the scene still tells the closure and the move from the records it can word.

## Rebuilding the banks

`scripts/english-corpus/mine-all.sh <corpus-dir>` re-mines every bank in one pass over the corpus from its candidate shapes in `scripts/english-corpus/shapes/` and writes each bank's unattested shapes to `not-attested-<bank>.json` here. A shape that no record says is a sentence the game cannot use yet; widening the corpus is how a gap closes, never writing the line by hand.
