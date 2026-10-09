#!/usr/bin/env python3
"""Archive a completed unchanged-input v5 year and its captured-result parity.

Source-only candidate. This author never executes a world, gate or this file.
Original captures, inputs, logs, sources and prior archives remain read-only.
All new outputs use exclusive creation under the repository receipts directory.
"""
from __future__ import annotations

import argparse
from collections import defaultdict
from datetime import date
import hashlib
import importlib.util
import json
from pathlib import Path
import re
import sys
from types import SimpleNamespace

# These pins describe the supplied measurement, not simulation coefficients.
BASE_VALIDATOR_SHA256 = '8dc3b8e6f565377482117baf531a34e3dd6587b9e0e53be422f30dc0c6fda673'
BEFORE_COMPARISON_SHA256 = '2e44c181526c7f7671ae0271608db0d0cb4bc72ca60ccd85e06234fff98b5322'
PREPARED_INPUT_SHA256 = 'cfc12509315da95074085260412d3ee6c1c61786fe6b2fd9f65bebbbe3a73f3c'
ALLOWED_CHANGED_PATHS = frozenset({'src/core2/state.ts', 'src/core2/modules/life.ts'})


def reject(message):
    raise ValueError(message)


def ensure(condition, message):
    if not condition:
        reject(message)


def file_hash(path):
    digest = hashlib.sha256()
    with path.open('rb') as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b''):
            digest.update(chunk)
    return digest.hexdigest()


def load_validator(repo):
    path = repo / 'src/core2/receipts/prototype-v5-paired-work-year-20261009-archiver.py'
    ensure(path.is_file() and file_hash(path) == BASE_VALIDATOR_SHA256,
           'Original archived validator is absent or has changed')
    # Loading occurs only when the root later runs this script, after the pinned
    # bytes have been checked. Avoid any hidden __pycache__ output.
    sys.dont_write_bytecode = True
    spec = importlib.util.spec_from_file_location('p8_pinned_archive_validator', path)
    ensure(spec is not None and spec.loader is not None, 'Cannot load pinned validator')
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return SimpleNamespace(**vars(module)), path


def captured_results(capture):
    """Retain every result; remove only the enumerated measurement metadata."""
    payload = dict(capture)
    payload.pop('sourceHash')
    payload.pop('preparedInputExport', None)  # SHA stays; export location is not a result.
    payload['median'] = {key: value for key, value in capture['median'].items()
                         if key not in {'medianElapsedMilliseconds', 'medianDaysPerMinute'}}
    for label in ['warmups', 'runs']:
        payload[label] = [{key: value for key, value in run.items()
                           if key not in {'elapsedMilliseconds', 'initializeMilliseconds',
                                          'advanceMilliseconds', 'daysPerMinute', 'memory'}}
                          for run in capture[label]]
    payload['build'] = {stage: {key: value for key, value in record.items()
                               if key not in {'elapsedMilliseconds', 'memory'}}
                        for stage, record in capture['build'].items()}
    return payload


def result_digest(value, validator):
    """Exact producer-style compact JSON, streamed without a second huge string."""
    digest = hashlib.sha256()
    def visit(row):
        if isinstance(row, dict):
            digest.update(b'{')
            for index, (key, child) in enumerate(row.items()):
                if index:
                    digest.update(b',')
                digest.update(validator.compact(key).encode('utf-8'))
                digest.update(b':'); visit(child)
            digest.update(b'}')
        elif isinstance(row, list):
            digest.update(b'[')
            for index, child in enumerate(row):
                if index:
                    digest.update(b',')
                visit(child)
            digest.update(b']')
        else:
            digest.update(validator.compact(row).encode('utf-8'))
    visit(value)
    return digest.hexdigest()


def first_difference(left, right, path='$'):
    if isinstance(left, dict) and isinstance(right, dict):
        if set(left) != set(right):
            return path + ' (field set)'
        for key in left:
            found = first_difference(left[key], right[key], path + '.' + key)
            if found:
                return found
        return None
    if isinstance(left, list) and isinstance(right, list):
        if len(left) != len(right):
            return path + ' (length)'
        for index, (a, b) in enumerate(zip(left, right)):
            found = first_difference(a, b, path + '[' + str(index) + ']')
            if found:
                return found
        return None
    return None if left == right and type(left) is type(right) else path


