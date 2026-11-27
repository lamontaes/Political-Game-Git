# Notes that were in src/director/data/scene-talk-rules.json

Moved out of the game's data on Nov 27, 2026 (CTO's story audit, row C9), word for word. The data keeps what the game reads.

## `tree.about`

Owner, Oct 15, night: a scene is a tree, a branch for each thing the player might say. The bounds keep a page readable: past maxNodes only the branch the player's traits lean toward is kept.

## `grounds.about`

A request needs its ground on record (owner, Oct 15, night). A donor leans on you only above this share of the money a campaign raised; below it the donor scene is not staged.

## `bluntGreeting.about`

So scenes do not all open the same way: an asker whose sociability is at or below minus this level skips the greeting and opens on why they came; trait levels run from -2 to 2.

## `familyStakes.about`

Who at home has a stake in a filing (scenes-from-life, spouse-stake-after-filing). A relative reacts to a filing only when the household's records give them one; the strongest stake casts the relative and gives the scene its facts, and with none the scene is not staged. Read from the household's savings and costs, the filing's election date, and the children's birth dates; nothing is rolled.

## `passedBetween.about`

What an earlier scene between the same two people left on the record, read by the one relation reader (relation-facts.ts) so a later scene starts from it: the asker came before (`asked-before`), and the asked person's own answer then, by move, was help or a refusal. Moves only; no sentence. The answerer's move is the `move` on the scene.reply record (the player's reply, or the colleague's answer where the player asked).

## `tieSides.about`

Which side of their tie a scene's two people stand, read from the relationship record so a friend and a rival say different things (scene-standard rule 4). A rival is one whose last contact on the tie was a quarrel; a friend is one nearer full closeness than none.

## `endingStrain.about`

What an ending that strains a tie writes to closeness (the plan of Oct 28, section 3: each ending's keeps is a write to the engine that owns it). Each row is hours, or (unit "share of the tie") a share of the hours the tie stands on today (closeness.ts tieHoursBetween). The closeness engine reads negative hours as a quarrel, tempered by who holds on to it. A negative value warms the tie (an ending settled in the scene). An ending that keeps a favor or a promise is written on the scene's record (facts keeps and ending, and for a promise its kind and tie from promise-endings.json); the promises engine keeps it and settles it (src/core2/modules/promises.ts).

## `floorRegister.about`

How a floor debate is worded by the body that holds it (Words lead, Nov 14: three registers, chosen from the body's data row). A state or federal chamber is formal whatever its size; a local body with at most this many seats is a small board (a hand up, first names); a bigger local body is a council or county board (the chair calls on people, no yielding, no recognizing). The register reaches the scene as one fact: body-formal, body-council or body-small.

## `timeOfDay.about`

When a scene's lines may say what hour it is (words-scene-time-of-day-words). The hour is the player's clock as the scene plays. Before noon the scene is in the morning, and a morning greeting ("Morning. Here to file?") may play; from noon it is the afternoon; both are the daytime, when a line that says the afternoon is still ahead ("I'm vetoing it this afternoon.") may play. From the evening minute on, a line that says the present is the evening ("Thanks for your time tonight.") may play. A scene whose hour no clock keeps sets no mark.

## `concession.about`

Which endings of the concession call (purpose concession-call, scene race-lost) mean the candidate conceded and which mean they would not concede that night. The director marks the reply record conceded yes or no; the press reads the mark and puts the concession, or the refusal, on the public record the paper prints. Ending ids only; no sentence.

## `letterFacts.about`

What a relative's letter may say about the days around it (letter-facts.ts). Read from the person records and the kin-contact engine's records; nothing is rolled.

## `occasionFacts.about`

What a celebration or a gathering with someone missing may say about the days around it (celebration-facts.ts, gathering-facts.ts). Read from the life news and the person records; nothing is rolled.

## `noticeShortfall.about`

How a notice to pay or leave is worded to fit what is owed (owner, Nov 8 playtest: 'that far behind' said of a $14 shortfall). The shortfall is read against the rent the lease asks each month. Under `littleBelow` months of rent the lines call it small (they still say it is owed); from `deepFrom` months of rent they call it deep. In between, the lines say the amount and how long it has run and call it neither. Wording only; the landlord's own weighing of amount and months is the housing engine's.

## `departureWhy.about`

Why someone is leaving, said only when a record names it (owner, Nov 8: a farewell names the leaving; 'why' only when the records say). Each row is a key in the departure's `reasons` (an event that added to the pull, or a push the moves engine read) or `basis:<destinationBasis>`; the fact it sets is the one the bank's lines require. Rows are tried in order and the first present names the reason; no row present, and no reason is said. Moves only, no sentence.

## `note`

How a scene with a purpose picks the player's path. Moves only, no sentence. The player's character leans toward the reply whose act kinds (`scene-talk.move` in data/content/trait-decisions.json) its traits pull toward most, by the same lean the asker's answers read. Nothing here is a roll; a tie goes to the stable hash of the scene.
