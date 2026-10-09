#!/usr/bin/env python3
"""Stage-only source: archive a completed paired v5 year, never run the game.

Requires explicit captures/logs/player/output and attributed historical gates.
No original input, capture, log, source or historical receipt is modified.
All output files use exclusive creation; the comparison JSON is written last.
"""
from __future__ import annotations

import argparse
import calendar
from collections import Counter, defaultdict
import csv
from datetime import date
import gzip
import hashlib
import io
import json
import math
from pathlib import Path
import re
import statistics
import sys

CHUNK_BYTES = 1024 * 1024       # I/O buffer, not a simulation parameter.
EXPECTED_DAYS = 365            # Explicit requested capture contract.
EXPECTED_WARMUPS = 1
EXPECTED_RUNS = 3
MAX_SAFE_INTEGER = 9007199254740991  # ECMAScript Number safe-integer identity.
CSV_FIELDS = ['month', 'actorId', 'actionId', 'acts', 'needContribution', 'goalContribution', 'driveContribution']
HEX256 = re.compile(r'^[0-9a-f]{64}$')


class Incompatible(ValueError):
    pass


def require(condition, message):
    if not condition:
        raise Incompatible(message)


class RawFloat(float):
    """Retain producer JSON number spelling for exact JS compact-hash checks."""
    def __new__(cls, token):
        value = super().__new__(cls, token)
        value.token = token
        require(math.isfinite(value), 'Non-finite JSON number')
        return value


def reject_constant(token):
    raise Incompatible('Non-finite JSON constant: ' + token)


def unique_object(pairs):
    result = {}
    for key, value in pairs:
        require(key not in result, 'Duplicate JSON object field: ' + key)
        result[key] = value
    return result


def read_json(path):
    with path.open(encoding='utf-8') as stream:
        return json.load(stream, parse_float=RawFloat, parse_constant=reject_constant, object_pairs_hook=unique_object)


def compact(value):
    # Captures came from JSON.stringify. Preserve the producer's float lexemes,
    # field order and UTF-8 strings rather than Python's different float spelling.
    if value is None:
        return 'null'
    if value is True:
        return 'true'
    if value is False:
        return 'false'
    if isinstance(value, RawFloat):
        return value.token
    if type(value) is int:
        return str(value)
    if type(value) is float:
        require(math.isfinite(value), 'Non-finite reconstructed number')
        return json.dumps(value, allow_nan=False)
    if isinstance(value, str):
        return json.dumps(value, ensure_ascii=False)
    if isinstance(value, list):
        return '[' + ','.join(compact(row) for row in value) + ']'
    if isinstance(value, dict):
        return '{' + ','.join(compact(key) + ':' + compact(row) for key, row in value.items()) + '}'
    raise Incompatible('Unsupported JSON value: ' + type(value).__name__)


def digest_object(value):
    return hashlib.sha256(compact(value).encode('utf-8')).hexdigest()


def sha(path):
    digest = hashlib.sha256()
    with path.open('rb') as stream:
        for chunk in iter(lambda: stream.read(CHUNK_BYTES), b''):
            digest.update(chunk)
    return digest.hexdigest()


def descriptor(path):
    return {'path': str(path), 'bytes': path.stat().st_size, 'sha256': sha(path)}


def integer(value, field, minimum=0):
    require(type(value) is int and minimum <= value <= MAX_SAFE_INTEGER, field + ': expected a safe integer')
    return value


def finite(value, field, minimum=None):
    require(type(value) is not bool and isinstance(value, (int, float)) and math.isfinite(value), field + ': expected finite numeric value')
    if minimum is not None:
        require(value >= minimum, field + ': below minimum')
    return value


def near(actual, expected, field, terms=32, originating_scale=None):
    finite(actual, field); finite(expected, field)
    # Floating addition admission only, never an empirical/calibration tolerance.
    # A conservative standard gamma_n bound covers different sum partitions.
    epsilon = math.ulp(1.0)
    count = max(32, terms * 4)
    require(count * epsilon < 1, field + ': unsupported floating accumulation size')
    scale = max(abs(float(actual)), abs(float(expected)), 1.0)
    if originating_scale is not None:
        scale = max(scale, finite(originating_scale, field + ' originating sum scale', 0))
    bound = (count * epsilon / (1 - count * epsilon)) * scale
    require(abs(actual - expected) <= bound, f'{field}: differs by {actual - expected}, floating bound {bound}')


def rooted(repo, relative_name):
    require(isinstance(relative_name, str) and not Path(relative_name).is_absolute(), 'Manifest path must be relative')
    path = (repo / relative_name).resolve()
    require(path.is_relative_to(repo), 'Manifest path escapes repository: ' + relative_name)
    return path


def verify_source(repo, manifest):
    require(isinstance(manifest, dict) and HEX256.fullmatch(manifest.get('sha256', '')), 'Invalid source manifest')
    rows = manifest['files']
    require(len(rows) == manifest['fileCount'], 'Source manifest fileCount mismatch')
    names = [row['path'] for row in rows]
    require(names == sorted(set(names)), 'Source manifest has duplicate/unsorted paths')
    current_names = sorted(str(path.relative_to(repo)) for path in (repo / 'src/core2').rglob('*')
                           if path.is_file() and not path.is_relative_to(repo / 'src/core2/receipts')
                           and (path.suffix == '.json' or (path.suffix == '.ts' and not path.name.endswith('.test.ts'))))
    require(names == current_names, 'Captured source file set differs from the frozen repository')
    digest = hashlib.sha256()
    for row in rows:
        require(row['path'].startswith('src/core2/') and not row['path'].startswith('src/core2/receipts/'), 'Unexpected captured source scope')
        path = rooted(repo, row['path'])
        require(path.stat().st_size == row['bytes'] and sha(path) == row['sha256'], 'Captured source differs: ' + row['path'])
        digest.update(row['path'].encode()); digest.update(b'\0')
        with path.open('rb') as stream:
            for chunk in iter(lambda: stream.read(CHUNK_BYTES), b''):
                digest.update(chunk)
        digest.update(b'\0')
    require(digest.hexdigest() == manifest['sha256'], 'Captured source aggregate hash mismatch')
    direct = manifest['directRuntimeDependencies']
    require(len({row['path'] for row in direct}) == len(direct), 'Duplicate direct dependency pin')
    expected = {'src/simulation/dates.ts', 'src/simulation/ids.ts', 'data/content/act-kinds.json', 'data/content/trait-act-pulls.json'}
    require(expected.issubset({row['path'] for row in direct}), 'Missing original direct dependency pins')
    for row in direct:
        path = rooted(repo, row['path'])
        require(path.stat().st_size == row['bytes'] and sha(path) == row['sha256'], 'Direct dependency differs: ' + row['path'])


