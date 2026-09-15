SURFACE: Ordinary life scene, direct conversation, choices, and follow-through records.
OUTPUT REQUEST: Render the supplied saved requests and choices; agreement is not performance.
CHARACTER: The player; use second person.
KNOWN WORLD FACTS:

- The event writer explicitly authors the picnic invitation, its two paragraphs, twenty-minute proofreading task, and wording-only condition. The requester directly asked the player.
- Agreement records the expectation; it does not perform proofreading. The requester heard and accepted the wording-only limit, and said they will contact the guests themselves.
- Performance completed the twenty-minute activity; the player sent wording feedback and kept the condition. No journey, pay or skill reward is established.
- Unperformed saved agreement due follow-through: the same requester chose to raise it again; the player had agreed but had not completed proofreading.
- The household writer directly authors an invitation to sit and talk at home this evening. The confidence writer directly authors the requester agreeing to organize a picnic, needing to withdraw, not having told the guests, and asking for privacy. These are separate saved requesting events, from separately identified ordinary starts when shown. The confidence requester is Neil Goodwin, canonically your mom; the favor requester is Samantha Kemp, canonically your mom. The household counterpart is Noor Yates, canonically who you live with.
- Family dialogue is an explicitly authored direct exchange in the supplied scene. Speakers, ages, pronouns, kinship/authority records and actually replied lines are below. The brother is a child; the mom is an adult responsible for the player. Lines take zero minutes.
- UNKNOWN / DO NOT ASSUME: physical location of the favor conversation, transport channel, actual picnic date, guest identities, result of guests being contacted, outcome of privacy after this exchange, global family membership based on surnames.

