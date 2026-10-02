"""Normalize configured certified summary pages without inventing party/tie rules."""
import argparse
import hashlib
import json
from pathlib import Path
import re
import subprocess

parser = argparse.ArgumentParser()
parser.add_argument('source_id')
parser.add_argument('artifact', type=Path)
parser.add_argument('--config', type=Path, default=Path('data/research/elections/state-legislative-primary-intake.json'))
parser.add_argument('--output', type=Path, default=Path('data/research/elections/state-legislative-district-results.json'))
args = parser.parse_args()
config = next(row for row in json.loads(args.config.read_text())['sources'] if row['id'] == args.source_id)
if hashlib.sha256(args.artifact.read_bytes()).hexdigest() != config['sha256']:
    raise ValueError('Official report bytes differ from admitted source')
text = subprocess.check_output(['pdftotext', '-layout', str(args.artifact), '-'], text=True)
catalog = json.loads(Path('src/districts/identities.generated.json').read_text())['records']
current = {row['districtCode']: row for row in catalog if row['stateUsps'] == config['stateUsps'] and row['stateFips'] == config['stateFips'] and row['chamber'] == config['chamber'] and not row['isUnassignedResidual']}
result = json.loads(args.output.read_text())
prefix = config['id'] + '|'
result['records'] = [row for row in result['records'] if not row['key'].startswith(prefix)]
result['bindings'] = [row for row in result['bindings'] if not row['sourceSeatKey'].startswith(prefix)]
count = 0
for page_no, page in enumerate(text.split('\f'), 1):
    district = re.search(re.escape(config['districtHeading']) + r' (\d+)', page)
    if not district:
        continue
    header = page[:page.index(config['firstDataLabel'])]
    parties = sorted((match.start(), match.group(1)) for line in header.splitlines() for match in re.finditer(r'\(([A-Z]+)\)', line))
    total = re.search(r'^Total\s+(.+)$', page, re.M)
    votes = [int(value.replace(',', '')) for value in re.findall(r'[\d,]+', total[1])]
    # The report lists named candidates, write-ins, overvotes, undervotes.
    if len(votes) != len(parties) + 3:
        raise ValueError('Candidate columns do not align to reported totals')
    winner = max(range(len(parties)), key=lambda index: votes[index])
    if votes[winner] <= max(value for index, value in enumerate(votes[:-2]) if index != winner):
        raise ValueError('Party winner is tied or cannot beat aggregate write-ins')
    party = config['partyCodes'][parties[winner][1]]
    code = district[1].zfill(3)
    identity = current[code]
    key = prefix + config['chamber'] + '|' + code
    result['records'].append({
        'key': key, 'stateUsps': config['stateUsps'], 'chamber': config['chamber'],
        'districtName': code, 'districtNumber': code, 'geographyPost': '', 'memberPost': '',
        'boundaryRegime': int(config['electionDate'][:4]),
        'winners': [{'date': config['electionDate'], 'candidateId': f'page:{page_no}:candidate-column:{winner}',
            'partyCode': party, 'partyName': config['partyNames'][party],
            'caseIds': [f"{config['id']}:page:{page_no}:candidate-column:{winner}"],
            'seatsContested': 1, 'districtSeats': 1, 'redistrictingCode': 'official-current-plan',
            'officialVotes': votes, 'candidateHeader': header}],
    })
    result['bindings'].append({
        'districtRecordId': identity['recordId'], 'districtVintage': identity['vintage'],
        'memberOrdinal': 1, 'sourceSeatKey': key,
        'boundaryEvidence': config['boundaryEvidence']['url'] + ' §4.19/p4-45: ' + config['boundaryEvidence']['statement'] + ' ' + config['boundaryEvidence']['identityStatement'],
    })
    count += 1
if not count:
    raise ValueError('No official district results found')
result['primarySources'] = [row for row in result.get('primarySources', []) if row['id'] != config['id']] + [config]
args.output.write_text(json.dumps(result, indent=2) + '\n')
print(json.dumps({'admittedContests': count, 'verifiedBindingsTotal': len(result['bindings'])}))