class StreamingTopObject:
    """Parse large prepared arrays one entity at a time, retaining no fact prose."""
    def __init__(self, stream):
        self.stream, self.buffer, self.pos, self.eof = stream, '', 0, False
        self.decoder = json.JSONDecoder(parse_float=RawFloat, parse_constant=reject_constant, object_pairs_hook=unique_object)

    def fill(self):
        if self.pos:
            self.buffer, self.pos = self.buffer[self.pos:], 0
        chunk = self.stream.read(CHUNK_BYTES)
        if not chunk:
            self.eof = True
        self.buffer += chunk

    def space(self):
        while True:
            while self.pos < len(self.buffer) and self.buffer[self.pos].isspace():
                self.pos += 1
            if self.pos < len(self.buffer) or self.eof:
                return
            self.fill()

    def char(self):
        self.space()
        require(self.pos < len(self.buffer), 'Truncated prepared JSON')
        return self.buffer[self.pos]

    def take(self, token):
        require(self.char() == token, 'Malformed prepared JSON; expected ' + token)
        self.pos += 1

    def value(self):
        self.space()
        while True:
            try:
                value, end = self.decoder.raw_decode(self.buffer, self.pos)
                if end == len(self.buffer) and not self.eof:
                    self.fill(); continue
                self.pos = end
                return value
            except json.JSONDecodeError as error:
                require(not self.eof, 'Incomplete/malformed prepared JSON: ' + str(error))
                self.fill()

    def array(self, callback):
        self.take('[')
        if self.char() == ']':
            self.take(']'); return
        while True:
            callback(self.value())
            token = self.char()
            self.take(token)
            require(token in {',', ']'}, 'Malformed prepared array separator')
            if token == ']':
                return

    def items(self, on_array, on_value):
        self.take('{')
        if self.char() == '}':
            self.take('}'); return
        seen = set()
        while True:
            key = self.value()
            require(isinstance(key, str) and key not in seen, 'Duplicate/nonstring prepared field')
            seen.add(key); self.take(':')
            if self.char() == '[':
                self.array(lambda row: on_array(key, row))
            else:
                on_value(key, self.value())
            token = self.char(); self.take(token)
            require(token in {',', '}'}, 'Malformed prepared object separator')
            if token == '}':
                self.space(); require(self.eof or self.pos == len(self.buffer), 'Trailing prepared JSON data')
                if not self.eof:
                    self.fill(); self.space(); require(self.pos == len(self.buffer) and self.eof, 'Trailing prepared JSON bytes')
                return


def prepared_facts(path, expected_hash):
    require(path.is_file() and sha(path) == expected_hash, 'Prepared input missing or hash differs: ' + str(path))
    result = {'people': {}, 'jobs': {}, 'organizations': {}, 'households': {}, 'focusPersonIds': [], 'focusPlaceIds': [], 'visiblePlaceIds': [], 'husks': 0, 'publicOrganizations': 0}
    cash = {'people': 0, 'organizations': 0}

    def array(key, row):
        if key in {'people', 'jobs', 'organizations', 'households'}:
            require(isinstance(row, dict) and isinstance(row.get('id'), str), 'Invalid prepared entity')
            require(row['id'] not in result[key], 'Duplicate prepared ' + key + ' ID')
        if key == 'people':
            result[key][row['id']] = {field: row.get(field) for field in ['id', 'givenName', 'familyName', 'birthDate', 'placeId', 'countyId', 'householdId', 'jobId', 'knownIds', 'familyIds']}
            cash[key] += integer(row['liquidMinor'], 'opening person cash')
        elif key == 'jobs':
            result[key][row['id']] = {field: row.get(field) for field in ['id', 'personId', 'organizationId', 'title', 'occupationClassification', 'hoursDaily', 'wageDailyMinor', 'hourlyMinor']}
        elif key == 'organizations':
            result[key][row['id']] = {field: row.get(field) for field in ['id', 'name', 'placeId', 'kind', 'classification', 'governmentFacts']}
            cash[key] += integer(row['liquidMinor'], 'opening organization cash')
        elif key == 'households':
            result[key][row['id']] = row['memberIds']
        elif key in {'focusPersonIds', 'focusPlaceIds', 'visiblePlaceIds'}:
            result[key].append(row)
        elif key in {'husks', 'publicOrganizations'}:
            result[key] += 1
        # Other arrays, including priorFactsSource, are parsed/discarded by entity.

    def scalar(key, value):
        if key in {'seed', 'startedAt', 'playerId', 'placeMetadata'}:
            result[key] = value

    with path.open(encoding='utf-8') as stream:
        StreamingTopObject(stream).items(array, scalar)
    assigned = []
    for household_id, members in result['households'].items():
        for person_id in members:
            require(person_id in result['people'] and result['people'][person_id]['householdId'] == household_id, 'Prepared household membership mismatch')
            assigned.append(person_id)
    require(len(assigned) == len(set(assigned)) == len(result['people']), 'Prepared household roster is not complete/unique')
    for job in result['jobs'].values():
        require(job['personId'] in result['people'] and job['organizationId'] in result['organizations'], 'Prepared job endpoint missing')
        require(result['people'][job['personId']]['jobId'] == job['id'], 'Prepared job is not owned')
    result['openingCashMinor'] = cash['people'] + cash['organizations']
    integer(result['openingCashMinor'], 'opening total cash')
    result['file'] = descriptor(path)
    require(result['file']['sha256'] == expected_hash, 'Prepared input changed while being read')
    result['file']['storageScope'] = 'Original outside-repository input retained by location/hash only; no copy is archived.'
    return result


def birthday(birth, age):
    try:
        return birth.replace(year=birth.year + age)
    except ValueError:
        require(birth.month == 2 and birth.day == 29, 'Unsupported birthday')
        return date(birth.year + age, 2, 28)


def month_chunks(start, through):
    chunks = []; current = start
    while current < through:
        end = date(current.year, current.month, calendar.monthrange(current.year, current.month)[1])
        if end <= current:
            following = date.fromordinal(current.toordinal() + 1)
            end = date(following.year, following.month, calendar.monthrange(following.year, following.month)[1])
        end = min(end, through)
        chunks.append({'month': end.strftime('%Y-%m'), 'throughDate': end.isoformat(), 'simulatedDays': (end - current).days})
        current = end
    return chunks


