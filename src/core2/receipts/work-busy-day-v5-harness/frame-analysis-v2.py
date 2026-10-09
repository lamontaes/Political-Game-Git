import json, pathlib, hashlib

ROOT = pathlib.Path('/workspace/p8-core-prototype')
ART = pathlib.Path('/workspace/p8-benchmark-artifacts')
OUT = ROOT / 'src/core2/receipts'
PROFILE = ART / 'p8-work-v5-20210702-before.cpuprofile'
SUMMARY = ART / 'p8-work-v5-20210702-before-summary.json'
raw = PROFILE.read_bytes()
profile = json.loads(raw)
summary = json.loads(SUMMARY.read_bytes())
assert hashlib.sha256(raw).hexdigest() == summary['rawProfile']['sha256']
nodes = {row['id']: row for row in profile['nodes']}
parents = {child: row['id'] for row in profile['nodes'] for child in row.get('children', [])}
roots = [row['id'] for row in profile['nodes'] if row['callFrame']['functionName'] == 'advanceCore' and row['callFrame']['url'].endswith('/src/core2/life.ts')]
assert len(roots) == 1
root = roots[0]
self_us = {}; incl_us = {}; engine_us = 0; total_us = 0; engine_samples = 0
for leaf, delta in zip(profile['samples'], profile['timeDeltas']):
    total_us += delta
    chain = []; cursor = leaf
    while cursor in nodes:
        chain.append(cursor)
        if cursor not in parents: break
        cursor = parents[cursor]
    if root not in chain: continue
    engine_us += delta; engine_samples += 1
    self_us[leaf] = self_us.get(leaf, 0) + delta
    for cursor in chain[:chain.index(root) + 1]: incl_us[cursor] = incl_us.get(cursor, 0) + delta

alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
def decode(segment):
    values = []; value = shift = 0
    for char in segment:
        digit = alphabet.index(char); value |= (digit & 31) << shift
        if digit & 32: shift += 5
        else:
            values.append(-(value >> 1) if value & 1 else value >> 1)
            value = shift = 0
    return values

cache_path = pathlib.Path('/tmp/tsx-1000/17915-9ab91e546a8a9402c3283252c361433b9eb5e08c')
cache = json.loads(cache_path.read_bytes()); mapping = cache['map']
lines = []; source = original_line = original_column = name = 0
for line in mapping['mappings'].split(';'):
    column = 0; rows = []
    for segment in line.split(','):
        if not segment: continue
        values = decode(segment); column += values[0]
        if len(values) >= 4:
            source += values[1]; original_line += values[2]; original_column += values[3]
            if len(values) == 5: name += values[4]
            rows.append((column, source, original_line, original_column))
    lines.append(rows)

frames = []
for node_id in incl_us:
    frame = nodes[node_id]['callFrame']; entry = dict(frame)
    entry.update({'nodeId': node_id, 'selfSampleMilliseconds': self_us.get(node_id, 0) / 1000, 'inclusiveSampleMilliseconds': incl_us[node_id] / 1000})
    if frame['url'].endswith('/src/core2/state.ts'):
        matches = [row for row in lines[frame['lineNumber']] if row[0] <= frame['columnNumber']]
        if matches:
            row = matches[-1]
            entry['originalLocation'] = {'path': mapping['sources'][row[1]], 'line': row[2] + 1, 'column': row[3]}
    frames.append(entry)
grouped = {}
for frame in frames:
    key = (frame['functionName'], frame['url'], frame['lineNumber'], frame['columnNumber'])
    if key not in grouped:
        grouped[key] = {k: v for k, v in frame.items() if k not in {'nodeId', 'selfSampleMilliseconds', 'inclusiveSampleMilliseconds'}}
        grouped[key].update({'nodeIds': [], 'selfSampleMilliseconds': 0, 'inclusiveSampleMilliseconds': 0})
    entry = grouped[key]
    entry['nodeIds'].append(frame['nodeId'])
    entry['selfSampleMilliseconds'] += frame['selfSampleMilliseconds']
    entry['inclusiveSampleMilliseconds'] += frame['inclusiveSampleMilliseconds']
frames = list(grouped.values())
frames.sort(key=lambda row: row['selfSampleMilliseconds'], reverse=True)
state = ROOT / 'src/core2/state.ts'
result = {
    'schema': 'p8-busy-day-sampled-advance-subtree-analysis-v2',
    'profileDate': summary['profileDate'],
    'advanceWallMilliseconds': summary['profileWallMilliseconds'],
    'advance': summary['advance'],
    'rawProfileSha256': hashlib.sha256(raw).hexdigest(),
    'rawSampleDeltaMilliseconds': total_us / 1000,
    'advanceSubtreeSampleDeltaMilliseconds': engine_us / 1000,
    'advanceSubtreeSamples': engine_samples,
    'scope': 'Only samples whose recorded stack contains the actual advanceCore node are included below. Inclusive times overlap and must not be added. Inspector start bookkeeping and root-level garbage collector samples are excluded, not relabeled as engine costs. Sample deltas are attribution, not instrumented function wall time.',
    'sourceMapping': {
        'path': str(state),
        'sha256': hashlib.sha256(state.read_bytes()).hexdigest(),
        'cachePath': str(cache_path),
        'cacheSha256': hashlib.sha256(cache_path.read_bytes()).hexdigest(),
        'validation': 'Root imported current pinned state.ts without running a world. Current coreAPI.toString() exactly matched only this cached transform among all five state.ts caches. Live function SHA256 da56bbdf981b9e825ad9f4f34389ab08f9ebb1371557703d95c151d7a2bf3fa4. Standard source-map VLQ decoding maps coreAPI frames to original TypeScript. Other frame columns retain generated locations and are not presented as original lines.',
        'sourcesContentAvailableInCache': False,
    },
    'topFramesBySelfTime': frames[:30],
    'topFramesByInclusiveTime': sorted(frames, key=lambda row: row['inclusiveSampleMilliseconds'], reverse=True)[:30],
    'notAnnualGate': True,
    'annualGcCoverageEstablished': False,
}
destination = OUT / 'prototype-v5-work-busy-day-before-frame-analysis-v2.json'
with destination.open('x', encoding='utf8') as stream:
    json.dump(result, stream, indent=2); stream.write('\n')
print(json.dumps({'path': str(destination), 'advanceWallMilliseconds': result['advanceWallMilliseconds'], 'advanceSubtreeSampleDeltaMilliseconds': result['advanceSubtreeSampleDeltaMilliseconds'], 'largestSelfFrame': frames[0]}))
