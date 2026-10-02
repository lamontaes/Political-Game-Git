"""Bind reviewed official elected-record extraction to an evidenced current plan."""
import argparse
import hashlib
import json
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument('source_id')
parser.add_argument('--artifacts', type=Path, required=True)
parser.add_argument('--config', type=Path, default=Path('data/research/elections/state-legislative-primary-intake.json'))
parser.add_argument('--output', type=Path, default=Path('data/research/elections/state-legislative-district-results.json'))
args = parser.parse_args()
config = next(row for row in json.loads(args.config.read_text())['sources'] if row['id'] == args.source_id)
for artifact in config['artifacts']:
    if hashlib.sha256((args.artifacts / artifact['file']).read_bytes()).hexdigest() != artifact['sha256']:
        raise ValueError('Official artifact differs from reviewed extraction')
catalog = json.loads(Path('src/districts/identities.generated.json').read_text())['records']
identities = {(row['chamber'], row['districtCode']): row for row in catalog if row['stateUsps'] == config['stateUsps'] and row['stateFips'] == config['stateFips'] and not row['isUnassignedResidual']}
result = json.loads(args.output.read_text())
prefix = config['id'] + '|'
result['records'] = [row for row in result['records'] if not row['key'].startswith(prefix)]
result['bindings'] = [row for row in result['bindings'] if not row['sourceSeatKey'].startswith(prefix)]
seen = set()
for elected in config['electedRecords']:
    seat = (elected['chamber'], elected['districtCode'])
    if seat in seen: raise ValueError('Duplicate own-seat elected record')
    seen.add(seat)
    if elected['proofKind'] == 'official-summary-majority':
        if elected['reportedPercentage'] <= 50: raise ValueError('Plurality is not a completed ranked-choice result')
    elif elected['proofKind'] != 'explicit-rcv-elected-statement' or 'is elected' not in elected['selectionEvidence']:
        raise ValueError('No explicit completed winner evidence')
    identity = identities[seat]
    key = prefix + '|'.join(seat)
    party = config['partyCodes'].get(elected['partyLabel'], 'designation:' + elected['partyLabel'])
    winner = {'date': config['electionDate'], 'candidateId': elected['candidateName'], 'partyCode': party, 'partyName': elected['partyLabel'], 'caseIds': [config['id'] + ':' + elected['locator']], 'seatsContested': 1, 'districtSeats': 1, 'redistrictingCode': 'official-current-plan', 'officialVotes': elected['finalRoundVotes'], 'finalRound': elected['finalRound'], 'sourceEvidence': elected}
    result['records'].append({'key': key, 'stateUsps': config['stateUsps'], 'chamber': elected['chamber'], 'districtName': elected['districtCode'], 'districtNumber': elected['districtCode'], 'geographyPost': '', 'memberPost': '', 'boundaryRegime': config['planCycle'], 'winners': [winner]})
    if party in ['d', 'r']:
        result['bindings'].append({'districtRecordId': identity['recordId'], 'districtVintage': identity['vintage'], 'memberOrdinal': 1, 'sourceSeatKey': key, 'boundaryEvidence': config['boundaryEvidence']['url'] + ' §4.19/p4-45: ' + config['boundaryEvidence']['statement'] + ' ' + config['boundaryEvidence']['identityStatement']})
if len(seen) != config['expectedContests']: raise ValueError('Incomplete extracted source')
result['primarySources'] = [row for row in result.get('primarySources', []) if row['id'] != config['id']] + [config]
args.output.write_text(json.dumps(result, indent=2) + '\n')
print(json.dumps({'officialContests': len(seen), 'verifiedBindingsTotal': len(result['bindings'])}))