def expected_exposure(facts, start, through, config, parameters):
    first = date.fromordinal(start.toordinal() + 1)
    counts = {row['id']: 0 for row in config['ageRows']}
    for person in facts['people'].values():
        birth = date.fromisoformat(person['birthDate'])
        require(birth <= start, 'Prepared future-born resident')
        for row in config['ageRows']:
            minimum = integer(parameters[row['minimumAgeParameter']]['value'], 'age boundary')
            begin = max(first, birthday(birth, minimum))
            end = through
            if row.get('maximumAgeParameter'):
                limit = birthday(birth, integer(parameters[row['maximumAgeParameter']]['value'], 'upper age boundary'))
                end = min(end, date.fromordinal(limit.toordinal() - 1))
            if end >= begin:
                counts[row['id']] += (end - begin).days + 1
    require(sum(counts.values()) == len(facts['people']) * (through - start).days, 'Independent roster exposure does not cover every day')
    return counts


def validate_work(work, enabled, counts, action_counts, facts, exposure, start, through, work_data, config, reference, parameters):
    require(work['enabled'] is enabled and work['schema'] == config['version'], 'Work mode/schema mismatch')
    require(work['coefficientCalibration'] == 'not-inferred' and work['limitations'], 'Missing time-use/calibration limits')
    captured_exposure = work['exposure']
    require(captured_exposure['startExclusive'] == start.isoformat() and captured_exposure['throughInclusive'] == through.isoformat(), 'Exposure date mismatch')
    require(captured_exposure['simulatedDays'] == EXPECTED_DAYS and captured_exposure['residentCount'] == counts['people'], 'Exposure day/roster mismatch')
    require(captured_exposure['residentDiaryDays'] == counts['people'] * EXPECTED_DAYS, 'Exposure total mismatch')
    require({row['ageId']: row['residentDiaryDays'] for row in captured_exposure['byAge']} == exposure, 'Birthday-aware age exposure differs from actual input')
    by_age = work['byAge']
    require(len(by_age) == len(exposure) and len({row['ageId'] for row in by_age}) == len(by_age), 'Duplicate/missing time-use age bins')
    reference_rows = {row['cohort']: row for row in reference['rows']}
    age_config = {row['id']: row for row in config['ageRows']}
    minutes_per_hour = parameters['minutesPerHour']['value']
    paid_minutes = 0.0
    for row in by_age:
        require(row['residentDiaryDays'] == exposure[row['ageId']], 'Time-use age denominator mismatch')
        configured = age_config[row['ageId']]
        require(row['runtimeAgeId'] == configured['runtimeAgeId'] and row.get('referenceCohort') == configured.get('referenceCohort'), 'Age crosswalk differs from frozen data')
        minutes = finite(row['paidWorkMinutes'], 'age paid minutes', 0); paid_minutes += minutes
        categories = row['primaryCategoryMinutes']
        require(all(finite(value, 'primary activity minutes', 0) >= 0 for value in categories.values()), 'Invalid primary category')
        near(minutes, categories.get(config['paidWorkRuntimeCategory'], 0), 'Paid category crosswalk')
        denominator = row['residentDiaryDays']
        for category, value in categories.items():
            expected = value / minutes_per_hour / denominator if denominator else None
            actual = row['primaryCategoryHoursPerResidentDiaryDay'][category]
            require(actual is None if expected is None else actual is not None, 'Primary activity availability mismatch')
            if expected is not None:
                near(actual, expected, 'Primary activity per-resident day')
        expected_mean = minutes / minutes_per_hour / denominator if enabled and denominator else None
        actual_mean = row['paidWorkHoursPerResidentDiaryDay']
        require(actual_mean is None if expected_mean is None else actual_mean is not None, 'Disabled/empty work is not unavailable')
        if expected_mean is not None:
            near(actual_mean, expected_mean, 'Paid work per-resident day')
        cohort = configured.get('referenceCohort')
        reference_value = reference_rows[cohort]['hoursPerDiaryDay'][config['referenceWorkCategory']]['value'] if cohort else None
        require(row['atusWorkAndWorkRelatedHoursPerDiaryDay'] == reference_value, 'ATUS reference differs from frozen source')
        expected_difference = expected_mean - reference_value if expected_mean is not None and reference_value is not None else None
        require(row['contextualDifferenceHours'] is None if expected_difference is None else row['contextualDifferenceHours'] is not None, 'Context difference availability mismatch')
        if expected_difference is not None:
            near(row['contextualDifferenceHours'], expected_difference, 'Contextual ATUS difference')
        require(('subset' in row['comparisonStatus']) if enabled and cohort else True, 'ATUS subset scope missing')
    require(work['reference'] == {key: reference[key] for key in ['tag', 'source', 'title', 'retrievedAt', 'sha256', 'denominator', 'spreadLimit']}, 'Time-use source evidence changed')
    cal = work['calendar']; money = work['money']
    attended = integer(cal['attendedDatedSegments'], 'attended date segments'); absent = integer(cal['absentDatedSegments'], 'absent date segments')
    require(cal['plannedDatedSegments'] == attended + absent, 'Planned date segments mismatch')
    require('never whole-shift' in cal['unit'], 'Incorrect whole-shift label')
    require(attended == action_counts.get(work_data['attendanceAction']['id'], 0) and absent == action_counts.get(work_data['absenceAction']['id'], 0), 'Work committed action count mismatch')
    planned = finite(cal['plannedMinutes'], 'planned minutes', 0); used = finite(cal['attendedMinutes'], 'attended minutes', 0)
    require(used <= planned, 'Attended time exceeds plan'); near(cal['absentMinutesDerived'], planned - used, 'Derived absent time', counts['jobs'])
    near(cal['sourceHours'], paid_minutes / minutes_per_hour, 'Age numerator hours', len(by_age))
    near(cal['receiptHours'], used / minutes_per_hour, 'Receipt hours', counts['jobs'])
    near(cal['workMinuteAggregationDifference'], paid_minutes - used, 'Reported minute aggregation difference', counts['jobs'], max(paid_minutes, used))
    near(paid_minutes, used, 'Age vs job attended-minute sum', counts['jobs'] + len(by_age))
    requested = integer(money['requestedMinor'], 'requested minor'); paid = integer(money['paidMinor'], 'paid minor')
    require(paid <= requested and money['shortfallMinor'] == requested - paid, 'Requested/paid/shortfall mismatch')
    require(integer(money['openingCashMinor'], 'opening cash') == facts['openingCashMinor'], 'Opening cash differs from actual input')
    current = integer(money['currentCashMinor'], 'ending cash')
    require(money['closedMoneyDeltaMinor'] == current - facts['openingCashMinor'] == 0 and money['closedMoneyConserved'] is True, 'Closed liquid cash is not conserved')
    require(money['latestCashReceiptFailures'] == 0, 'Producer reports a latest cash receipt violation')
    if not enabled:
        require(attended == absent == planned == used == requested == paid == 0, 'Disabled work has scheduled work effects')
        require(all(row['paidWorkHoursPerResidentDiaryDay'] is None for row in by_age), 'Disabled mean was reported as zero observation')


