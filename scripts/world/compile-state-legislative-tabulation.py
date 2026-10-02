"""Bind configured certified workbook totals to an evidenced current plan."""
import argparse
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
    raise ValueError('Tabulation bytes differ from the admitted artifact')
ns = {'s': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
with zipfile.ZipFile(args.artifact) as archive:
    strings = [''.join(row.itertext()) for row in ET.fromstring(archive.read('xl/sharedStrings.xml')).findall('s:si', ns)]
    rows = []
    for row in ET.fromstring(archive.read(config['worksheetPath'])).findall('s:sheetData/s:row', ns):
        values = {}
        for cell in row.findall('s:c', ns):
            column = ''.join(c for c in cell.attrib['r'] if c.isalpha())
            value = cell.find('s:v', ns)
            text = value.text if value is not None else ''
            values[column] = strings[int(text)] if cell.attrib.get('t') == 's' else text
        rows.append((int(row.attrib['r']), values))
catalog = json.loads(Path('src/districts/identities.generated.json').read_text())['records']
identities = {row['districtCode']: row for row in catalog if row['stateUsps'] == config['stateUsps'] and row['stateFips'] == config['stateFips'] and row['chamber'] == config['chamber'] and not row['isUnassignedResidual']}
result = json.loads(args.output.read_text())
headers = []
district = None
count = 0
for number, cells in rows:
    if cells.get('A', '').strip().isdigit():
        district = cells['A'].strip().zfill(3)
    if not any(value.strip().upper() == 'TOTAL' for value in cells.values()):
        if not cells.get('A', '').strip().isdigit(): headers.append(cells)
        continue
    # Candidate identities and designations are the report's header cells.
    party_row = next((row for row in reversed(headers) if any(value.strip() in config['designationCodes'] for value in row.values())), None)
    if party_row is None: raise ValueError('No recorded candidate designation header')
    candidates = []
    for column, designation in party_row.items():
        designation = designation.strip()
        if designation not in config['designationCodes']: continue
        name = next((row[column].strip() for row in headers if row.get(column, '').strip() and row[column].strip() not in config['designationCodes'] and row[column].strip().upper() not in ['BLANK', 'TBC', 'OTHERS']), None)
        if name is None: raise ValueError('Missing recorded candidate name')
        candidates.append((int(float(cells[column])), column, name, designation))
    candidates.sort(reverse=True)
    if len(candidates) > 1 and candidates[0][0] == candidates[1][0]: raise ValueError('Tied certified tabulation')
    votes, column, name, designation = candidates[0]
    party = config['designationCodes'][designation]
    identity = identities[district]
    key = config['seatSeriesId'] + '|' + config['chamber'] + '|' + district
    record = next((row for row in result['records'] if row['key'] == key), None)
    if record is None:
        record = {'key': key, 'stateUsps': config['stateUsps'], 'chamber': config['chamber'], 'districtName': district, 'districtNumber': district, 'geographyPost': '', 'memberPost': '', 'boundaryRegime': config['planCycle'], 'winners': []}
        result['records'].append(record)
    record['winners'] = [row for row in record['winners'] if row['date'] != config['electionDate']]
    record['winners'].append({'date': config['electionDate'], 'candidateId': name, 'partyCode': party, 'partyName': designation, 'caseIds': [f"{config['id']}:{config['worksheetPath']}!{column}{number}"], 'seatsContested': 1, 'districtSeats': 1, 'redistrictingCode': 'official-current-plan', 'officialVotes': votes})
    record['winners'].sort(key=lambda row: row['date'])
    # Preserve unaffiliated/designation facts; do not invent a party organization.
    result['bindings'] = [row for row in result['bindings'] if row['sourceSeatKey'] != key]
    if all(row['partyCode'] in ['d', 'r'] for row in record['winners']):
        result['bindings'].append({'districtRecordId': identity['recordId'], 'districtVintage': identity['vintage'], 'memberOrdinal': 1, 'sourceSeatKey': key, 'boundaryEvidence': config['boundaryEvidence']['url'] + ' §4.19/p4-45: ' + config['boundaryEvidence']['statement'] + ' ' + config['boundaryEvidence']['identityStatement']})
    headers = []
    count += 1
if count != config['expectedContests']: raise ValueError(f'Incomplete tabulation: {count}')
result['primarySources'] = [row for row in result.get('primarySources', []) if row['id'] != config['id']] + [config]
args.output.write_text(json.dumps(result, indent=2) + '\n')
print(json.dumps({'contests': count, 'bindings': len(result['bindings'])}))