def validate_affect_and_run_results(result, validator):
    capture = result['capture']
    initial_circle = set(capture['trace']['focusPersonIds'])
    expected_dates = [capture['startedAt']] + [row['throughDate'] for row in validator.month_chunks(
        date.fromisoformat(capture['startedAt']), date.fromisoformat(capture['throughDate']))]
    normalized_worlds = []
    for run in capture['warmups'] + capture['runs']:
        world = run['world']; reasons = world['reasonContributionsRunWindow']
        by_date = defaultdict(set)
        for sample in reasons['affectSamples']:
            ensure(sample['date'] in expected_dates and sample['personId'] in result['facts']['people'],
                   'Affect sample has an uninitialized recipient or wrong date')
            ensure(sample['personId'] not in by_date[sample['date']], 'Duplicate dated affect sample')
            by_date[sample['date']].add(sample['personId'])
            for field in ['mood', 'stress', 'moodBaseline', 'stressBaseline']:
                validator.finite(sample[field], 'captured affect ' + field)
            validator.integer(sample['driveCount'], 'captured drive count')
        ensure(list(by_date) == expected_dates and all(initial_circle.issubset(ids) for ids in by_date.values()),
               'Captured affect omitted an initial focus person or a date boundary')
        # Earlier runs intentionally omit only the documented detailed extensions.
        normalized = dict(world); normalized.pop('allTimeActCountsByPerson', None)
        normalized['reasonContributionsRunWindow'] = {key: value for key, value in reasons.items()
                                                       if key not in {'byPerson', 'personMonthActionRows'}}
        normalized_worlds.append(normalized)
    for world in normalized_worlds[1:]:
        ensure(first_difference(normalized_worlds[0], world) is None,
               'Within-mode captured results or focus/affect samples differ')


def validate_source_pair(repo, before, after, contract, previous_manifest, validator):
    a = before['sourceHash']['beforeBuild']; b = after['sourceHash']['beforeBuild']
    ensure(a == previous_manifest['manifest'], 'Before source manifest differs from the prior archive')
    ensure(a['scope'] == b['scope'] and a['dependencyNote'] == b['dependencyNote'], 'Source scope changed')
    ensure(a['directRuntimeDependencies'] == b['directRuntimeDependencies'], 'Direct runtime pins changed')
    old = {row['path']: row for row in a['files']}; new = {row['path']: row for row in b['files']}
    ensure(set(old) == set(new) and a['fileCount'] == b['fileCount'] == len(old), 'Executable source file set changed')
    changed = {path for path in old if old[path] != new[path]}
    ensure(changed == ALLOWED_CHANGED_PATHS, 'Changes exceed or omit the two declared knowledge-index paths')
    declarations = {row['path']: row for row in contract['declaredChanges']}
    ensure(set(declarations) == ALLOWED_CHANGED_PATHS, 'Source declaration has unexpected paths')
    source_rows = []
    substitutions = {}
    for name in sorted(changed):
        row = declarations[name]
        ensure(old[name]['sha256'] == row['beforeSha256'] and old[name]['bytes'] == row['beforeBytes'], 'Before preimage pin differs')
        ensure(new[name]['sha256'] == row['afterSha256'] and new[name]['bytes'] == row['afterBytes'], 'After path pin differs from the declared formatted source')
        shadow = Path(row['beforeSnapshot']).resolve()
        ensure(shadow.is_file() and shadow.stat().st_size == row['beforeBytes'] and validator.sha(shadow) == row['beforeSha256'], 'Preserved before source snapshot differs')
        substitutions[name] = shadow
        source_rows.append({'path': name, 'before': old[name], 'after': new[name], 'beforeSnapshot': str(shadow)})
    validator.verify_source(repo, b)
    # Recompute the original aggregate from unchanged live files and exact old
    # snapshots. No old core, runtime, generator or simulation is invoked.
    digest = hashlib.sha256()
    for row in a['files']:
        name = row['path']; path = substitutions.get(name) or validator.rooted(repo, name)
        ensure(path.stat().st_size == row['bytes'] and validator.sha(path) == row['sha256'], 'Before aggregate byte source differs')
        digest.update(name.encode('utf-8')); digest.update(b'\0')
        with path.open('rb') as stream:
            for chunk in iter(lambda: stream.read(validator.CHUNK_BYTES), b''):
                digest.update(chunk)
        digest.update(b'\0')
    ensure(digest.hexdigest() == a['sha256'], 'Reconstructed before source aggregate differs')
    return {'beforeManifest': a, 'afterManifest': b, 'changes': source_rows,
            'currentAfterBytesAndFileSetVerified': True, 'beforeAggregateRecomputedFromExactPreimages': True,
            'unhashedGenerationScope': a['dependencyNote']}