def validate_rows(world, capture):
    reasons = world['reasonContributionsRunWindow']; rows = reasons['personMonthActionRows']
    fields = set(CSV_FIELDS); unique = set(); person = Counter(); month_action = Counter(); action = Counter()
    person_action = defaultdict(Counter); grouped = defaultdict(list)
    sums = {name: defaultdict(float) for name in ['needContribution', 'goalContribution', 'driveContribution']}
    absolute_sums = Counter()
    rollups = {name: defaultdict(lambda: {field: 0 for field in ['acts', 'needContribution', 'goalContribution', 'driveContribution']})
               for name in ['byMonth', 'byActionId', 'byPerson']}
    absolute_rollups = {name: defaultdict(Counter) for name in rollups}
    for row in rows:
        require(set(row) == fields, 'Incomplete/different detailed CSV schema')
        key = (row['month'], row['actorId'], row['actionId'])
        require(key not in unique, 'Duplicate person/month/action row'); unique.add(key)
        n = integer(row['acts'], 'row acts', 1)
        person[row['actorId']] += n; person_action[row['actorId']][row['actionId']] += n
        month_action[(row['month'], row['actionId'])] += n; action[row['actionId']] += n; grouped[row['month']].append(row)
        for field in sums:
            sums[field]['total'] += finite(row[field], field)
            absolute_sums[field] += abs(row[field])
        for label, identity in [('byMonth', row['month']), ('byActionId', row['actionId']), ('byPerson', row['actorId'])]:
            for field in rollups[label][identity]:
                rollups[label][identity][field] += row[field]
                if field != 'acts':
                    absolute_rollups[label][identity][field] += abs(row[field])
    all_people = world['allTimeActCountsByPerson']
    require(len(all_people) == world['counts']['people'] and set(person).issubset(all_people), 'Detailed actor roster differs')
    for actor, counts in all_people.items():
        require(person[actor] == counts['acts'] and dict(person_action[actor]) == counts['byActionId'], 'Actor action totals differ: ' + actor)
    require(dict(action) == world['allTimeActsByActionId'], 'Detailed action totals differ')
    flat_month = {(month, act): n for month, actions in world['allTimeActsByMonthActionId'].items() for act, n in actions.items()}
    require(dict(month_action) == flat_month, 'Detailed month/action totals differ')
    require(sum(person.values()) == world['allTimeActCount'] == reasons['totals']['acts'], 'Detailed global total differs')
    for field, values in sums.items():
        near(values['total'], reasons['totals'][field], 'Detailed global ' + field, len(rows), absolute_sums[field])
    for label, actual in rollups.items():
        expected = reasons[label]
        require(set(actual).issubset(expected) and (label == 'byMonth' or set(actual) == set(expected)), 'Detailed contribution group keys differ: ' + label)
        for identity, values in expected.items():
            require(rollups[label][identity]['acts'] == values['acts'], 'Detailed contribution acts differ: ' + label + '/' + identity)
            for field in sums:
                near(rollups[label][identity][field], values[field], 'Detailed contribution ' + label + '/' + identity + '/' + field, len(rows), absolute_rollups[label][identity][field])
    digest = hashlib.sha256()
    require(len(set(reasons['monthsCovered'])) == len(reasons['monthsCovered']), 'Duplicate month capture')
    require(set(grouped).issubset(reasons['monthsCovered']), 'Row outside captured month')
    for month in reasons['monthsCovered']:
        digest.update(compact({'month': month, 'rows': grouped[month]}).encode()); digest.update(b'\0')
    require(digest.hexdigest() == reasons['canonicalHash'], 'Exact reason-row canonical hash differs')
    expected_act_hash = digest_object({'allTime': {
        'byActionId': world['allTimeActsByActionId'], 'byMonth': world['allTimeActsByMonth'],
        'byMonthActionId': world['allTimeActsByMonthActionId'], 'byPerson': world['allTimeActCountsByPerson']},
        'retainedReasons': world['reasonContributionsRetained'], 'runWindowReasonHash': reasons['canonicalHash']})
    require(expected_act_hash == world['actStatsHash'], 'Exact final canonical act hash differs')
    return rows, person


def validate_log(path, receipt_path, capture):
    events = []
    for line in path.read_text(encoding='utf-8').splitlines():
        match = re.fullmatch(r'\[[0-9T:.Z-]+\] ([a-z-]+) (\{.*\})', line)
        if match:
            events.append((match[1], json.loads(match[2], parse_float=RawFloat, parse_constant=reject_constant)))
    for kind, expected in [('warmup-complete', capture['warmups']), ('measured-run-complete', capture['runs'])]:
        actual = [row for phase, row in events if phase == kind]
        require(len(actual) == len(expected), 'Incomplete log phase ' + kind)
        for index, (row, run) in enumerate(zip(actual, expected), 1):
            require(row['run'] == index, 'Nonserial/duplicate log run')
            near(row['elapsedMilliseconds'], run['elapsedMilliseconds'], 'Logged elapsed')
            near(row['daysPerMinute'], run['daysPerMinute'], 'Logged rate')
    chunks = month_chunks(date.fromisoformat(capture['startedAt']), date.fromisoformat(capture['throughDate']))
    expected_phases = []
    for start_phase, end_phase, runs in [('warmup-start', 'warmup-complete', capture['warmups']), ('measured-run-start', 'measured-run-complete', capture['runs'])]:
        for index, run in enumerate(runs, 1):
            expected_phases += [start_phase] + ['month-advanced'] * len(chunks) + [end_phase]
    actual_phases = [phase for phase, row in events if phase in {'warmup-start', 'warmup-complete', 'measured-run-start', 'measured-run-complete', 'month-advanced'}]
    require(actual_phases == expected_phases, 'Incomplete/nonserial start/month/end phase sequence')
    dated_chunks = [row for phase, row in events if phase == 'month-advanced']
    for row, expected in zip(dated_chunks, chunks * (EXPECTED_WARMUPS + EXPECTED_RUNS)):
        require(row['throughDate'] == expected['throughDate'] and row['simulatedDays'] == expected['simulatedDays'], 'Logged monthly date/day chain differs')
    completed = [row for phase, row in events if phase == 'receipt-written']
    require(len(completed) == 1 and Path(completed[0]['path']).resolve() == receipt_path.resolve(), 'Complete log receipt-written marker missing/different')
    require(completed[0].get('memoryAfterSerialization'), 'Post-serialization memory record missing')
    require(events[-1][0] == 'receipt-written', 'Log has no terminal completion event')
    require(sum(phase == 'month-advanced' for phase, _ in events) == sum(len(run['world']['reasonContributionsRunWindow']['monthsCovered']) for run in capture['warmups'] + capture['runs']), 'Complete monthly log chunks differ from capture')
    return completed[0]['memoryAfterSerialization']


