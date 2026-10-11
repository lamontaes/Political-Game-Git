import gzip
import hashlib
import json
import subprocess
from pathlib import Path

root = Path(__file__).resolve().parent
core_head = 'b2d5bd34ab8e42afa2000db5676a7f7048d6df29'
source_tree = subprocess.check_output(['git', 'rev-parse', core_head + ':src'], text=True).strip()
receipts = [json.loads((root / f'{i}-receipt.json').read_text()) for i in range(3)]
for i, receipt in enumerate(receipts):
    profile_bytes = gzip.decompress((root / f'{i}.cpuprofile.gz').read_bytes())
    assert hashlib.sha256(profile_bytes).hexdigest() == receipt['profileSha256']
    analysis = json.loads((root / f'{i}-analysis.json').read_text())
    assert receipt['sourceTree'] == source_tree
    assert receipt['days'] == sum(row['simulatedDays'] for row in receipt['months']) == 365
    assert receipt['months'][-1]['throughDate'] == '2022-01-01'
    assert receipt['acts'] == sum(row['acts'] for row in receipt['months'])
    assert receipt['decisions'] == sum(row['decisions'] for row in receipt['months'])
    assert receipt['opening']['budget']['passed']
    assert receipt['host'] == receipts[0]['host']
    assert receipt['settings'] == receipts[0]['settings']
    if i:
        assert receipts[i - 1]['endUtc'] < receipt['startUtc']
    for partition in ['modules', 'steps']:
        assert abs(sum(row['seconds'] for row in analysis[partition]) - analysis['totalSeconds']) < 0.000001
    assert abs(analysis['totalSeconds'] - receipt['elapsedMilliseconds'] / 1000) < 0.05
for name in ['month.mjs', 'policies.json', 'profile-summary.mjs']:
    original = subprocess.check_output(['git', 'show', '31cc98bb0b2c4d72cd1ef7243919232217ecb713:scripts/core2-guard/' + name])
    assert original == (root / 'guard' / name).read_bytes()
assert not subprocess.check_output(['git', 'diff', core_head, '--', 'src', 'data', 'package-lock.json'])
print('PASS: three complete sequential years, profile hashes, source tree, settings, host, opening budgets, exclusive sample partitions, timing reconciliation, exact M0 tools, and unchanged game source/data/lockfile')