CANONICAL PACKET:
{
"setup": {
"route": "custom",
"age": 35,
"depth": "summarize-earlier-life",
"household": "shares-a-home",
"state": "Kentucky",
"place": "Lexington",
"questionnaire": "skipped"
},
"playerName": "Raymond Kemp",
"confidence": {
"seed": "p34-life-confidence",
"request": {
"id": "event_9eebd0b62c07450d",
"stableKey": "life-opportunity:person_01080bebd6435625:2026-01-05:confidence-disclosed",
"sequence": 104,
"type": "life.confidence-disclosed",
"occurredAt": "2026-01-05",
"recordedAt": "2026-01-05",
"jurisdictionId": "jurisdiction_a4a6991ef3dd5879",
"involvedEntityIds": [
"person_01080bebd6435625",
"person_6728ed81495d57e2"
],
"participants": [
{
"personId": "person_01080bebd6435625",
"role": "focus:asked-of",
"detail": "Was asked"
},
{
"personId": "person_6728ed81495d57e2",
"role": "agency:asked",
"detail": "Privately disclosed difficulty organizing the family picnic"
}
],
"personFactConstraints": [],
"visibility": "private",
"tags": [
"life.opportunity:confidence-disclosed",
"life.request.v1:{\"version\":1,\"task\":\"tell the picnic guests they can no longer organize it\",\"opening\":\"I agreed to organize the family picnic, and now I need to back out. I have not told the guests. Please keep this between us for now.\",\"condition\":\"Keep this conversation private\",\"minutes\":null}"
],
"summary": "Neil Goodwin privately said they had agreed to organize a family picnic and were unsure how to tell the guests they could no longer do it.",
"context": {
"location": {
"jurisdictionId": "jurisdiction_a4a6991ef3dd5879",
"label": "Nearby",
"setting": null
},
"socialContext": null,
"pressure": null,
"choice": null,
"motivation": null,
"immediateReaction": null
}
},
"requester": {
"personId": "person_6728ed81495d57e2",
"name": "Neil Goodwin",
"shortName": "Neil",
"pronouns": {
"key": "she-her",
"subject": "she",
"object": "her",
"possessive": "her",
"possessivePronoun": "hers",
"reflexive": "herself",
"pluralVerb": false
},
"relationship": "your mom",
"basis": "A lineal:parent-child kinship record; birth dates decide which of them is which.",
"anchors": [
{
"store": "kinshipRelationships",
"recordId": "kinship_98549253573fd931",
"stableKey": "production:earlier-life:kinship",
"at": "1990-07-26",
"sequence": 17,
"role": "context",
"note": "The kinship record."
}
]
},
"scene": "Neil Goodwin, your mom: \u201cI agreed to organize the family picnic, and now I need to back out. I have not told the guests. Please keep this between us for now.\u201d",
"options": [
{
"key": "keep-it",
"label": "Agree to keep this conversation private"
},
{
"key": "push-them",
"label": "Ask them to tell the picnic guests"
},
{
"key": "step-back",
"label": "Say you cannot help with the picnic"
}
]
},
"seed": "setup-v3:9d0df56f0140c391:{\"v\":3,\"seed\":\"p34-life-lexington-fayette\",\"placeKey\":\"lexington-fayette\",\"startAge\":35,\"depth\":\"summarize-earlier-life\",\"startingLife\":\"ordinary-life\",\"household\":\"shares-a-home\",\"givenName\":null,\"familyName\":null,\"startKind\":\"custom\"}",
"player": "person_2d1d951c47ea070a",
"request": "event_1a35c88ae5022eb3",
"requester": {
"personId": "person_1b88dc2e1bc3d1cb",
"name": "Samantha Kemp",
"shortName": "Samantha",
"pronouns": {
"key": "she-her",
"subject": "she",
"object": "her",
"possessive": "her",
"possessivePronoun": "hers",
"reflexive": "herself",
"pluralVerb": false
},
"relationship": "your mom",
"basis": "A lineal:parent-child kinship record; birth dates decide which of them is which.",
"anchors": [
{
"store": "kinshipRelationships",
"recordId": "kinship_9438f1989570adc6",
"stableKey": "production:earlier-life:kinship",
"at": "1990-04-19",
"sequence": 17,
"role": "context",
"note": "The kinship record."
}
]
},
"terms": {
"version": 1,
"task": "proofread the two-paragraph picnic invitation",
"opening": "Could you look over my invitation to the family picnic? Just two paragraphs. I want to make sure the wording is clear.",
"condition": "Wording only; I will not contact the guests",
"minutes": 20
},
"originalRequest": {
"id": "event_1a35c88ae5022eb3",
"stableKey": "life-opportunity:person_2d1d951c47ea070a:2026-01-05:favour-request",
"sequence": 108,
"type": "life.favour-requested",
"occurredAt": "2026-01-05",
"recordedAt": "2026-01-05",
"jurisdictionId": "jurisdiction_a4a6991ef3dd5879",
"involvedEntityIds": [
"person_1b88dc2e1bc3d1cb",
"person_2d1d951c47ea070a"
],
"participants": [
{
"personId": "person_1b88dc2e1bc3d1cb",
"role": "agency:asked",
"detail": "Asked for help proofreading the picnic invitation"
},
{
"personId": "person_2d1d951c47ea070a",
"role": "focus:asked-of",
"detail": "Was asked"
}
],
"personFactConstraints": [],
"visibility": "private",
"tags": [
"life.opportunity:favour-request",
"life.request.v1:{\"version\":1,\"task\":\"proofread the two-paragraph picnic invitation\",\"opening\":\"Could you look over my invitation to the family picnic? Just two paragraphs. I want to make sure the wording is clear.\",\"condition\":\"Wording only; I will not contact the guests\",\"minutes\":20}"
],
"summary": "Samantha Kemp asked for help proofreading a two-paragraph invitation to a family picnic.",
"context": {
"location": {
"jurisdictionId": "jurisdiction_a4a6991ef3dd5879",
"label": "Nearby",
"setting": null
},
"socialContext": null,
"pressure": null,
"choice": null,
"motivation": null,
"immediateReaction": null
}
},
"householdRequests": [
{
"id": "event_d8dbb2b9773e0596",
"stableKey": "life-opportunity:person_2d1d951c47ea070a:2026-01-05:household-evening",
"sequence": 110,
"type": "life.household-evening-proposed",
"occurredAt": "2026-01-05",
"recordedAt": "2026-01-05",
"jurisdictionId": "jurisdiction_a4a6991ef3dd5879",
"involvedEntityIds": [
"person_2d1d951c47ea070a",
"person_b8c8cd006573f14c"
],
"participants": [
{
"personId": "person_2d1d951c47ea070a",
"role": "focus:asked-of",
"detail": "Was asked"
},
{
"personId": "person_b8c8cd006573f14c",
"role": "agency:asked",
"detail": "Invited them to sit and talk this evening"
}
],
"personFactConstraints": [],
"visibility": "private",
"tags": [
"life.opportunity:household-evening",
"life.request.v1:{\"version\":1,\"task\":\"sit and talk at home this evening\",\"opening\":\"I will be home this evening. Would you like to sit and talk?\",\"condition\":null,\"minutes\":120}"
],
"summary": "Noor Yates said they would be home this evening and invited them to sit and talk.",
"context": {
"location": {
"jurisdictionId": "jurisdiction_a4a6991ef3dd5879",
"label": "Nearby",
"setting": null
},
"socialContext": null,
"pressure": null,
"choice": null,
"motivation": null,
"immediateReaction": null
}
}
],
"scene": {
"key": "adult.friend-favour",
"opportunity": "favour-request",
"companion": "other-household",
"stakes": "notable",
"prose": "Samantha Kemp, your mom: \u201cCould you look over my invitation to the family picnic? Just two paragraphs. I want to make sure the wording is clear.\u201d Proofreading takes 20 minutes; answering takes no time.",
"tensions": [
{
"between": [
"personal-ties",
"privacy-preference"
],
"poles": [
1,
1
],
"note": "Helping, against what helping puts your name to."
}
],
"options": [
{
"key": "do-it",
"label": "Agree to proofread the two-paragraph picnic invitation",
"description": "Record the agreement; carry out the proofreading separately.",
"memory": "You agreed to proofread the two-paragraph picnic invitation for Samantha Kemp.",
"witnessed": "They agreed to proofread the two-paragraph picnic invitation.",
"stance": "engaged",
"relationalChange": "maintained",
"interactionKind": "support:friendship",
"nudges": [
{
"dimension": "personal-ties",
"magnitude": 0.5
},
{
"dimension": "care-obligation",
"magnitude": 0.3
}
],
"aftermath": "obligation"
},
{
"key": "conditions",
"label": "Agree: Wording only; I will not contact the guests",
"description": "Record the agreement; carry out the proofreading separately.",
"memory": "You agreed to proofread the two-paragraph picnic invitation for Samantha Kemp, with the condition: Wording only; I will not contact the guests.",
"witnessed": "They agreed to proofread the two-paragraph picnic invitation, with the condition: Wording only; I will not contact the guests.",
"stance": "engaged",
"relationalChange": "maintained",
"interactionKind": "exchange:friendship",
"nudges": [
{
"dimension": "decision-style",
"magnitude": 0.45
},
{
"dimension": "privacy-preference",
"magnitude": 0.2
}
],
"aftermath": "obligation"
},
{
"key": "decline",
"label": "Decline the proofreading request",
"description": "Tell them you cannot help with this invitation.",
"memory": "You declined Samantha Kemp's request to proofread the two-paragraph picnic invitation.",
"witnessed": "They declined to proofread the invitation.",
"stance": "engaged",
"relationalChange": "strained",
"interactionKind": "experience:friendship",
"nudges": [
{
"dimension": "personal-ties",
"magnitude": -0.4
},
{
"dimension": "privacy-preference",
"magnitude": 0.35
}
],
"aftermath": "grievance"
}
]
},
"otherScenes": [
{
"key": "adult.household-quiet-evening",
"prose": "Noor Yates, who you live with: \u201cI will be home this evening. Would you like to sit and talk?\u201d",
"options": [
{
"key": "spend-it-together",
"label": "Agree to sit and talk this evening"
},
{
"key": "keep-it-yours",
"label": "Decline; keep the evening to yourself"
}
]
}
],
"agreement": {
"id": "event_8eb3851cbf18be2d",
"stableKey": "life-favor:event_1a35c88ae5022eb3:response",
"sequence": 120,
"type": "life.favour-response",
"occurredAt": "2026-01-05",
"recordedAt": "2026-01-05",
"jurisdictionId": "jurisdiction_a4a6991ef3dd5879",
"involvedEntityIds": [
"person_1b88dc2e1bc3d1cb",
"person_2d1d951c47ea070a"
],
"participants": [
{
"personId": "person_1b88dc2e1bc3d1cb",
"role": "presence:participant",
"detail": "Heard the answer"
},
{
"personId": "person_2d1d951c47ea070a",
"role": "agency:actor",
"detail": "Made the proofreading commitment"
}
],
"personFactConstraints": [],
"visibility": "private",
"tags": [
"favour.conditions",
"life.favour-request:event_1a35c88ae5022eb3",
"life.request.v1:{\"version\":1,\"task\":\"proofread the two-paragraph picnic invitation\",\"opening\":\"Could you look over my invitation to the family picnic? Just two paragraphs. I want to make sure the wording is clear.\",\"condition\":\"Wording only; I will not contact the guests\",\"minutes\":20}",
"origin-choice:event_8271294239593369"
],
"summary": "You agreed to proofread the two-paragraph picnic invitation for Samantha Kemp. Condition: Wording only; I will not contact the guests. The proofreading has not been done.",
"context": {
"location": {
"jurisdictionId": "jurisdiction_a4a6991ef3dd5879",
"label": "Nearby",
"setting": null
},
"socialContext": "adult.friend-favour",
"pressure": "proofread the two-paragraph picnic invitation",
"choice": "Agree: Wording only; I will not contact the guests",
"motivation": null,
"immediateReaction": "Okay. Just the wording; I will contact the guests myself."
}
},
"agreementMinutes": 0,
"performance": {
"id": "event_c73c227592e168e6",
"stableKey": "life-favor:event_1a35c88ae5022eb3:performance:outcome",
"sequence": 128,
"type": "life.favour-performed",
"occurredAt": "2026-01-05",
"recordedAt": "2026-01-05",
"jurisdictionId": null,
"involvedEntityIds": [
"person_1b88dc2e1bc3d1cb",
"person_2d1d951c47ea070a",
"scheduled-activity_3a6f14a41d879485"
],
"participants": [
{
"personId": "person_1b88dc2e1bc3d1cb",
"role": "coordination:counterpart",
"detail": "Received the feedback; not physical presence"
},
{
"personId": "person_2d1d951c47ea070a",
"role": "agency:actor",
"detail": "Finished proofreading and sent wording feedback"
}
],
"personFactConstraints": [],
"visibility": "private",
"tags": [
"activity:scheduled-activity_3a6f14a41d879485",
"life.favour-request:event_1a35c88ae5022eb3",
"life.request.v1:{\"version\":1,\"task\":\"proofread the two-paragraph picnic invitation\",\"opening\":\"Could you look over my invitation to the family picnic? Just two paragraphs. I want to make sure the wording is clear.\",\"condition\":\"Wording only; I will not contact the guests\",\"minutes\":20}"
],
"summary": "You proofread Samantha Kemp's two-paragraph picnic invitation and sent the wording feedback. You kept the agreed limit: Wording only; I will not contact the guests.",
"context": {
"location": null,
"socialContext": "adult.friend-favour",
"pressure": "proofread the two-paragraph picnic invitation",
"choice": "Carry out the proofreading",
"motivation": null,
"immediateReaction": null
}
},
"performanceMinutes": 20,
"performanceCount": 1,
"repeatAfterReloadSameWorld": true,
"unperformedCallback": [
{
"id": "event_22afbf93891cf991",
"stableKey": "life-favor:event_1a35c88ae5022eb3:response:callback:returned:event",
"sequence": 133,
"type": "life.earlier-choice-returned",
"occurredAt": "2026-04-11",
"recordedAt": "2026-04-11",
"jurisdictionId": "jurisdiction_a4a6991ef3dd5879",
"involvedEntityIds": [
"person_1b88dc2e1bc3d1cb",
"person_2d1d951c47ea070a"
],
"participants": [
{
"personId": "person_1b88dc2e1bc3d1cb",
"role": "presence:participant",
"detail": "Raised the earlier matter"
},
{
"personId": "person_2d1d951c47ea070a",
"role": "focus:subject",
"detail": "The person it came back to"
}
],
"personFactConstraints": [],
"visibility": "limited",
"tags": [
"adult.friend-favour",
"life.callback",
"life.favour-request:event_1a35c88ae5022eb3",
"life.request.v1:{\"version\":1,\"task\":\"proofread the two-paragraph picnic invitation\",\"opening\":\"Could you look over my invitation to the family picnic? Just two paragraphs. I want to make sure the wording is clear.\",\"condition\":\"Wording only; I will not contact the guests\",\"minutes\":20}",
"origin:event_8eb3851cbf18be2d"
],
"summary": "Samantha Kemp brings up the request to proofread the two-paragraph picnic invitation again. You agreed, but have not finished the proofreading.",
"context": {
"location": null,
"socialContext": "adult.friend-favour",
"pressure": null,
"choice": null,
"motivation": null,
"immediateReaction": null
}
}
],
"performedDue": [
{
"id": "future-due-item-state_9d416780ef6a055c",
"stableKey": "life-favor:event_1a35c88ae5022eb3:response:callback:state:scheduled",
"sequence": 122,
"dueItemId": "future-due-item_0b0e64c3c6914c52",
"effectiveAt": "2026-01-05",
"status": "scheduled",
"reasonKey": null,
"context": null,
"outcomeEventId": null,
"supersedesStateId": null
},
{
"id": "future-due-item-state_b01315d2d4f2466c",
"stableKey": "life-favor:event_1a35c88ae5022eb3:response:callback:state:cancelled:2026-04-11",
"sequence": 143,
"dueItemId": "future-due-item_0b0e64c3c6914c52",
"effectiveAt": "2026-04-11",
"status": "cancelled",
"reasonKey": "life:attention-moved",
"context": "It was still there to be raised, and the person who could have raised it did not.",
"outcomeEventId": null,
"supersedesStateId": "future-due-item-state_9d416780ef6a055c"
}
],
"family": [
{
"age": 6,
"person": {
"personId": "person_29aa1a7475fae154",
"name": "Jason Wolf",
"shortName": "Jason",
"pronouns": {
"key": "he-him",
"subject": "he",
"object": "him",
"possessive": "his",
"possessivePronoun": "his",
"reflexive": "himself",
"pluralVerb": false
},
"relationship": "your older brother",
"basis": "A collateral:sibling kinship record.",
"anchors": [
{
"store": "kinshipRelationships",
"recordId": "kinship_b0fb32b64b736bb1",
"stableKey": "production:initial-life:kinship:sibling",
"at": "2019-10-13",
"sequence": 11,
"role": "context",
"note": "The kinship record."
}
]
},
"scene": "Your sleeve catches a mug. It falls and breaks. Wesley Wolf asks what happened.",
"sceneKey": "early.home.broken-mug",
"exchanges": [
{
"intent": "greet",
"line": "Damian Wolf: Say hello. Jason Wolf: Hi, Damian.",
"reply": "Hi, Damian.",
"elapsed": 0
},
{
"intent": "scene",
"line": "Damian Wolf: Talk about what is happening here. Jason Wolf: We should ask for help with the broken pieces.",
"reply": "We should ask for help with the broken pieces.",
"elapsed": 0
},
{
"intent": "activity",
"line": "Damian Wolf: Ask what they would like to do. Jason Wolf: Can we try a new game?",
"reply": "Can we try a new game?",
"elapsed": 0
},
{
"intent": "explain",
"line": "Damian Wolf: Ask why. Jason Wolf: I want to try something I haven't done before.",
"reply": "I want to try something I haven't done before.",
"elapsed": 0
}
],
"reloadedRelation": "your older brother"
},
{
"age": 10,
"person": {
"personId": "person_46841427be002550",
"name": "Erin Wilcox",
"shortName": "Erin",
"pronouns": {
"key": "she-her",
"subject": "she",
"object": "her",
"possessive": "her",
"possessivePronoun": "hers",
"reflexive": "herself",
"pluralVerb": false
},
"relationship": "your mom",
"basis": "A parental:primary authority record over the player, held by this person.",
"anchors": [
{
"store": "childAuthorities",
"recordId": "child-authority_425d1019e99888a6",
"stableKey": "production:initial-life:authority:guardian",
"at": "2015-08-16",
"sequence": 8,
"role": "context",
"note": "The authority record that makes them the adult responsible."
}
]
},
"scene": "You're at home, and the next fifteen minutes are yours.",
"sceneKey": "young.home.choose-activity",
"exchanges": [
{
"intent": "greet",
"line": "Dean Wilcox: Say hello. Erin Wilcox: Hi, sweetheart.",
"reply": "Hi, sweetheart.",
"elapsed": 0
},
{
"intent": "scene",
"line": "Dean Wilcox: Talk about what is happening here. Erin Wilcox: What would you like to do?",
"reply": "What would you like to do?",
"elapsed": 0
},
{
"intent": "activity",
"line": "Dean Wilcox: Ask what they would like to do. Erin Wilcox: We could play together. You can choose the game.",
"reply": "We could play together. You can choose the game.",
"elapsed": 0
},
{
"intent": "explain",
"line": "Dean Wilcox: Ask why. Erin Wilcox: I want to spend time with you.",
"reply": "I want to spend time with you.",
"elapsed": 0
}
],
"reloadedRelation": "your mom"
}
]
}

