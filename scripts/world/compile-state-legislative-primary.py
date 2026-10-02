"""Intake configured official precinct reports against the current Census plan."""
import argparse
import collections
import hashlib
import json
from pathlib import Path
import xml.etree.ElementTree as ET
import zipfile

parser = argparse.ArgumentParser()
parser.add_argument('source_id')
parser.add_argument('artifact', type=Path)
parser.add_argument('--config', type=Path, default=Path('data/research/elections/state-legislative-primary-intake.json'))
parser.add_argument('--output', type=Path, default=Path('data/research/elections/state-legislative-district-results.json'))
args = parser.parse_args()
config = next(row for row in json.loads(args.config.read_text())['sources'] if row['id'] == args.source_id)
if hashlib.sha256(args.artifact.read_bytes()).hexdigest() != config['sha256']:
    raise ValueError('Primary artifact bytes do not match the admitted source hash')
ns = {'s': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main', 'r': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'}
with zipfile.ZipFile(args.artifact) as archive:
    strings = []
    if 'xl/sharedStrings.xml' in archive.namelist():
        strings = [''.join(row.itertext()) for row in ET.fromstring(archive.read('xl/sharedStrings.xml')).findall('s:si', ns)]
    workbook = ET.fromstring(archive.read('xl/workbook.xml'))
    sheet = next(row for row in workbook.findall('s:sheets/s:sheet', ns) if row.attrib['name'] == config['worksheet'])
    relationships = ET.fromstring(archive.read('xl/_rels/workbook.xml.rels'))
    target = next(row.attrib['Target'] for row in relationships if row.attrib['Id'] == sheet.attrib['{'+ns['r']+'}id'])
    path = target.lstrip('/') if target.startswith('/') else 'xl/' + target
    document = ET.fromstring(archive.read(path))
rows = []
for row in document.findall('s:sheetData/s:row', ns):
    values = {}
    for cell in row.findall('s:c', ns):
        column = ''.join(c for c in cell.attrib['r'] if c.isalpha())
        value = cell.find('s:v', ns)
        text = value.text if value is not None else ''.join(cell.find('s:is', ns).itertext()) if cell.find('s:is', ns) is not None else ''
        if cell.attrib.get('t') == 's': text = strings[int(text)]
        values[column] = text
    rows.append((int(row.attrib['r']), values))
header = rows[0][1]
columns = {field: column for column, field in header.items()}
totals = collections.defaultdict(collections.Counter)
locators = collections.defaultdict(list)
for number, cells in rows[1:]:
    if not cells.get(columns[config['precinctIdField']], '').isdigit(): continue
    for contest in config['contests']:
        votes = {field: int(float(cells.get(columns[field], '') or '0')) for field in contest['voteFields']}
        if sum(votes.values()) == 0: continue
        district = cells[columns[contest['districtField']]].upper().zfill(3)
        key = (contest['chamber'], district)
        totals[key].update(votes)
        locators[key].append(number)
catalog = json.loads(Path('src/districts/identities.generated.json').read_text())['records']
current = {(row['chamber'], row['districtCode']): row for row in catalog if row['stateUsps'] == config['stateUsps'] and row['stateFips'] == config['stateFips'] and not row['isUnassignedResidual']}
result = json.loads(args.output.read_text())
prefix = config['id'] + '|'
result['records'] = [row for row in result['records'] if not row['key'].startswith(prefix)]
result['bindings'] = [row for row in result['bindings'] if not row['sourceSeatKey'].startswith(prefix)]
for (chamber, district), votes in sorted(totals.items()):
    field = max(votes, key=votes.get)
    if sum(value == votes[field] for value in votes.values()) != 1: raise ValueError('No unique certified party vote winner')
    contest = next(row for row in config['contests'] if row['chamber'] == chamber)
    party = contest['voteFields'][field]
    if party is None: raise ValueError('Write-in aggregate cannot identify a winning party')
    identity = current[(chamber, district)]
    key = prefix + chamber + '|' + district
    result['records'].append({
        'key': key, 'stateUsps': config['stateUsps'], 'chamber': chamber,
        'districtName': district, 'districtNumber': district,
        'geographyPost': '', 'memberPost': '', 'boundaryRegime': int(config['electionDate'][:4]),
        'winners': [{'date': config['electionDate'], 'candidateId': field,
            'partyCode': party, 'partyName': contest['partyNames'][party],
            'caseIds': [f"{config['id']}:{config['worksheet']}!{number}:{field}" for number in locators[(chamber, district)]],
            'seatsContested': 1, 'districtSeats': 1, 'redistrictingCode': 'official-current-plan',
            'officialVotes': dict(votes)}],
    })
    result['bindings'].append({
        'districtRecordId': identity['recordId'], 'districtVintage': identity['vintage'],
        'memberOrdinal': 1, 'sourceSeatKey': key,
        'boundaryEvidence': config['boundaryEvidence']['url'] + ' §4.19/p4-45: ' + config['boundaryEvidence']['statement'] + ' ' + config['boundaryEvidence']['identityStatement'],
    })
metadata = {**config, 'sha256': hashlib.sha256(args.artifact.read_bytes()).hexdigest(), 'retrievedAt': config['retrievedAt'],
    'candidateIdentityLimit': 'CandidateId is the official candidate-party vote column, not a researched personal identity; no candidate name is invented.'}
result['primarySources'] = [row for row in result.get('primarySources', []) if row['id'] != config['id']] + [metadata]
args.output.write_text(json.dumps(result, indent=2) + '\n')
print(json.dumps({'primaryBoundContests': len(totals), 'verifiedBindingsTotal': len(result['bindings'])}))