def copy_source(path, destination, validator):
    with path.open('rb') as source, destination.open('xb') as saved:
        for chunk in iter(lambda: source.read(validator.CHUNK_BYTES), b''):
            saved.write(chunk)
    ensure(validator.sha(path) == validator.sha(destination), 'Archive source copy changed')
    return validator.descriptor(destination)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--repo', type=Path, required=True)
    parser.add_argument('--contract', type=Path, required=True)
    parser.add_argument('--before-receipt', type=Path)
    parser.add_argument('--before-log', type=Path)
    parser.add_argument('--before-input', type=Path)
    parser.add_argument('--before-exit-code', type=int, required=True)
    parser.add_argument('--after-receipt', type=Path, required=True)
    parser.add_argument('--after-log', type=Path, required=True)
    parser.add_argument('--after-input', type=Path)
    parser.add_argument('--after-exit-code', type=int, required=True)
    parser.add_argument('--output-dir', type=Path, required=True)
    parser.add_argument('--prefix', required=True)
    args = parser.parse_args(); repo = args.repo.resolve(); output = args.output_dir.resolve()
    ensure(output == (repo / 'src/core2/receipts').resolve(), 'Outputs must be in repository src/core2/receipts')
    ensure(re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9._-]*', args.prefix), 'Unsafe archive prefix')
    ensure(args.before_exit_code == args.after_exit_code == 0, 'Both actual root-observed benchmark exits must be zero')
    validator, validator_path = load_validator(repo)
    contract = validator.read_json(args.contract)
    ensure(contract['schema'] == 'p8-v5-knowledge-index-year-archive-contract-v1', 'Wrong archive contract')
    previous_path = validator.rooted(repo, contract['beforeComparison']['path'])
    ensure(validator.sha(previous_path) == BEFORE_COMPARISON_SHA256 == contract['beforeComparison']['sha256'], 'Prior compact comparison differs')
    previous = validator.read_json(previous_path); baseline = previous['modes']['enabled']
    ensure(previous['coreVersions'] == {'apiVersion': 'core2-api-v5', 'schemaVersion': 'core2-schema-v5'}, 'Prior archive is not API/schema5')
    ensure(baseline['preparedInputSha256'] == PREPARED_INPUT_SHA256 == contract['preparedInputSha256'], 'Not the preserved unchanged input')
    manifest_path = validator.rooted(repo, contract['beforeSourceManifest']['path'])
    ensure(validator.sha(manifest_path) == contract['beforeSourceManifest']['sha256'], 'Prior source manifest differs')
    previous_manifest = validator.read_json(manifest_path)
    before_receipt = (args.before_receipt or Path(baseline['fullReceipt']['originalLocation'])).resolve()
    before_log = (args.before_log or Path(baseline['completeLog']['originalLocation'])).resolve()
    before_input = (args.before_input or Path(baseline['preparedInput']['path'])).resolve()
    after_input = (args.after_input or before_input).resolve()
    original_before = validator.descriptor(before_receipt)
    ensure(original_before['sha256'] == baseline['fullReceipt']['uncompressedSha256'] and original_before['bytes'] == baseline['fullReceipt']['uncompressedBytes'], 'Original enabled before capture differs')
    ensure(validator.sha(before_log) == baseline['completeLog']['uncompressedSha256'] and before_log.stat().st_size == baseline['completeLog']['uncompressedBytes'], 'Original complete before log differs')
    data = {key: validator.read_json(repo / name) for key, name in {
        'parameters': 'src/core2/data/parameters.json', 'work': 'src/core2/data/work.json',
        'config': 'src/core2/tooling/work-observables.json', 'reference': 'src/core2/data/time-use-reference.json'}.items()}
    player = previous['player']['id']
    before = validator.validate_capture(before_receipt, before_log, before_input, True, player, repo, data)
    after = validator.validate_capture(args.after_receipt.resolve(), args.after_log.resolve(), after_input, True, player, repo, data)
    for result in [before, after]:
        ensure(result['capture']['preparedInputSha256'] == PREPARED_INPUT_SHA256, 'Capture prepared-input SHA differs')
        ensure(result['capture']['trace']['focusPersonCount'] == baseline['initialCirclePeople'], 'Opening focus count changed')
        ensure(result['capture']['finalWorld']['counts'] == baseline['counts'], 'Captured counts changed from the preserved before')
        validate_affect_and_run_results(result, validator)
    ensure(before['capture']['median'] == baseline['median'], 'Original enabled before median differs')
    source_pair = validate_source_pair(repo, before['capture'], after['capture'], contract, previous_manifest, validator)
    before_results = captured_results(before['capture']); after_results = captured_results(after['capture'])
    difference = first_difference(before_results, after_results)
    ensure(difference is None, 'Canonical captured-result parity differs at ' + str(difference))
    result_hash_before = result_digest(before_results, validator)
    result_hash_after = result_digest(after_results, validator)
    ensure(result_hash_before == result_hash_after, 'Captured-result hash or serialization order differs')
    for left, right in zip(before['capture']['warmups'] + before['capture']['runs'], after['capture']['warmups'] + after['capture']['runs']):
        ensure(left['actStatsHash'] == right['actStatsHash'] and left['workStatsHash'] == right['workStatsHash'], 'Corresponding act/work canonical hashes differ')
    # Admit every output before writing; the comparison JSON is the last marker.
    prefix = args.prefix
    filenames = [f'{prefix}-{label}-{suffix}' for label in ['before', 'after']
                 for suffix in ['full.json.gz', 'person-month-actions.csv.gz', 'complete.log.gz']]
    filenames += [f'{prefix}-{suffix}' for suffix in ['source-manifests.json', 'contract.json', 'archiver.py', 'validator.py', 'comparison.json']]
    filenames += [f'{prefix}-{label}-source-{Path(row["path"]).stem}.ts.gz'
                  for label in ['before', 'after'] for row in source_pair['changes']]
    ensure(len(filenames) == len(set(filenames)) and all(not (output / name).exists() for name in filenames), 'New archive prefix collides with preserved evidence')
    output.mkdir(parents=True, exist_ok=True)
    summaries = {}
    for label, result, raw, log in [('before', before, before_receipt, before_log), ('after', after, args.after_receipt.resolve(), args.after_log.resolve())]:
        ensure(validator.descriptor(raw) == result['captureFile'], 'Capture changed before archival')
        full = validator.archive(raw, output / f'{prefix}-{label}-full.json.gz', repo)
        actions = validator.archive_csv(result['rows'], output / f'{prefix}-{label}-person-month-actions.csv.gz', repo)
        logs = validator.archive(log, output / f'{prefix}-{label}-complete.log.gz', repo)
        summaries[label] = validator.mode_summary(result, full, actions, logs)
        summaries[label]['reasonContributionTotals'] = result['capture']['finalWorld']['reasonContributionsRunWindow']['totals']
    for row in source_pair['changes']:
        name = Path(row['path']).stem
        row['beforeSourceArchive'] = validator.archive(Path(row['beforeSnapshot']), output / f'{prefix}-before-source-{name}.ts.gz', repo)
        row['afterSourceArchive'] = validator.archive(validator.rooted(repo, row['path']), output / f'{prefix}-after-source-{name}.ts.gz', repo)
        ensure(row['beforeSourceArchive']['uncompressedSha256'] == row['before']['sha256']
               and row['afterSourceArchive']['uncompressedSha256'] == row['after']['sha256'],
               'Archived changed-source bytes differ from the declared comparison')
    sources_path = output / f'{prefix}-source-manifests.json'; validator.write_json_exclusive(sources_path, source_pair)
    contract_saved = copy_source(args.contract, output / f'{prefix}-contract.json', validator)
    script_saved = copy_source(Path(__file__).resolve(), output / f'{prefix}-archiver.py', validator)
    validator_saved = copy_source(validator_path, output / f'{prefix}-validator.py', validator)
    before_median = before['capture']['median']; after_median = after['capture']['median']
    comparison = {
        'schema': 'p8-v5-knowledge-index-year-comparison-v1', 'readinessClaim': False,
        'prototypeReadiness': 'NOT READY; archive validation supplies neither calibration nor release approval',
        'seed': previous['seed'], 'startedAt': previous['startedAt'], 'throughDate': previous['throughDate'],
        'coreVersions': previous['coreVersions'], 'player': previous['player'],
        'rootObservedBenchmarkExitCodes': {'before': args.before_exit_code, 'after': args.after_exit_code},
        'preparedInputSha256': PREPARED_INPUT_SHA256,
        'priorCompactComparison': validator.descriptor(previous_path),
        'sourceManifests': validator.descriptor(sources_path), 'contract': contract_saved,
        'archiver': script_saved, 'pinnedValidator': validator_saved, 'modes': summaries,
        'canonicalCapturedResultParity': {
            'matched': True, 'beforeSha256': result_hash_before, 'afterSha256': result_hash_after,
            'correspondingActAndWorkHashesMatch': True, 'focusAndAffectSamplesMatch': True,
            'allComparedResultFieldsMatch': True, 'fullStateDigestAvailable': False,
            'includedRootFields': list(before_results),
            'excludedMetadata': ['sourceHash (independently validated with two declared changed paths)',
                                 'preparedInputExport location (exact prepared-input SHA retained)',
                                 'run/warmup elapsed, initialize, advance, rate and process-memory telemetry',
                                 'build-stage elapsed and memory telemetry', 'median elapsed and rate'],
            'scope': 'Every corresponding serialized result, including complete captured worlds and final detailed rows. The normal capture does not serialize full CoreState; this is not a whole-world or full-state hash.'},
        'timingComparison': {
            'elapsedMedianRatioAfterOverBefore': after_median['medianElapsedMilliseconds'] / before_median['medianElapsedMilliseconds'],
            'medianDaysPerMinuteDifference': after_median['medianDaysPerMinute'] - before_median['medianDaysPerMinute'],
            'scope': 'Unchanged prepared input, API/schema5, work flags, player and focus selection; only the two declared knowledge-index source paths differ within the captured core2 manifest and four direct pins. Transitive generation files remain unpinned. Actual rates are read from completed captures.'},
        'proofLimits': ['Normal captures omit complete per-person money, knowledge, relationships, open callbacks and other CoreState tables. Captured-result parity cannot prove equality of those omitted fields.',
                        'Latest-work cash violations and retained visibility remain producer aggregate checks, not independent receipt-by-receipt or durable-row replay.',
                        'Remaining transitive generation sources are outside the source manifest and are not independently repinned.',
                        'Age time-use context, employer funding, schedules, attendance mappings and all existing stopgaps remain unresolved; no realism or civic-drive acceptance follows from parity.',
                        'Annual timers exclude generation, summary validation and serialization. Process-lifetime memory does not establish isolated steady-state memory or valid GC attribution.',
                        'This archiver runs no world, compiler, test, Git operation or release gate. Existing gate evidence is historical and is not reclassified as passing the revised source.']}
    result_path = output / f'{prefix}-comparison.json'
    validator.verify_source(repo, source_pair['afterManifest'])
    validator.write_json_exclusive(result_path, comparison)
    print(json.dumps({'comparison': str(result_path), 'sha256': validator.sha(result_path),
                      'canonicalCapturedResultParity': True, 'fullStateDigestAvailable': False,
                      'beforeMedian': before_median, 'afterMedian': after_median, 'readinessClaim': False}, indent=2))


if __name__ == '__main__':
    try:
        main()
    except (ValueError, KeyError, OSError, TypeError, AttributeError) as error:
        print('Archive rejected: ' + str(error), file=sys.stderr)
        sys.exit(2)
