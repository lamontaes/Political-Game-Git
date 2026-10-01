import fs from 'node:fs';
import {lifePlaceByKey} from '../../../src/simulation/life-places.ts';
import {placeLocalGovernmentUnits} from '../../../src/simulation/nationwide-world/local-governments.ts';
import {municipalGovernmentForLifePlace} from '../../../src/simulation/municipal-government.ts';
import {governmentUnitsForState,countyGeoidsForPlace} from '../../../src/simulation/government-units.ts';
const corpus=JSON.parse(fs.readFileSync('data/source/places/corpus.json','utf8'));
const rows=corpus.filter((p:any)=>p.functionalStatusCode==='F').map((p:any)=>{
  const place=lifePlaceByKey(p.geoid), governments=placeLocalGovernmentUnits(place);
  const counties=countyGeoidsForPlace(p.geoid);
  const unlinkedUnits=governmentUnitsForState(p.stateUsps).filter(u=>u.unitType==='municipality'&&!u.placeGeoid&&u.countyGeoid&&counties.includes(u.countyGeoid));
  const mapped=place?municipalGovernmentForLifePlace(place):null;
  return {placeKey:p.geoid,name:p.sourceName,state:p.stateUsps,sourceEvidence:p.evidence,
    lifePlaceAvailable:!!place,countyGeoids:counties,
    municipal:governments.municipal.map(u=>({id:u.id,name:u.name})),
    counties:governments.counties.map(u=>({id:u.id,name:u.name})),
    townships:governments.townships.map(u=>({id:u.id,name:u.name})),
    countyStatus:governments.countyStatus,countyReason:governments.countyReason,
    executableMunicipalMapping:mapped?{id:mapped.id}:null,unlinkedUnits};
});
const result={head:'fd4925e6a6dae3446d2fefe40df2cfc2d2ef931e',method:'Read-only pure canonical readers; no World created or advanced',
  corpusRows:corpus.length,cohort:'All functionalStatusCode F balance places in national place corpus',
  cohortCount:rows.length,unmappedAllLocalGovernmentCount:rows.filter(r=>!r.municipal.length&&!r.counties.length&&!r.townships.length).length,
  completeNationwideConsolidatedGovernmentCount:null,rows};
fs.writeFileSync('docs/codex/audit-systems-consolidated-government.json',JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({count:result.cohortCount,gapCount:result.unmappedAllLocalGovernmentCount,rows:rows.map(({unlinkedUnits,...r})=>({...r,unlinkedUnits:unlinkedUnits.map(u=>({id:u.id,name:u.name,countyGeoid:u.countyGeoid,placeGeoid:u.placeGeoid}))}))},null,2));
