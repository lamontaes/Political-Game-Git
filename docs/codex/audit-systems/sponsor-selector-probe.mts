import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createNewGameWorld,DEFAULT_NEW_GAME_SETUP} from '../../../src/presentation/new-game.ts';
import {searchLifePlaces,stateJurisdictionForKey} from '../../../src/simulation/life-places.ts';
import {ensureWorldStartingConditions} from '../../../src/simulation/world-setup/conditions.ts';
import {generatePoliticalStartingConditions} from '../../../src/simulation/world-setup/political-start.ts';
import {CRUNCH46_WORLD_OPENING_VERSION} from '../../../src/simulation/world-setup/types.ts';
import {ensureStateExecutiveIncumbent} from '../../../src/simulation/nationwide-world/state-executives.ts';
import {ensureStateLegislatureOpening} from '../../../src/simulation/nationwide-world/state-legislature-opening.ts';
import {legislativeBlueprint} from '../../../src/simulation/legislation-scenarios.ts';
import {seatedChamberForPack} from '../../../src/simulation/governing/chamber-votes.ts';
import {ensureOfficeholderPrinciples,principledLeaning,recordedPrinciplesForPerson} from '../../../src/simulation/governing/officeholder-principles.ts';
import {personName} from '../../../src/simulation/people.ts';
const place=searchLifePlaces('',1,{stateJurisdictionKey:'US-AK',scope:'locality'})[0]!;
const game=createNewGameWorld({...DEFAULT_NEW_GAME_SETUP,seed:'member-agenda-US-AK',placeKey:place.key,startAge:40,questionnaire:'skipped'});
let world=ensureWorldStartingConditions(game.world,{openingVersion:CRUNCH46_WORLD_OPENING_VERSION,political:generatePoliticalStartingConditions});
world=ensureStateExecutiveIncumbent(world,game.playerPersonId,'AK');
world=ensureStateLegislatureOpening(world,game.playerPersonId,'AK');
const blueprint=legislativeBlueprint('alaska');
const chamber=blueprint.pack.chambers.find(c=>c.introductionAllowed)!;
const seated=seatedChamberForPack(world,blueprint.pack.packId,chamber.chamberKey,chamber.name)!;
const members=seated.body.members.flatMap(m=>m.personId?[m.personId]:[]);
world=ensureOfficeholderPrinciples(world,members);
const question=Object.values(world.policyCatalog.propositions).find(p=>p.stableKey==='us-policy-positions:transportation-infrastructure.additional-rural-transit-service-hours')!;
const scores=members.map(personId=>({personId,name:personName(world.people[personId]!),...principledLeaning(world,personId,question.id)})).sort((a,b)=>b.score-a.score);
const top=scores.slice(0,3).map(row=>({...row,records:recordedPrinciplesForPerson(world,row.personId).filter(r=>row.recordIds.includes(r.id))}));
const head=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
if(head!==process.env.OCD_AUDIT_EXPECTED_MAIN) throw Error('Source pin mismatch');
const result={head,seed:world.seed,place:place.displayName,placeKey:place.key,
  stage:'same fixture opening and sponsor selector; zero days advanced, no compiler/filing/enactment/program payment invoked',
  members:members.length,selectorThreshold:3,qualifying:scores.filter(s=>s.score>=3).length,
  positive:scores.filter(s=>s.score>0).length,zero:scores.filter(s=>s.score===0).length,negative:scores.filter(s=>s.score<0).length,
  maximum:scores[0]?.score,minimum:scores.at(-1)?.score,top,allScores:scores,question};
fs.writeFileSync('docs/codex/audit-systems-sponsor-selector.json',JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({...result,allScores:undefined,question:undefined},null,2));
