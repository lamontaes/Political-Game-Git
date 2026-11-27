# Notes that were in src/director/data/situation-types.json

Moved out of the game's data on Nov 27, 2026 (CTO's story audit, row C9), word for word. The data keeps what the game reads.

## `note`

Story director situation library on the new core (docs/design/director-on-core2.md). Ported from data/content/situation-types.json and draft pull request 3914. Structure only: no type holds a sentence; records fill every role and the English engine voices every line. Situation types are human moments only. Election night is folded into news-arrives and celebration with the elections engine as the cause; the door-knocking flow is folded into first-meeting and visit with the canvass as the reason. Each cause matches a director moment by its label, its counterpart, a thread turn or a callback reason; a cause whose producer the new core does not have yet names it in awaitingProducer and matches nothing. Each type's tag names its situation key (loss, threat, honor, news-received, favor-asked, vote-wanted, arrival, departure, routine; scripts/english-corpus/moves.json), its endpoint (money, bill, political, personal) and the banks' registers its lines are composed in; the coverage table (npm run words:coverage) counts the parts for every type, role, move and register. Formal procedures still run by their own engine's rules; the civic types (a race won or lost, a floor vote, a signing, a veto, an appointment, a recall, a public hearing, a press interview, a scandal, a law reaching someone, a campaign stop, a filing, a layoff, an eviction notice) are the human moments inside them, each naming its cause record in causeRecord and waiting for the director's producer. A type with a purpose (src/director/data/purpose-arcs.json) plays as an exchange: its asker role opens and states the purpose, the asked role answers with four replies, and the exchange runs until the purpose is resolved or refused (owner, Oct 15, evening). Its stakes name the record facts the exchange turns on.

## `scheduling.note`

Calibration, owner-adjustable (docs/design/story-director.md, part 4). paces: about how many scenes a year a life carries in each band of childhood agency, and as an adult; a moment becomes a scene when it ranks within that many of the life's moments over the trailing days, itself included. openDays: how many days a scene stays open from the date its timing sets. householdScenes: moments that stage their scene at home whenever a member of the subject's household is in them, whatever their impact (owner, Oct 14, 2026, night: family scenes come from the household's own records; a mother asking the player to sit down for a lost job). householdRecordScenes: records of the whole household (the housing engine's eviction names every member) that stage a family scene at home for each member. ownRecordScenes: records of the subject's own life that name them (filing for office, the count of their own race, a party chair's ask that they run, a printed story that runs against them or their bill, an outlet's invitation to an interview or the race's debate, word of a rival's paid message passed on by someone it reached, a rival filing against them, a petition to recall them) that are met the same day, at home or, for an officeholder, at the office or in the chamber (the evening before a roll call), by phone, in town at a petition's table, or at the venue where the record happened (the count of their own race on election night, the clerk's counter where they filed) (ownRecordSettings), as those records say. metWhereYouAre: label prefixes of moments met where the player is that day, a scene from circumstance (src/director/data/circumstances.json; owner, Oct 27: any record can call a scene when the circumstances fit), staged that day whatever its impact; its producer keeps the spacing.

## `scheduling.seasonCap.note`

The most scenes of one situation type a person is staged in a season (91 days, a quarter of a year); past it, that type's causes go to the journal until the window moves on. Checked against the played year Neodesha, Kansas, seed words-0115 (docs/reports/scene-web.md), where the floor vote fired 121 times and 29 of 80 types fired: six a season leaves room for a legislator's weekly sittings to stage one scene in two and lets other types through (the plan of Oct 28, section 3). The player's own asks (a type that is playerAsks and caused only by an event of the player's act: bill-sign-on, vote-sought, serve-sought) are not counted or held: the record limits them (scheduling.ts pressedByPlayer; stages of a bill, Nov 14).

## `types[0].note`