def validate_capture(path, log, prepared_override, enabled, player_id, repo, data):
    original_capture = descriptor(path)
    capture = read_json(path)
    require(capture['schema'] == 'p8-measurement-v1' and capture['mode'] == 'year', 'Not a complete v5 year capture')
    require(capture['coreVersions'] == {'apiVersion': 'core2-api-v5', 'schemaVersion': 'core2-schema-v5'}, 'API/schema v5 required')
    params = capture['parameters']; trace = capture['trace']
    require(params['openingEmployment'] is enabled and params['scheduledWork'] is enabled, 'Comparison flag pair mismatch')
    require(params['requestedPlayerId'] == trace['playerId'] == player_id, 'Different/nonexplicit recorded player')
    require(params['warmupRuns'] == len(capture['warmups']) == EXPECTED_WARMUPS and params['warmRuns'] == len(capture['runs']) == EXPECTED_RUNS, 'Requires one warmup and exactly three measured runs')
    start = date.fromisoformat(capture['startedAt']); through = date.fromisoformat(capture['throughDate'])
    require((through - start).days == capture['expectedSimulatedDays'] == params['yearSpanDays'] == EXPECTED_DAYS, 'Incomplete requested 365-day interval')
    require(capture['sourceHash']['stableDuringRun'] is True and capture['sourceHash']['beforeBuild'] == capture['sourceHash']['afterRuns'], 'Source changed during capture')
    require(HEX256.fullmatch(capture['preparedInputSha256']), 'Prepared identity missing')
    exported = capture.get('preparedInputExport')
    if exported:
        require(exported['sha256'] == capture['preparedInputSha256'], 'Prepared export identity differs')
    location = prepared_override or (Path(exported['path']) if exported else None)
    require(location is not None, 'Prepared input location required; pass --disabled-input/--enabled-input')
    facts = prepared_facts(location.resolve(), capture['preparedInputSha256'])
    require(facts['seed'] == capture['seed'] and facts['startedAt'] == capture['startedAt'] and facts['playerId'] == player_id, 'Prepared initialization metadata differs')
    require(set(facts['focusPersonIds']) == set(trace['focusPersonIds']) and len(trace['focusPersonIds']) == trace['focusPersonCount'], 'Initial circle/input differs')
    require(trace['focusPlaceIds'] == facts['focusPlaceIds'] == [] and trace['tierScope'] == 'normal-circle-daily-town-weekly', 'Not the normal circle/weekly tier capture')
    require(player_id in facts['people'] and player_id in trace['focusPersonIds'], 'Player missing from roster/circle')
    player = facts['people'][player_id]; owned = facts['jobs'].get(player['jobId'])
    require(owned and owned['personId'] == player_id, 'Player has no actual owned opening job')
    coworkers = {row['personId'] for row in facts['jobs'].values() if row['organizationId'] == owned['organizationId']}
    require(coworkers.issubset(trace['focusPersonIds']), 'Actual coworkers were excluded/capped from circle')
    exposure = expected_exposure(facts, start, through, data['config'], data['parameters'])
    chunks = month_chunks(start, through)
    months = [row['month'] for row in chunks]
    hashes = set(); work_hashes = set()
    for run in capture['warmups'] + capture['runs']:
        require(run['simulatedDays'] == EXPECTED_DAYS, 'Incomplete individual run')
        for field in ['elapsedMilliseconds', 'initializeMilliseconds', 'advanceMilliseconds', 'daysPerMinute']:
            finite(run[field], field, 0)
        require(run['elapsedMilliseconds'] > 0, 'No elapsed duration')
        near(run['elapsedMilliseconds'], run['initializeMilliseconds'] + run['advanceMilliseconds'], 'Initialization plus advance elapsed')
        near(run['daysPerMinute'], EXPECTED_DAYS * data['parameters']['secondsPerMinute']['value'] * data['parameters']['millisecondsPerSecond']['value'] / run['elapsedMilliseconds'], 'Per-run days/min')
        integer(run['decisions'], 'run decisions'); integer(run['acts'], 'run acts')
        world = run['world']; counts = world['counts']
        for name, value in counts.items():
            if name != 'peopleByTier':
                integer(value, 'count ' + name)
        for value in counts['peopleByTier'].values():
            integer(value, 'tier count')
        require(counts['people'] == len(facts['people']) and counts['jobs'] == len(facts['jobs']) and counts['households'] == len(facts['households']) and counts['organizations'] == len(facts['organizations']) and counts['husks'] == facts['husks'], 'Actual input/world counts differ')
        require(sum(counts['peopleByTier'].values()) == counts['people'], 'Tier counts differ')
        require(0 <= counts['dailyCirclePeople'] <= counts['people'], 'Invalid final circle count')
        require(sum(world['recordVisibility'].values()) == counts['durableRecords'], 'Retained visibility count differs')
        for value in world['recordVisibility'].values():
            integer(value, 'retained visibility count')
        require(world['recordVisibility'].get('observer', 0) == 0, 'Observer trace in normal run')
        require(run['acts'] == world['allTimeActCount'] == sum(world['allTimeActsByActionId'].values()), 'Run/global/action totals differ')
        require(run['actStatsHash'] == world['actStatsHash'] and HEX256.fullmatch(run['actStatsHash']), 'Act hash missing/different')
        require(run['workStatsHash'] == digest_object(world['work']), 'Exact producer work hash differs')
        hashes.add(run['actStatsHash']); work_hashes.add(run['workStatsHash'])
        validate_work(world['work'], enabled, counts, world['allTimeActsByActionId'], facts, exposure, start, through, data['work'], data['config'], data['reference'], data['parameters'])
        reasons = world['reasonContributionsRunWindow']
        require(reasons['scope'] == 'simulated-month-buckets-captured-before-retention-pruning' and reasons['startDate'] == start.isoformat() and reasons['throughDate'] == through.isoformat(), 'Reason date/scope differs')
        require(reasons['monthsCovered'] == months and set(reasons['byMonth']) == set(months), 'Reason monthly date chain differs')
        require(reasons['totals']['acts'] == run['acts'] and sum(row['acts'] for row in reasons['byMonth'].values()) == run['acts'] and sum(row['acts'] for row in reasons['byActionId'].values()) == run['acts'], 'Reason aggregate act counts differ')
        require(set(world['allTimeActsByMonth']) == set(world['allTimeActsByMonthActionId']) == set(world['allTimeActKindTagsByMonth']) and set(world['allTimeActsByMonth']).issubset(months), 'All-time monthly counter scopes differ')
        require(sum(world['allTimeActsByMonth'].values()) == run['acts'], 'Monthly all-time total differs')
        action_totals = Counter()
        for month, by_action in world['allTimeActsByMonthActionId'].items():
            require(sum(by_action.values()) == world['allTimeActsByMonth'][month], 'Month act totals differ')
            tags = Counter()
            for act, number in by_action.items():
                require(act in capture['actionKindBindings'], 'Unregistered action kind binding')
                integer(number, 'monthly action count')
                action_totals[act] += number
                for kind in capture['actionKindBindings'][act]:
                    tags[kind] += number
            require(dict(tags) == world['allTimeActKindTagsByMonth'][month], 'Overlapping act-kind tags differ')
        require(dict(action_totals) == world['allTimeActsByActionId'], 'Monthly/action all-time counter totals differ')
    require(len(hashes) == len(work_hashes) == 1, 'Within-mode canonical results differ across warm runs')
    require(capture['finalWorld'] == capture['runs'][-1]['world'], 'finalWorld is not the actual final measured world')
    for key, field in [('medianElapsedMilliseconds', 'elapsedMilliseconds'), ('medianDaysPerMinute', 'daysPerMinute'), ('medianDecisions', 'decisions'), ('medianActs', 'acts')]:
        near(capture['median'][key], statistics.median(run[field] for run in capture['runs']), key)
    rows, person = validate_rows(capture['finalWorld'], capture)
    serialized_memory = validate_log(log, path, capture)
    require(descriptor(path) == original_capture, 'Complete capture changed during validation')
    return {'capture': capture, 'captureFile': original_capture, 'facts': facts, 'rows': rows, 'person': person, 'postSerializationMemory': serialized_memory, 'coworkerCount': len(coworkers)}


