# OPUS-PEOPLE

## Press

Branch `people/press-and-reporters`, draft PR #4180 to main. Owner's ask (October 14): press and interviews, a press member the player befriends or fights, a paper the player can influence. One builder (Opus, high); no sub-agents ran on the code, one Sonnet research helper read the payroll and money paths.

Checklist:

- [x] Reporters and editors are named full people with jobs at the outlets and pay on the journal, paid from the outlet's revenue. The outlet's lean is its head's and its audience's; followers pick the outlet nearest their lean.
- [x] Reporters pick stories from public records by their readers' care, the record's proximity and the people it names, and their own causes and grudges; every story has a topic; a repeal or a closure is an ending. The news module's stand-in outlet and its delivery of every public record to every resident are replaced where the press runs.
- [x] Interviews read the outlet's readers, the race, the record and the party; answers carry the conversation's moves and the lie; the outlet prints the interview with its slant; a lie against a vote may be dug up weeks later.
- [x] Relationships with the press: the closest reporter asks; a refusal and a speech against the outlet are events the outlet's people may answer with a grudge; grudges sharpen picks and slant; distrust moves followers away.
- [x] Bring it up, record side: readers hold which outlet printed what, in the shape bring-it-up reads.
- [x] Owners and bias: every outlet has an owner (a person), whose views set part of its lean and whose regard (closeness, a grudge, how near their views sit) for the people a story names turns its framing; an owner's grudge against a candidate's rival warms the candidate's coverage.
- [x] A national tier: cable, a magazine, an online show and a national paper with generated names, covering the nation and the town's state.
- [x] A hidden act surfaces to a reporter (U2): the one who knows decides whether to tell, the reporter whether to dig, the owner whether it prints.
- [x] Received: each printed story records the named people it reached and the counted residents who follow the outlet.
- [x] Anyone in a race or a seat (the player included) may ask an outlet for an interview at any time; the outlet decides by its reads (newsworthiness, the editor's and owner's regard, its followers who know them), and a refusal is a record with those reads.
- [ ] Words: interview lines and the printed-story row in bring-it-up (words session, after PR #4156).
- [ ] Favors and leaks (stopgap SG-PEOPLE-press-favors-and-leaks).

Needs from other sessions:

- Words session: an interview subject in the conversation (the reporter's questions as lines; plain, further, turn, brief and the lie as choices), and a bring-it-up row for `news.read` with lines naming the outlet, the topic and whether it ended something.
- OPUS-CORE: identity fill-in with a household and budget (stopgap SG-PEOPLE-press-staff-households).
- OPUS-WORLD: local businesses buying ads (stopgap SG-PEOPLE-press-outlet-revenue).
- OPUS-CORE: the news archive (`past-news.ts`) still writes the old news module's `outlets` table; it should read the press's outlets so there is one list of outlets.
- OPUS-PLAY: a control for the player to ask an outlet for an interview while holding a seat (the record side is `requestInterview` with a person id).
- OPUS-GOV (elections): `makeStatements` appends repeated stances and reuses promise ids (elections audit defects 31 and 32); interviews now call it once per interview.

Questions for the owner: whether papers endorse candidates (stopgap SG-PEOPLE-press-endorsements).

Sub-agents: none wrote code. One Sonnet research helper read the payroll and money paths (read-only).

What the owner can play now: the town's outlets have names, owners and named people; their stories follow what the town's council and state do, slanted by who owns them, and the people who read them change their minds on those questions. A candidate can ask for an interview, and an outlet whose people dislike them can say no.