Someone is home from prison (the justice engine's release record). Either the player is the one who came home and a relative asks what happens now, or a relative or housemate who came home asks the player for a place to stay until there is work, for help finding work with a record, and to know where they stand after what the term cost. How long they were away, whether the term ended their job, whether they share the household and the child at home are said only when the records give them. What the player agrees to or promises is kept on the reply record (a promise); a talk put off strains the tie.

## `types[2].note`

A relative who lives elsewhere writes to the player (kin-contact.ts's family.contact, one whole contact a month at full closeness). The letter asks for something: a visit, a call or a letter back, or to be told how the player is. Where the writer lives, what changed in their life since their last letter (a child born, a wedding, a move, new work, a serious illness), a birthday of the player's they missed at the table and their own birthday coming are said only when a record gives them. The player's reply is written back; what they agree to or promise is kept on the reply record (a promise), and a no that is pressed strains the tie.

## `types[6].note`

A tie that grew over time together (the relationship engine's contact tie, turned from an acquaintance to a friend). The other asks the player for something that tests the tie: to come along somewhere or to do them a favor. What the two share is said only when a record gives it: the employer both work for (the jobs engine), the school they were both at in one school year or their children share (the school engine), the party both belong to (the parties engine), the town the other lives in. What the player agrees to or promises is kept on the reply record (a promise); a no that is pressed strains the tie.

## `types[7].note`

People gather to mark something that happened in the player's household: a wedding (partnerships.ts's family.married) or a new job (the job row and its employer). A relative at the celebration asks the player for something the occasion brings: a few words for everyone, a picture, a dance, a talk about an old quarrel that the tie's record kept, a hand finding work. Whose occasion it is, what it is, the guest's town, a new child and whether the guest is out of work are said only when a record gives them. The reply is written back; what the player agrees to or promises is kept on the reply record (a promise) and a no that is pressed strains the tie.

## `types[8].note`

The day after the player graduated (the school engine's graduation result, passed), someone they live with marks it at home, scored on tie and sociability (circumstance row graduation-home). They say so and ask what comes next; the reply is a scene reply the core's relationship writer reads as time together.

## `types[9].note`

The day after the player's senior year ended without a diploma (the school engine's graduation result, not passed), someone they live with sits them down at home, scored on tie and sociability (circumstance row no-graduation-home). They say it isn't the end and ask what happened and what comes next; the reply is a scene reply the core's relationship writer reads as time together. The counterpart of diploma-home: a senior's year ends in one of the two, never neither.

## `types[10].note`

A birthday at home with the closest relative who lives elsewhere missing (kin-contact.ts's family.gathering-missed). Someone in the household asks the player to reach out to the one who was missing: to call, write, visit or make the first move. Whose birthday it was and the age they turned, who was missing and where they live, what changed in the missing relative's life lately (a child born, a wedding, a move, new work, a serious illness) and whether the player's last word with them was a quarrel are said only when a record gives them. The reply is written back; what the player agrees to or promises is kept on the reply record (a promise) and a no that is pressed strains the tie.

## `types[12].note`

A new hire at the player's employer (the jobs engine's new job record) comes over to introduce themselves and asks the player something grounded in what the two share: how things run at the employer, the job if it is the same, the school they were both at in one year or their children share, the party both belong to, the town the newcomer drives in from. What the player agrees to or promises is kept on the reply record (a promise); a put-off that is pressed strains the tie.

## `types[20].note`

A housemate got the player help when a serious illness began (rescue.ts's health.rescued, written from the health engine's onset record): the grown person in the home closest to the player called for help and stayed, and the rest of the household saw it. Afterward that person asks the player for something: a ride to the doctor, a visit to one, to stay close for a few days, a promise to say the moment they feel sick again, leave to tell the family, a word with a child who was in the room. Who got help, whether they are the player's partner, whether a child was in the room and whether other grown people saw it are said only when a record gives them; the illness itself, its kind and how bad it was are never named. The reply is written back; what the player agrees to or promises is kept on the reply record (a promise) and a no that is pressed strains the tie.

## `types[21].note`

The player visits someone they know whom the justice engine holds: a prison term handed down (justice.imprisoned) or a person held for want of bail (justice.held-before-trial). The person inside asks the visitor for something real: money on their account, a child looked after, a lawyer called, a word taken to the family. How long the sentence is, the day they get out and the bail are said only when the record gives them. What the visitor agrees to or promises is kept on the reply record (a promise); a visit that ends on a refusal pressed strains the tie.

## `types[28].note`

Election day is a scene (owner, Oct 14, 2026): the player goes to their precinct's polling place, sees the poll workers and neighbors the records place there, and casts their ballot as the scene's choice, never in a menu. The visit is the director's polling-place.ts: on the eve of an election the voter's day stops at the polls, with the household members who may vote; the ballot is the elections engine's, cast through the voting engine's castBallot. The poll workers are those the voting engine's polling-place record names for the voter's precinct.

## `types[37].note`

A candidate's campaign speech, heard in person at a town hall or a campaign event, moved a listener (the listener's moment, on the cause channel, names the speaker); afterward the candidate comes over to ask for their support. The speech.heard record names the speaker, and the campaign act names the occasion. A debate is heard through the outlet's broadcast, so the candidate is not there to come over.

## `types[41].note`

The player knocks on a door on their own canvass and asks the resident for their vote (owner, Oct 8: porch scenes in a day of door knocking; Oct 27: every campaign act is a scene). The mirror of speech-afterward: the player is the candidate asking. The resident answers from where the knock left them, the campaign engine's warmth toward the player.

## `types[42].note`

While the player's petition circulates, a door on their own canvass is a signature ask (owner, Oct 28: "some scenes where you earn people's signatures ... signatures is the game's way of introducing you to campaigning"). The campaign engine asked the resident to sign (askToSign) and the petition record says whether they did; the scene tells that answer, never a second decision.

## `types[44].note`

The player asks someone to serve: today a governor candidate asks one of the people offered to run as their running mate (brief J, Nov 14). The serve-asks engine keeps the ask and reads where the person stands from their record (willingness.json); the scene is the ask, their answer, and the player's follow. Only the ending seats anyone: serving names them on the ticket, turned-down keeps the no with its reason and date, and the seat stays open.

## `types[49].note`

A disaster is recorded in the state of a governor the player plays: the executive engine's emergency-offered record names the governor and the disaster. The head of the department that leads for this disaster (data/executive/emergency.json, by incident type) opens and says what their department's records show of it; the other heads join when a room can seat more than one speaker (pool item director-emergency-briefing-other-heads). The player's answer is the declaration or letting it pass: the executive engine reads the scene reply and writes the same declaration the engine writes for any governor (declareEmergency). The engine never declares for the player (owner, Oct 14). It stops the day. The mayor's side waits on a local emergency declaration, which no engine records yet.

## `types[50].note`

A party with no one filed for a partisan seat asks one of its members to run: the candidacy engine's party-asked record names the member, the chair who asks, the party and the seat. The chair comes by the member's home. Their answer is a scene reply the candidacy engine reads: a yes is the decision to run, and the filing follows.

## `types[51].note`

A person joins a party (the party-joined record names them, the party and its leader): the leader welcomes them at the party's office and asks whether they can count on them to pitch in. What the player agrees to or promises is kept on the reply record (a promise); a put-off that is pressed strains the tie.

## `types[60].note`

The player is the sponsor of a bill the committee chair held without a hearing, and asks the chair to hear it. The chair answers from the committee record's own reasons (the chair's stand on the bill, their temperament and a close co-sponsor's pull), and the ask adds only a favor, worth more the closer the two are. An agree sets the hearing through the same reply the other direction uses; a refusal leaves the hold, and the chair says the reason the record holds.

## `types[61].note`

A birth on record brings someone close to the new parent to the door.

## `types[62].note`

Someone who shared a cause with a person asks them to come along (the cause-shared record names the cause and who shared it).

## `types[63].note`

A strike or protest in the town forms and the town's own officials are at its edge: someone in it stands up to the official about what it is over (the public-action engine's civic record names the demand and the people in it). The talk is the town hall's, since it is the same exchange: a person with a demand, an official who answers it, and a reading of how the answer sits with the person's stand.