def validate_gates(path):
    declaration = read_json(path)
    require(declaration['readinessClaim'] is False, 'Gate declaration claims readiness')
    test_groups = []
    for row in declaration['records']:
        original = Path(row['path'])
        require(original.stat().st_size == row['bytes'] and sha(original) == row['sha256'], 'Historical log differs: ' + row['id'])
        text = re.sub(r'\x1b\[[0-9;]*m', '', original.read_text(encoding='utf-8'))
        expected = row['expected']
        if row['status'] == 'historical-passed':
            require(row['exitCodeDeclaredByRoot'] == 0 and row['exitStatusEvidence'], 'No attributed root exit-zero declaration')
            if row['kind'] == 'tests':
                require(re.search(r'Tests\s+' + str(expected['passedTests']) + r'\s+passed\s+\(' + str(expected['totalTests']) + r'\)', text), 'Historical passed test summary differs')
                require(re.search(r'Test Files\s+' + str(expected['passedFiles']) + r'\s+passed', text), 'Historical passed file summary differs')
                require(all(name in text for name in expected['testFiles']), 'Declared test scope absent from command log')
                test_groups.append(set(expected['testFiles']))
            elif row['kind'] == 'source-audit':
                require(f"Open stopgap count: {expected['openStopgaps']}" in text and f"Calibration references: {expected['targetReferences']}; blockers: {expected['calibrationBlockers']}; empirical pass: no." in text, 'Source audit declaration differs')
            elif row['kind'] == 'style':
                require('All matched files use Prettier code style!' in text and 'eslint' in text, 'Style completion evidence missing')
            elif row['kind'] == 'release':
                require(f"{expected['allowedDiceLines']} allowed lines left" in text and 'release:check' in text and ' OK.' in text, 'Release/no-dice log differs')
        else:
            require(row['status'] == 'historical-failed-superseded' and expected.get('failedTests'), 'Unclassified gate evidence')
    overlap = set()
    for index, group in enumerate(test_groups):
        for other in test_groups[index + 1:]:
            overlap.update(group & other)
    require(set(declaration['overlap']['sharedTestFiles']) == overlap and declaration['overlap']['combinedPassedTestCount'] is None, 'Overlapping gates were summed or misdeclared')
    files = declaration['styleFileManifest']; original = Path(files['path'])
    require(original.stat().st_size == files['bytes'] and sha(original) == files['sha256'], 'Style file manifest changed')
    require(read_json(original) == files['paths'], 'Style file list differs')
    return declaration


def archive(path, destination, repo):
    raw = descriptor(path)
    with path.open('rb') as original, destination.open('xb') as saved:
        with gzip.GzipFile(filename='', fileobj=saved, mode='wb', mtime=0) as zipped:
            for chunk in iter(lambda: original.read(CHUNK_BYTES), b''):
                zipped.write(chunk)
    restored = hashlib.sha256(); size = 0
    with gzip.open(destination, 'rb') as zipped:
        for chunk in iter(lambda: zipped.read(CHUNK_BYTES), b''):
            restored.update(chunk); size += len(chunk)
    require(restored.hexdigest() == raw['sha256'] and size == raw['bytes'] and descriptor(path) == raw, 'Archive roundtrip/original stability differs')
    result = descriptor(destination); result['path'] = str(destination.relative_to(repo))
    result.update({'originalLocation': raw['path'], 'uncompressedBytes': raw['bytes'], 'uncompressedSha256': raw['sha256'], 'roundTripVerified': True})
    return result


def archive_csv(rows, destination, repo):
    digest = hashlib.sha256(); size = 0
    with destination.open('xb') as saved:
        with gzip.GzipFile(filename='', fileobj=saved, mode='wb', mtime=0) as zipped:
            def emit(values):
                nonlocal size
                stream = io.StringIO(newline=''); csv.writer(stream).writerow(values)
                chunk = stream.getvalue().encode(); zipped.write(chunk); digest.update(chunk); size += len(chunk)
            emit(CSV_FIELDS)
            for row in rows:
                emit([row[field].token if isinstance(row[field], RawFloat) else row[field] for field in CSV_FIELDS])
    restored = hashlib.sha256(); restored_size = 0
    with gzip.open(destination, 'rb') as zipped:
        for chunk in iter(lambda: zipped.read(CHUNK_BYTES), b''):
            restored.update(chunk); restored_size += len(chunk)
    require(restored.hexdigest() == digest.hexdigest() and restored_size == size, 'Complete CSV roundtrip differs')
    result = descriptor(destination); result['path'] = str(destination.relative_to(repo))
    result.update({'rows': len(rows), 'columns': CSV_FIELDS, 'uncompressedBytes': size, 'uncompressedSha256': digest.hexdigest(), 'roundTripVerified': True, 'scope': 'Every final measured person/month/action row; no sample or circle filter.'})
    return result