PROSPECTIVE GAME FACTS: The exact ordinary creator produces Elena Parsons, canonically your mom. She directly proposes a new game. The saved offer binds her actor ID, new-game activity, 30-minute duration, and no additional condition. Agreement has not started the game. Performance spends the existing disclosed half hour once. Decline/cancel spend no time. No pay, skill or other reward is established.
CANONICAL GAME PACKET:
{
"setup": {
"startKind": "custom",
"placeKey": "lexington-fayette",
"startAge": 10,
"depth": "play-formative-years",
"startingLife": "ordinary-life",
"household": "shares-a-home",
"givenName": null,
"familyName": null,
"gender": "unstated",
"appearanceRecipeVersion": "appearance-recipe-v2",
"givenNameGenerationVersion": "given-name-v2",
"questionnaire": "skipped",
"priors": [],
"seed": "p34-mom-game-3"
},
"player": {
"id": "person_92b37a76281c2b0a",
"generationKey": "starting-person-v1:player",
"generatorVersion": "starting-person-v1",
"corpusVersion": "names-v1",
"givenName": "Miranda",
"familyName": "Valdez",
"birthDate": "2015-10-16",
"homeJurisdictionId": "jurisdiction_a4a6991ef3dd5879",
"appearance": {
"seed": "app_d3b56b62bd3c1e80",
"recipeVersion": "appearance-recipe-v2",
"catalogGeneration": 2
},
"detailLevel": "lightweight",
"establishedFacts": [
{
"id": "fact_5267ea7c72ceb5a8",
"stableKey": "birth-date",
"kind": "birth-date",
"occurredAt": "2015-10-16",
"jurisdictionId": null,
"summary": "Miranda Valdez's birth date is established as 2015-10-16.",
"provenance": {
"method": "procedural-placeholder",
"sourceEventId": null,
"note": "Generated from the player's setup at the start of a new game."
}
},
{
"id": "fact_a13c5daeccaf8718",
"stableKey": "birthplace",
"kind": "birthplace",
"occurredAt": "2015-10-16",
"jurisdictionId": "jurisdiction_a4a6991ef3dd5879",
"summary": "Miranda Valdez's birthplace is established in the world record.",
"provenance": {
"method": "procedural-placeholder",
"sourceEventId": null,
"note": "Generated from the player's setup at the start of a new game."
}
},
{
"id": "fact_23bfa30deac74a0a",
"stableKey": "residence:initial",
"kind": "residence",
"occurredAt": "2026-01-05",
"endedAt": null,
"jurisdictionId": "jurisdiction_a4a6991ef3dd5879",
"summary": "Miranda Valdez resides in the recorded home jurisdiction.",
"provenance": {
"method": "procedural-placeholder",
"sourceEventId": null,
"note": "Generated from the player's setup at the start of a new game."
}
}
]
},
"requester": {
"personId": "person_07bca4c7928d1476",
"name": "Elena Parsons",
"shortName": "Elena",
"pronouns": {
"key": "she-her",
"subject": "she",
"object": "her",
"possessive": "her",
"possessivePronoun": "hers",
"reflexive": "herself",
"pluralVerb": false
},
"relationship": "your mom",
"basis": "A parental:shared authority record over the player, held by this person.",
"anchors": [
{
"store": "childAuthorities",
"recordId": "child-authority_336efc999367a440",
"stableKey": "production:initial-life:second-parent:authority",
"at": "2015-10-16",
"sequence": 18,
"role": "context",
"note": "The authority record that makes them the adult responsible."
}
]
},
"proposal": {
"request": {
"id": "event_267fff34daaac79a",
"stableKey": "opening-life:talk:person_92b37a76281c2b0a:person_07bca4c7928d1476:69",
"sequence": 69,
"type": "life.conversation",
"occurredAt": "2026-01-05",
"recordedAt": "2026-01-05",
"jurisdictionId": "jurisdiction_a4a6991ef3dd5879",
"involvedEntityIds": [
"person_07bca4c7928d1476",
"person_249594aa35e58134",
"person_92b37a76281c2b0a",
"person_f3fc7d2fff9e6a4f"
],
"participants": [
{
"personId": "person_07bca4c7928d1476",
"role": "coordination:counterpart",
"detail": "Replied directly"
},
{
"personId": "person_249594aa35e58134",
"role": "observation:witness",
"detail": "Heard the conversation in the scene"
},
{
"personId": "person_92b37a76281c2b0a",
"role": "focus:subject",
"detail": "Spoke directly"
},
{
"personId": "person_f3fc7d2fff9e6a4f",
"role": "observation:witness",
"detail": "Heard the conversation in the scene"
}
],
"personFactConstraints": [],
"visibility": "private",
"tags": [
"life.answer:explore",
"life.conversation",
"life.proposal.v1:{\"actorPersonId\":\"person_07bca4c7928d1476\",\"activity\":\"new-game\",\"minutes\":30,\"condition\":null}",
"life.talk:activity",
"moment:{\"date\":\"2026-01-05\",\"minuteOfDay\":550,\"timeZone\":\"America/New_York\",\"utcOffsetMinutes\":-300}",
"scene:event_3ba36e8d3ec4eaa2"
],
"summary": "Miranda Valdez: Ask what they would like to do. Elena Parsons: We could try a new game. Would you like that?",
"context": {
"location": {
"jurisdictionId": "jurisdiction_a4a6991ef3dd5879",
"label": "Home",
"setting": "home"
},
"socialContext": "A direct ordinary conversation",
"pressure": null,
"choice": "Ask what they would like to do",
"motivation": null,
"immediateReaction": "We could try a new game. Would you like that?"
}
},
"terms": {
"actorPersonId": "person_07bca4c7928d1476",
"activity": "new-game",
"minutes": 30,
"condition": null
},
"status": "proposed",
"label": "try a new game together"
},
"agreement": {
"request": {
"id": "event_267fff34daaac79a",
"stableKey": "opening-life:talk:person_92b37a76281c2b0a:person_07bca4c7928d1476:69",
"sequence": 69,
"type": "life.conversation",
"occurredAt": "2026-01-05",
"recordedAt": "2026-01-05",
"jurisdictionId": "jurisdiction_a4a6991ef3dd5879",
"involvedEntityIds": [
"person_07bca4c7928d1476",
"person_249594aa35e58134",
"person_92b37a76281c2b0a",
"person_f3fc7d2fff9e6a4f"
],
"participants": [
{
"personId": "person_07bca4c7928d1476",
"role": "coordination:counterpart",
"detail": "Replied directly"
},
{
"personId": "person_249594aa35e58134",
"role": "observation:witness",
"detail": "Heard the conversation in the scene"
},
{
"personId": "person_92b37a76281c2b0a",
"role": "focus:subject",
"detail": "Spoke directly"
},
{
"personId": "person_f3fc7d2fff9e6a4f",
"role": "observation:witness",
"detail": "Heard the conversation in the scene"
}
],
"personFactConstraints": [],
"visibility": "private",
"tags": [
"life.answer:explore",
"life.conversation",
"life.proposal.v1:{\"actorPersonId\":\"person_07bca4c7928d1476\",\"activity\":\"new-game\",\"minutes\":30,\"condition\":null}",
"life.talk:activity",
"moment:{\"date\":\"2026-01-05\",\"minuteOfDay\":550,\"timeZone\":\"America/New_York\",\"utcOffsetMinutes\":-300}",
"scene:event_3ba36e8d3ec4eaa2"
],
"summary": "Miranda Valdez: Ask what they would like to do. Elena Parsons: We could try a new game. Would you like that?",
"context": {
"location": {
"jurisdictionId": "jurisdiction_a4a6991ef3dd5879",
"label": "Home",
"setting": "home"
},
"socialContext": "A direct ordinary conversation",
"pressure": null,
"choice": "Ask what they would like to do",
"motivation": null,
"immediateReaction": "We could try a new game. Would you like that?"
}
},
"terms": {
"actorPersonId": "person_07bca4c7928d1476",
"activity": "new-game",
"minutes": 30,
"condition": null
},
"response": {
"id": "event_267c6e34daa79b60",
"stableKey": "opening-life:talk:person_92b37a76281c2b0a:person_07bca4c7928d1476:74",
"sequence": 74,
"type": "life.conversation",
"occurredAt": "2026-01-05",
"recordedAt": "2026-01-05",
"jurisdictionId": "jurisdiction_a4a6991ef3dd5879",
"involvedEntityIds": [
"person_07bca4c7928d1476",
"person_249594aa35e58134",
"person_92b37a76281c2b0a",
"person_f3fc7d2fff9e6a4f"
],
"participants": [
{
"personId": "person_07bca4c7928d1476",
"role": "coordination:counterpart",
"detail": "Replied directly"
},
{
"personId": "person_249594aa35e58134",
"role": "observation:witness",
"detail": "Heard the conversation in the scene"
},
{
"personId": "person_92b37a76281c2b0a",
"role": "focus:subject",
"detail": "Spoke directly"
},
{
"personId": "person_f3fc7d2fff9e6a4f",
"role": "observation:witness",
"detail": "Heard the conversation in the scene"
}
],
"personFactConstraints": [],
"visibility": "private",
"tags": [
"life.answer:company-accepted",
"life.conversation",
"life.proposal.accepted",
"life.proposal:event_267fff34daaac79a",
"life.talk:suggestGame",
"moment:{\"date\":\"2026-01-05\",\"minuteOfDay\":550,\"timeZone\":\"America/New_York\",\"utcOffsetMinutes\":-300}",
"scene:event_3ba36e8d3ec4eaa2"
],
"summary": "Miranda Valdez: Suggest playing a game together. Elena Parsons: Yes, let's try a new game together. We haven't started yet.",
"context": {
"location": {
"jurisdictionId": "jurisdiction_a4a6991ef3dd5879",
"label": "Home",
"setting": "home"
},
"socialContext": "A direct ordinary conversation",
"pressure": null,
"choice": "Suggest playing a game together",
"motivation": null,
"immediateReaction": "Yes, let's try a new game together. We haven't started yet."
}
},
"status": "accepted",
"label": "try a new game together"
},
"transcript": [
{
"eventId": "event_267fff34daaac79a",
"date": "2026-01-05",
"action": "Ask what they would like to do",
"reply": "We could try a new game. Would you like that?"
},
{
"eventId": "event_267c6e34daa79b60",
"date": "2026-01-05",
"action": "Suggest playing a game together",
"reply": "Yes, let's try a new game together. We haven't started yet."
},
{
"eventId": "event_267c7b34daa7b177",
"date": "2026-01-05",
"action": "Spend 30 minutes: try a new game together",
"reply": "I'm glad we took time to try a new game together."
}
],
"actualEvents": [
{
"id": "event_267fff34daaac79a",
"stableKey": "opening-life:talk:person_92b37a76281c2b0a:person_07bca4c7928d1476:69",
"sequence": 69,
"type": "life.conversation",
"occurredAt": "2026-01-05",
"recordedAt": "2026-01-05",
"jurisdictionId": "jurisdiction_a4a6991ef3dd5879",
"involvedEntityIds": [
"person_07bca4c7928d1476",
"person_249594aa35e58134",
"person_92b37a76281c2b0a",
"person_f3fc7d2fff9e6a4f"
],
"participants": [
{
"personId": "person_07bca4c7928d1476",
"role": "coordination:counterpart",
"detail": "Replied directly"
},
{
"personId": "person_249594aa35e58134",
"role": "observation:witness",
"detail": "Heard the conversation in the scene"
},
{
"personId": "person_92b37a76281c2b0a",
"role": "focus:subject",
"detail": "Spoke directly"
},
{
"personId": "person_f3fc7d2fff9e6a4f",
"role": "observation:witness",
"detail": "Heard the conversation in the scene"
}
],
"personFactConstraints": [],
"visibility": "private",
"tags": [
"life.answer:explore",
"life.conversation",
"life.proposal.v1:{\"actorPersonId\":\"person_07bca4c7928d1476\",\"activity\":\"new-game\",\"minutes\":30,\"condition\":null}",
"life.talk:activity",
"moment:{\"date\":\"2026-01-05\",\"minuteOfDay\":550,\"timeZone\":\"America/New_York\",\"utcOffsetMinutes\":-300}",
"scene:event_3ba36e8d3ec4eaa2"
],
"summary": "Miranda Valdez: Ask what they would like to do. Elena Parsons: We could try a new game. Would you like that?",
"context": {
"location": {
"jurisdictionId": "jurisdiction_a4a6991ef3dd5879",
"label": "Home",
"setting": "home"
},
"socialContext": "A direct ordinary conversation",
"pressure": null,
"choice": "Ask what they would like to do",
"motivation": null,
"immediateReaction": "We could try a new game. Would you like that?"
}
},
{
"id": "event_267c6e34daa79b60",
"stableKey": "opening-life:talk:person_92b37a76281c2b0a:person_07bca4c7928d1476:74",
"sequence": 74,
"type": "life.conversation",
"occurredAt": "2026-01-05",
"recordedAt": "2026-01-05",
"jurisdictionId": "jurisdiction_a4a6991ef3dd5879",
"involvedEntityIds": [
"person_07bca4c7928d1476",
"person_249594aa35e58134",
"person_92b37a76281c2b0a",
"person_f3fc7d2fff9e6a4f"
],
"participants": [
{
"personId": "person_07bca4c7928d1476",
"role": "coordination:counterpart",
"detail": "Replied directly"
},
{
"personId": "person_249594aa35e58134",
"role": "observation:witness",
"detail": "Heard the conversation in the scene"
},
{
"personId": "person_92b37a76281c2b0a",
"role": "focus:subject",
"detail": "Spoke directly"
},
{
"personId": "person_f3fc7d2fff9e6a4f",
"role": "observation:witness",
"detail": "Heard the conversation in the scene"
}
],
"personFactConstraints": [],
"visibility": "private",
"tags": [
"life.answer:company-accepted",
"life.conversation",
"life.proposal.accepted",
"life.proposal:event_267fff34daaac79a",
"life.talk:suggestGame",
"moment:{\"date\":\"2026-01-05\",\"minuteOfDay\":550,\"timeZone\":\"America/New_York\",\"utcOffsetMinutes\":-300}",
"scene:event_3ba36e8d3ec4eaa2"
],
"summary": "Miranda Valdez: Suggest playing a game together. Elena Parsons: Yes, let's try a new game together. We haven't started yet.",
"context": {
"location": {
"jurisdictionId": "jurisdiction_a4a6991ef3dd5879",
"label": "Home",
"setting": "home"
},
"socialContext": "A direct ordinary conversation",
"pressure": null,
"choice": "Suggest playing a game together",
"motivation": null,
"immediateReaction": "Yes, let's try a new game together. We haven't started yet."
}
},
{
"id": "event_f34dc0dded68cf88",
"stableKey": "action:0:minutes-advanced:2026-01-05:550:30:2026-01-05:580",
"sequence": 79,
"type": "simulation.minutes-advanced",
"occurredAt": "2026-01-05",
"recordedAt": "2026-01-05",
"jurisdictionId": "jurisdiction_a4a6991ef3dd5879",
"involvedEntityIds": [
"jurisdiction_a4a6991ef3dd5879"
],
"participants": [],
"personFactConstraints": [],
"visibility": "public",
"tags": [
"simulation.subday-time",
"simulation.time"
],
"summary": "Simulation time advanced 30 minutes.",
"context": {
"location": {
"jurisdictionId": "jurisdiction_a4a6991ef3dd5879",
"label": "Primary simulation jurisdiction",
"setting": null
},
"socialContext": "Deterministic canonical minute-level time transition.",
"pressure": null,
"choice": null,
"motivation": null,
"immediateReaction": null
}
},
{
"id": "event_267c7b34daa7b177",
"stableKey": "opening-life:talk:person_92b37a76281c2b0a:person_07bca4c7928d1476:79",
"sequence": 80,
"type": "life.conversation",
"occurredAt": "2026-01-05",
"recordedAt": "2026-01-05",
"jurisdictionId": "jurisdiction_a4a6991ef3dd5879",
"involvedEntityIds": [
"person_07bca4c7928d1476",
"person_249594aa35e58134",
"person_92b37a76281c2b0a",
"person_f3fc7d2fff9e6a4f"
],
"participants": [
{
"personId": "person_07bca4c7928d1476",
"role": "coordination:counterpart",
"detail": "Replied directly"
},
{
"personId": "person_249594aa35e58134",
"role": "observation:witness",
"detail": "Heard the conversation in the scene"
},
{
"personId": "person_92b37a76281c2b0a",
"role": "focus:subject",
"detail": "Spoke directly"
},
{
"personId": "person_f3fc7d2fff9e6a4f",
"role": "observation:witness",
"detail": "Heard the conversation in the scene"
}
],
"personFactConstraints": [],
"visibility": "private",
"tags": [
"life.answer:open",
"life.conversation",
"life.proposal.performed",
"life.proposal:event_267fff34daaac79a",
"life.talk:spendTime",
"moment:{\"date\":\"2026-01-05\",\"minuteOfDay\":580,\"timeZone\":\"America/New_York\",\"utcOffsetMinutes\":-300}",
"scene:event_3ba36e8d3ec4eaa2"
],
"summary": "Miranda Valdez: Spend half an hour together. Elena Parsons: I'm glad we took time to try a new game together.",
"context": {
"location": {
"jurisdictionId": "jurisdiction_a4a6991ef3dd5879",
"label": "Home",
"setting": "home"
},
"socialContext": "A direct ordinary conversation",
"pressure": null,
"choice": "Spend 30 minutes: try a new game together",
"motivation": null,
"immediateReaction": "I'm glad we took time to try a new game together."
}
}
],
"minutes": {
"proposal": 0,
"agreement": 0,
"performance": 30,
"decline": 0,
"cancel": 0
},
"decline": {
"request": {
"id": "event_267fff34daaac79a",
"stableKey": "opening-life:talk:person_92b37a76281c2b0a:person_07bca4c7928d1476:69",
"sequence": 69,
"type": "life.conversation",
"occurredAt": "2026-01-05",
"recordedAt": "2026-01-05",
"jurisdictionId": "jurisdiction_a4a6991ef3dd5879",
"involvedEntityIds": [
"person_07bca4c7928d1476",
"person_249594aa35e58134",
"person_92b37a76281c2b0a",
"person_f3fc7d2fff9e6a4f"
],
"participants": [
{
"personId": "person_07bca4c7928d1476",
"role": "coordination:counterpart",
"detail": "Replied directly"
},
{
"personId": "person_249594aa35e58134",
"role": "observation:witness",
"detail": "Heard the conversation in the scene"
},
{
"personId": "person_92b37a76281c2b0a",
"role": "focus:subject",
"detail": "Spoke directly"
},
{
"personId": "person_f3fc7d2fff9e6a4f",
"role": "observation:witness",
"detail": "Heard the conversation in the scene"
}
],
"personFactConstraints": [],
"visibility": "private",
"tags": [
"life.answer:explore",
"life.conversation",
"life.proposal.v1:{\"actorPersonId\":\"person_07bca4c7928d1476\",\"activity\":\"new-game\",\"minutes\":30,\"condition\":null}",
"life.talk:activity",
"moment:{\"date\":\"2026-01-05\",\"minuteOfDay\":550,\"timeZone\":\"America/New_York\",\"utcOffsetMinutes\":-300}",
"scene:event_3ba36e8d3ec4eaa2"
],
"summary": "Miranda Valdez: Ask what they would like to do. Elena Parsons: We could try a new game. Would you like that?",
"context": {
"location": {
"jurisdictionId": "jurisdiction_a4a6991ef3dd5879",
"label": "Home",
"setting": "home"
},
"socialContext": "A direct ordinary conversation",
"pressure": null,
"choice": "Ask what they would like to do",
"motivation": null,
"immediateReaction": "We could try a new game. Would you like that?"
}
},
"terms": {
"actorPersonId": "person_07bca4c7928d1476",
"activity": "new-game",
"minutes": 30,
"condition": null
},
"response": {
"id": "event_267c6e34daa79b60",
"stableKey": "opening-life:talk:person_92b37a76281c2b0a:person_07bca4c7928d1476:74",
"sequence": 74,
"type": "life.conversation",
"occurredAt": "2026-01-05",
"recordedAt": "2026-01-05",
"jurisdictionId": "jurisdiction_a4a6991ef3dd5879",
"involvedEntityIds": [
"person_07bca4c7928d1476",
"person_249594aa35e58134",
"person_92b37a76281c2b0a",
"person_f3fc7d2fff9e6a4f"
],
"participants": [
{
"personId": "person_07bca4c7928d1476",
"role": "coordination:counterpart",
"detail": "Replied directly"
},
{
"personId": "person_249594aa35e58134",
"role": "observation:witness",
"detail": "Heard the conversation in the scene"
},
{
"personId": "person_92b37a76281c2b0a",
"role": "focus:subject",
"detail": "Spoke directly"
},
{
"personId": "person_f3fc7d2fff9e6a4f",
"role": "observation:witness",
"detail": "Heard the conversation in the scene"
}
],
"personFactConstraints": [],
"visibility": "private",
"tags": [
"life.answer:open",
"life.conversation",
"life.proposal.declined",
"life.proposal:event_267fff34daaac79a",
"life.talk:declineProposal",
"moment:{\"date\":\"2026-01-05\",\"minuteOfDay\":550,\"timeZone\":\"America/New_York\",\"utcOffsetMinutes\":-300}",
"scene:event_3ba36e8d3ec4eaa2"
],
"summary": "Miranda Valdez: Decline their proposed activity. Elena Parsons: All right. We can leave that activity for another time.",
"context": {
"location": {
"jurisdictionId": "jurisdiction_a4a6991ef3dd5879",
"label": "Home",
"setting": "home"
},
"socialContext": "A direct ordinary conversation",
"pressure": null,
"choice": "Decline to try a new game together",
"motivation": null,
"immediateReaction": "All right. We can leave that activity for another time."
}
},
"status": "declined",
"label": "try a new game together"
},
"cancel": {
"request": {
"id": "event_267fff34daaac79a",
"stableKey": "opening-life:talk:person_92b37a76281c2b0a:person_07bca4c7928d1476:69",
"sequence": 69,
"type": "life.conversation",
"occurredAt": "2026-01-05",
"recordedAt": "2026-01-05",
"jurisdictionId": "jurisdiction_a4a6991ef3dd5879",
"involvedEntityIds": [
"person_07bca4c7928d1476",
"person_249594aa35e58134",
"person_92b37a76281c2b0a",
"person_f3fc7d2fff9e6a4f"
],
"participants": [
{
"personId": "person_07bca4c7928d1476",
"role": "coordination:counterpart",
"detail": "Replied directly"
},
{
"personId": "person_249594aa35e58134",
"role": "observation:witness",
"detail": "Heard the conversation in the scene"
},
{
"personId": "person_92b37a76281c2b0a",
"role": "focus:subject",
"detail": "Spoke directly"
},
{
"personId": "person_f3fc7d2fff9e6a4f",
"role": "observation:witness",
"detail": "Heard the conversation in the scene"
}
],
"personFactConstraints": [],
"visibility": "private",
"tags": [
"life.answer:explore",
"life.conversation",
"life.proposal.v1:{\"actorPersonId\":\"person_07bca4c7928d1476\",\"activity\":\"new-game\",\"minutes\":30,\"condition\":null}",
"life.talk:activity",
"moment:{\"date\":\"2026-01-05\",\"minuteOfDay\":550,\"timeZone\":\"America/New_York\",\"utcOffsetMinutes\":-300}",
"scene:event_3ba36e8d3ec4eaa2"
],
"summary": "Miranda Valdez: Ask what they would like to do. Elena Parsons: We could try a new game. Would you like that?",
"context": {
"location": {
"jurisdictionId": "jurisdiction_a4a6991ef3dd5879",
"label": "Home",
"setting": "home"
},
"socialContext": "A direct ordinary conversation",
"pressure": null,
"choice": "Ask what they would like to do",
"motivation": null,
"immediateReaction": "We could try a new game. Would you like that?"
}
},
"terms": {
"actorPersonId": "person_07bca4c7928d1476",
"activity": "new-game",
"minutes": 30,
"condition": null
},
"response": {
"id": "event_267c7b34daa7b177",
"stableKey": "opening-life:talk:person_92b37a76281c2b0a:person_07bca4c7928d1476:79",
"sequence": 79,
"type": "life.conversation",
"occurredAt": "2026-01-05",
"recordedAt": "2026-01-05",
"jurisdictionId": "jurisdiction_a4a6991ef3dd5879",
"involvedEntityIds": [
"person_07bca4c7928d1476",
"person_249594aa35e58134",
"person_92b37a76281c2b0a",
"person_f3fc7d2fff9e6a4f"
],
"participants": [
{
"personId": "person_07bca4c7928d1476",
"role": "coordination:counterpart",
"detail": "Replied directly"
},
{
"personId": "person_249594aa35e58134",
"role": "observation:witness",
"detail": "Heard the conversation in the scene"
},
{
"personId": "person_92b37a76281c2b0a",
"role": "focus:subject",
"detail": "Spoke directly"
},
{
"personId": "person_f3fc7d2fff9e6a4f",
"role": "observation:witness",
"detail": "Heard the conversation in the scene"
}
],
"personFactConstraints": [],
"visibility": "private",
"tags": [
"life.answer:open",
"life.conversation",
"life.proposal.cancelled",
"life.proposal:event_267fff34daaac79a",
"life.talk:cancelProposal",
"moment:{\"date\":\"2026-01-05\",\"minuteOfDay\":550,\"timeZone\":\"America/New_York\",\"utcOffsetMinutes\":-300}",
"scene:event_3ba36e8d3ec4eaa2"
],
"summary": "Miranda Valdez: Cancel the agreed activity. Elena Parsons: All right. We won't start that activity.",
"context": {
"location": {
"jurisdictionId": "jurisdiction_a4a6991ef3dd5879",
"label": "Home",
"setting": "home"
},
"socialContext": "A direct ordinary conversation",
"pressure": null,
"choice": "Cancel the agreed activity",
"motivation": null,
"immediateReaction": "All right. We won't start that activity."
}
},
"status": "cancelled",
"label": "try a new game together"
},
"repeatRejected": true,
"performedCount": 1
}