## `types[65].note`

A rally in the town forms because the term reads well in an area, and the town's own officials are at its edge: someone in it asks the official to say a few words (the public-action engine's civic record names the area and the people in it). It has no demand, so nothing is pressed; the official can speak, thank them, promise to keep it up or let the crowd have the day.

## `types[66].note`

A group's lobbyist made its case to the player on a bill, and the player voted the other way (the interest-group engine's lobbying meeting against the member's own vote record). Two days later the lobbyist finds them: the group remembers. How it is said, in a hint or out loud, comes from the lobbyist's own temper in the bank's bearings; nothing is rolled.

## `types[67].note`

The person whose bribe the official turned down comes back (the corruption engine's refusal record and their own reasons to press; no roll). The pressure runs from veiled to open by their temper in the bank's bearings. The official can hold the line, say they will report it, or put the talk off; what they say strains the tie.

## `types[68].note`

A strike or protest against the town's term, and someone who lives with the official asks the question the crowd raised: is the job worth it? (the public-action engine's civic record, the day after; the cast is the official's own household). The official can say why, say it looks worse than it is, promise time at home, or put the talk off.

## `types[69].note`

The floor before the roll (the legislature's floor-debate record: the sponsor, or the member leaning furthest for the bill, and the member leaning furthest against, each recognized by the chair). The speaker addresses the chair; the player, a member of the body, can stand with them, say they disagree, ask them to yield for a question or say nothing.

## `types[70].note`

A resident testified at a committee's hearing on a bill (the legislature's committee-hearing record names the witnesses, each one's side and what the bill reaches in their own life: their job, their lease or mortgage, a child at home, their own age, or only a view). On the way out one of them catches the player, the bill's sponsor or a member of the committee, and says what the bill would do to them, never a figure about the world. The player can thank them, ask what it would really mean, tell them they see it differently, or brush it off. Every reply is time on their tie, which their vote reads; disagreeing or brushing them off strains it.

## `types[71].note`

Someone the player knows has moved away (the moves engine's departure record, circumstance row moved-away-farewell) and comes to say goodbye: where they are going, who goes with them, and why when the records name a reason (an eviction, a job lost or found elsewhere, family, kin who left first, a death at home). The player can comfort them, ask, promise to visit or thank them. A promise to visit is kept on its record and told in the journal; a farewell cut short strains the tie.

## `types[72].note`

The body formed a study committee on a bill it could not settle (the legislature's study-formed record: the sponsor chairs it, and its members are the opponents nearest to changing their vote). The chair tells a member what it is charged with and when it reports, or a member asks the player, who chairs it, how it should begin. The player can agree to serve, say a study is only a delay, ask who sits on it and when it reports, or say nothing much.

## `types[73].note`

A study committee reached its sunset and reported (the legislature's study-reported record: the members' mean position on the bill, given to the body by the chair as a speech). The chair tells a member what the committee found and, from the member's stance record, whether the speech moved them; or a member brings the finding to the player, who chairs it. The player can agree, disagree, ask what moved the finding, or say nothing much.

## `types[74].note`

An outlet covering the race asks a candidate to sit for an interview: the press engine's interview-invited record names the candidate, the reporter who asks (the outlet's reporter closest to them) and the outlet. The reporter calls. A yes is read by the press engine as sitting for it, answered from the candidate's own filed platform; a no is a refusal on the record the outlet's people may take as a snub; anything else leaves it open.

## `types[75].note`

The candidate said yes to an outlet's invitation: the press engine's interview-accepted record names the candidate, the reporter who will ask and the outlet. The sitting is played in the conversation engine, never answered for them: the reporter puts each of the interview's own questions as a line, the candidate picks how to answer each (plainly, with a further fact from their record, by turning it back on a rival, briefly, or the lie where their record allows one) or says nothing, and when the sitting ends the press engine publishes the interview with exactly those moves. A question the reporter cannot put in words is answered from the candidate's filed platform.

## `types[76].note`

The candidate said yes to a debate's invitation: the meetings engine's debate-accepted record names the candidate, the moderator who will ask and the outlet that hosts it. The sitting is played in the conversation engine, never answered for them: the moderator puts each of the debate's own questions as a line, the candidate picks how to answer each (plainly, with a further fact from their record, by turning it back on a rival, briefly, or the lie where their record allows one) or says nothing, and when the sitting ends the meetings engine holds the debate with exactly those moves while the other candidates answer from their own positions. A question the moderator cannot put in words is answered from the candidate's filed platform. A debate no one sits for is held on the eve of the election. Its stage is a public place until the lane maps the debate stage picture to this type.

## `types[77].note`

The race's debate on the town's widest-reaching outlet waits on the candidate: the meetings engine's debate-invited record names the candidate and the host outlet's reporter closest to them. The host calls. A yes puts the sitting on the record (debate-accepted) for the debate-sitting scene; a no lets the debate go on without them; anything else leaves it waiting until the eve of the election, when it is held without a sitting.

## `types[78].note`

A candidate's campaign asks the player, one of the people closest to the candidate, to endorse them, or calls in a favor the player owes from a deal in office (the campaigns engine's endorsement-asked record: the endorsement row says `asked` until the player answers). The player's reply writes the row's yes or no. A put-off comes back after the offer spacing days as a second asking until the race is decided; the second asking offers no put-off. The asker gives one reason, the strongest the record holds; only a favor names a deal (owner, Oct 6: endorsements are not trades by default).

## `types[79].note`

Someone who knows a candidate heard they filed (the press's story of the filing, read or passed on in talk) and offers to help: the campaigns engine's volunteer-offered record names the candidate and the one who offers, who weighed it by their liking, closeness and work hours. They come by. A yes puts them on the campaign's volunteers.

## `types[80].note`

Someone close to a candidate (a partner, a relative, a best friend) heard they filed and offers to run the campaign, not only to help with it: the campaigns engine's volunteer-offered record with role manager, weighed by the same liking, closeness and work hours with closeness and family counted again (managerReason). It comes before any volunteer's offer while the campaign has nobody running it, the household included. Only the player's yes puts them on the campaign's staff, where the cast and election night read them (answerOffer); a no or a walk away leaves them off, and a world candidate takes the help without a scene. The owner's election team (Oct 26) and campaign board (Oct 27: 'maybe it's your significant other or your best friend').

## `types[81].note`

An employer picked the player for an opening: the jobs engine's job-offered record names the applicant, the person at the employer who makes the offer (the one there longest) and the position. They call. A yes takes the job; a no turns it down and the position opens to others; anything else leaves it waiting until its deadline, when the employer withdraws it. A job offer comes through a person and a scene or not at all (owner, Oct 27): it is in scheduling.ownRecordScenes, so it stops the day; its lines are the scene-talk bank's job-offer purpose (SG-DIR-job-offer-lines, resolved Oct 28).

## `types[82].note`

A rival's paid message (mail, an ad) reached someone the candidate knows, and the next time they are in touch they pass it on: the campaigns engine's rival-word record names the candidate, the one who tells, the rival and what the message argued. The one who tells comes by. The candidate's reply is a scene reply, read by the core's relationship writer as time together.

## `types[83].note`

A filed player's petition is behind what the days left can still close, and someone who would really tell them says so: the campaigns engine's petition-short record (written once per filing, on the last day a canvass shift a day can still close the gap: to the count the office requires when the clerk tells, to what the campaign aims to gather when a helper does) names the candidate and the one who tells, the clerk who took the filing or else a helper on the campaign. The player's answer is the pause; a yes (going-out) takes their canvass day, anything else changes nothing (OWNER-DECISIONS Oct 14: the engine offers, the player decides).

## `types[85].note`

The day the landlord serves the player's household notice to pay what it owes or leave (the housing engine's notice record, circumstance row notice-home), someone they live with brings it to them at home: what is owed and the day it is due. The reply is a scene reply; a promise to pay is kept on its record and told in the journal.

## `types[86].note`

The day a disaster's aid is paid to the player's household and the repair bill comes due on the home the disaster damaged (the disasters engine's home-damaged record, filled from the damaged-home row, circumstance row home-damaged), someone they live with brings it to them at home: what the home lost, the aid it was paid and the repairs still owed, as people round a sum. The reply is a scene reply; a promise to see the repairs through is kept on its record and told in the journal.

## `types[87].note`

The day the offices engine seats the player (its took-office record, from a count, a special election or an appointment), someone the records name gives the oath: the clerk who took the filing or keeps the government's papers, else the holder who left the seat that day, else the body's presiding officer. The player's household and the government's other officeholders are in the room. The player's reply is the oath, a scene reply the journal tells; an office that gives an address (data/swearing-in.json: mayor, county executive, governor, president) goes on to it, and the speech engine records it as heard by the people named in the room, so the views engine moves those it persuades and each may retell it at home. No court is on record, so no judge swears anyone in (SG-WORDS-swearing-in-no-court). It stops the day: taking office is an event, not a status change (owner, Sept 22 and Oct 29).

## `types[88].note`

The player drafts a bill and goes to a colleague they know to sign on as a co-sponsor (brief V, stage 2). The colleague answers from where they stand on the bill and what a favor to the player is worth to them, never by a roll; a yes puts their name on the bill, which the committee chair weighs in deciding to hear it (legislature.ts askToSignOn, answerSignOn, chairHears).