def write_json_exclusive(path, value):
    with path.open('x', encoding='utf-8') as stream:
        json.dump(value, stream, indent=2, ensure_ascii=False, allow_nan=False); stream.write('\n')


def mode_summary(result, full, actions, saved_log):
    capture = result['capture']; world = capture['finalWorld']; circle = set(capture['trace']['focusPersonIds'])
    people = result['person']; all_people = world['allTimeActCountsByPerson']
    return {'parameters': capture['parameters'], 'preparedInput': result['facts']['file'], 'preparedInputSha256': capture['preparedInputSha256'],
        'fullReceipt': full, 'personMonthActionCsv': actions, 'completeLog': saved_log,
        'median': capture['median'], 'runs': [{key: value for key, value in run.items() if key != 'world'} for run in capture['runs']],
        'warmupTiming': [{key: value for key, value in run.items() if key != 'world'} for run in capture['warmups']],
        'counts': world['counts'], 'initialCirclePeople': len(circle), 'actualOpeningCoworkersIncludingPlayer': result['coworkerCount'],
        'circleActCountRange': {'minimum': min(people[id] for id in circle), 'maximum': max(people[id] for id in circle)},
        'allResidentActCountRange': {'minimum': min(row['acts'] for row in all_people.values()), 'maximum': max(row['acts'] for row in all_people.values())},
        'retainedVisibility': world['recordVisibility'], 'allTimeActs': world['allTimeActCount'], 'actsByAction': world['allTimeActsByActionId'],
        'work': world['work'], 'gaps': world['gaps'], 'stopgapsHit': world['stopgaps'], 'memoryAfterSerialization': result['postSerializationMemory'],
        'timerScope': capture['timerScope'], 'memoryScope': capture['memoryScope'], 'actKindCountScope': capture['actKindCountScope']}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--repo', type=Path, required=True)
    for mode in ['disabled', 'enabled']:
        parser.add_argument('--' + mode + '-receipt', type=Path, required=True)
        parser.add_argument('--' + mode + '-log', type=Path, required=True)
        parser.add_argument('--' + mode + '-input', type=Path)
        parser.add_argument('--' + mode + '-exit-code', type=int, required=True)
    parser.add_argument('--player-id', required=True)
    parser.add_argument('--expected-given-name')
    parser.add_argument('--gates-declaration', type=Path, required=True)
    parser.add_argument('--output-dir', type=Path, required=True)
    parser.add_argument('--prefix', required=True)
    args = parser.parse_args(); repo = args.repo.resolve(); out = args.output_dir.resolve()
    require(out == (repo / 'src/core2/receipts').resolve(), 'Outputs are restricted to this repository src/core2/receipts')
    require(re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9._-]*', args.prefix), 'Unsafe archive prefix')
    require(args.disabled_exit_code == args.enabled_exit_code == 0, 'Both root-observed benchmark exit codes must be zero')
    # Sources/metadata are read only. Complete captures are parsed by root later,
    # after the exclusive benchmark has finished; the author never ran this file.
    data = {name: read_json(repo / path) for name, path in {
        'parameters': 'src/core2/data/parameters.json', 'work': 'src/core2/data/work.json',
        'config': 'src/core2/tooling/work-observables.json', 'reference': 'src/core2/data/time-use-reference.json'}.items()}
    disabled = validate_capture(args.disabled_receipt, args.disabled_log, args.disabled_input, False, args.player_id, repo, data)
    enabled = validate_capture(args.enabled_receipt, args.enabled_log, args.enabled_input, True, args.player_id, repo, data)
    before = disabled['capture']; after = enabled['capture']
    require(before['sourceHash'] == after['sourceHash'], 'Pair source/direct-dependency manifests differ')
    require(before['seed'] == after['seed'] and before['startedAt'] == after['startedAt'] and before['throughDate'] == after['throughDate'], 'Pair seed/date window differs')
    require({key: value for key, value in before['parameters'].items() if key not in {'openingEmployment', 'scheduledWork'}} == {key: value for key, value in after['parameters'].items() if key not in {'openingEmployment', 'scheduledWork'}}, 'Pair parameters differ beyond the two work switches')
    require(before['measurementConfig'] == after['measurementConfig'], 'Pair measurement configuration differs')
    require(before['place']['placeKey'] == after['place']['placeKey'] and before['trace']['countyId'] == after['trace']['countyId'], 'Pair locality/county differs')
    require(before['timerScope'] == after['timerScope'] and before['memoryScope'] == after['memoryScope'], 'Pair measurement scope differs')
    verify_source(repo, before['sourceHash']['beforeBuild'])
    declaration = validate_gates(args.gates_declaration)
    identity_fields = ['id', 'givenName', 'familyName', 'birthDate', 'placeId', 'countyId', 'householdId']
    player_before = disabled['facts']['people'][args.player_id]; player_after = enabled['facts']['people'][args.player_id]
    require({key: player_before[key] for key in identity_fields} == {key: player_after[key] for key in identity_fields}, 'Selected player identity changed')
    if args.expected_given_name:
        require(player_before['givenName'] == args.expected_given_name, 'Unexpected actual player given name')
    # Whole-state, input-money, job-count and circle parity are deliberately not required.
    source_manifest = before['sourceHash']['beforeBuild']
    source_anchors = []
    for path, needle in [('src/core2/tooling/measure.ts', 'async function runCore('), ('src/core2/tooling/work-observables.ts', 'export function rosterDiaryExposure('), ('src/core2/modules/work.ts', 'export function runScheduledWork('), ('src/core2/focus.ts', 'export function initialFocusPeople(')]:
        lines = (repo / path).read_text().splitlines(); found = [i for i, line in enumerate(lines, 1) if needle in line]
        require(len(found) == 1, 'Source proof anchor absent/ambiguous')
        source_anchors.append({'path': path, 'line': found[0], 'symbol': needle})
    out.mkdir(parents=True, exist_ok=True)
    prefix = args.prefix
    planned = [out / f'{prefix}-{mode}-{suffix}' for mode in ['disabled', 'enabled'] for suffix in ['full.json.gz', 'person-month-actions.csv.gz', 'complete.log.gz']]
    planned += [out / f'{prefix}-{suffix}' for suffix in ['source-manifest.json', 'gate-declarations.json', 'proof.md', 'comparison.json', 'archiver.py']]
    planned += [out / f'{prefix}-gate-{row["id"]}.log.gz' for row in declaration['records']]
    require(all(not path.exists() for path in planned), 'Archive prefix collides with an existing/historical file')
    summaries = {}
    for label, result, raw_path, log_path in [('disabled', disabled, args.disabled_receipt, args.disabled_log), ('enabled', enabled, args.enabled_receipt, args.enabled_log)]:
        require(descriptor(raw_path) == result['captureFile'], 'Complete capture changed before archival')
        full = archive(raw_path, out / f'{prefix}-{label}-full.json.gz', repo)
        actions = archive_csv(result['rows'], out / f'{prefix}-{label}-person-month-actions.csv.gz', repo)
        log_archive = archive(log_path, out / f'{prefix}-{label}-complete.log.gz', repo)
        summaries[label] = mode_summary(result, full, actions, log_archive)
    gates = dict(declaration); gates['archivedOriginalLogs'] = {}
    for row in declaration['records']:
        gates['archivedOriginalLogs'][row['id']] = archive(Path(row['path']), out / f'{prefix}-gate-{row["id"]}.log.gz', repo)
    gate_path = out / f'{prefix}-gate-declarations.json'; write_json_exclusive(gate_path, gates)
    source_path = out / f'{prefix}-source-manifest.json'
    write_json_exclusive(source_path, {'schema': 'p8-paired-v5-source-manifest-v1', 'manifest': source_manifest, 'capturedBeforeAndAfterBothModes': True, 'independentlyVerifiedCurrentBytes': True, 'sourceProofAnchors': source_anchors, 'preparedInputs': {label: summaries[label]['preparedInput'] for label in summaries}, 'unhashedGenerationScope': source_manifest.get('dependencyNote')})
    script_path = Path(__file__).resolve(); archived_script = out / f'{prefix}-archiver.py'
    with script_path.open('rb') as original, archived_script.open('xb') as saved:
        for chunk in iter(lambda: original.read(CHUNK_BYTES), b''):
            saved.write(chunk)
    require(sha(script_path) == sha(archived_script), 'Archiver source copy differs')
    comparison = {'schema': 'p8-paired-v5-work-year-comparison-v1', 'prototypeReadiness': 'NOT READY; archival validation is not release approval or empirical calibration',
        'seed': before['seed'], 'startedAt': before['startedAt'], 'throughDate': before['throughDate'], 'coreVersions': before['coreVersions'],
        'player': {key: player_before[key] for key in identity_fields}, 'sharedSourceDigest': source_manifest['sha256'],
        'sourceManifest': descriptor(source_path), 'gateDeclarations': descriptor(gate_path), 'archiver': descriptor(archived_script),
        'rootObservedBenchmarkExitCodes': {'disabled': args.disabled_exit_code, 'enabled': args.enabled_exit_code},
        'modes': summaries, 'comparison': {'elapsedMedianRatioEnabledOverDisabled': after['median']['medianElapsedMilliseconds'] / before['median']['medianElapsedMilliseconds'],
            'medianDaysPerMinuteDifference': after['median']['medianDaysPerMinute'] - before['median']['medianDaysPerMinute'],
            'preparedInputsSame': before['preparedInputSha256'] == after['preparedInputSha256'], 'initialCircleIdsSame': set(before['trace']['focusPersonIds']) == set(after['trace']['focusPersonIds']),
            'scope': 'Same frozen v5 sources/seed/recorded player and timer; combined opening allocation plus scheduled work with changed initial money/jobs/actual coworker circle. No whole-state parity or single-feature attribution is asserted.'},
        'proofLimits': ['Actual counts, chosen acts and rates do not establish realistic employment, activity time, firms, funding or histories.',
            'ATUS comparison uses every initialized resident diary-day by actual dated age. Paid primary work is a subset of work/work-related activity; survey population/weights, commuting/search and a complete diary are absent.',
            'Fixed-roster exposure applies to the current producer set; future life/residency transitions require dated streams.',
            'Latest-cash-receipt failures are the source-pinned producer aggregate; the full capture does not serialize each latest WorkResult for an independent receipt-by-receipt replay.',
            'Retained visibility is a complete aggregate count. Actual durable rows are not serialized; quiet-record retention also relies on source-linked tests.',
            'Source/direct pins are checked. Remaining transitive generation files are not captured by this manifest; owner source freeze and prepared identities delimit that gap.',
            'All uncalibrated mappings/stopgaps remain open. No ordinary civic drive, future hiring/law/election/consumption model or P9 career pass is inferred.',
            'Timing excludes input generation, world-summary validation and final serialization. Process peak includes input building/warmup/prior runs; steady-state memory is not inferred.']}
    proof_path = out / f'{prefix}-proof.md'
    proof = f'''# Measured paired v5 opening and work year\n\nBoth modes use the same frozen sources, seed, recorded player and 365-day window, with one warmup and three measured runs. Work disabled: {before['median']['medianDaysPerMinute']:.3f} days/minute; work enabled: {after['median']['medianDaysPerMinute']:.3f} days/minute. Opening jobs: {summaries['disabled']['counts']['jobs']} to {summaries['enabled']['counts']['jobs']}; initial circles: {summaries['disabled']['initialCirclePeople']} to {summaries['enabled']['initialCirclePeople']}. The comparison includes changed opening money, jobs and actual coworker scope. These counts do not establish realism.\n\nFull captures, complete original logs and every final person/month/action CSV row are gzip archived with raw byte/hash and roundtrip checks. Both modes reconcile counts, actual dated age exposure, committed work actions, closed cash and source-reported latest cash receipts. The source manifest records every checked pin; remaining transitive generation coverage is explicit.\n\nPaid primary work is only part of ATUS work/work-related activity. Population weighting, commuting/search, complete diaries and coefficient calibration remain unresolved. Historical gates retain their individual scopes and the superseded failure; overlapping test groups are not summed. This prototype remains **NOT READY**.\n\nMethod: root-observed completed captures only; the archiver runs no simulation or gate. See `{prefix}-comparison.json` and `{prefix}-source-manifest.json` for exact values, artifacts, source anchors, hashes, input locations and limitations.\n'''
    with proof_path.open('x', encoding='utf-8') as stream:
        stream.write(proof)
    comparison['proof'] = descriptor(proof_path)
    # Completion marker is last. A failure leaves original evidence untouched and
    # never writes a success summary over a partial or historical archive.
    result_path = out / f'{prefix}-comparison.json'; write_json_exclusive(result_path, comparison)
    print(json.dumps({'comparison': str(result_path), 'sha256': sha(result_path), 'sourceDigest': source_manifest['sha256'], 'median': {label: value['median'] for label, value in summaries.items()}, 'readinessClaim': False}, indent=2))


if __name__ == '__main__':
    try:
        main()
    except (Incompatible, KeyError, OSError, ValueError, TypeError) as error:
        print('Archive rejected: ' + str(error), file=sys.stderr)
        sys.exit(2)
