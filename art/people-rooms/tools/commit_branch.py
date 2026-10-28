"""Commit stage/ onto a branch of lamontaes/Political-Game-Git through the GitHub API (no clone)."""
import sys, os, json, base64, subprocess, tempfile, hashlib, time
from concurrent.futures import ThreadPoolExecutor
REPO = 'repos/lamontaes/Political-Game-Git'; BRANCH, MSG = sys.argv[1], sys.argv[2]; ROOT = os.environ.get('ROOT', 'stage')
def api(path, method='GET', body=None):
    cmd = ['gh', 'api', f'{REPO}/{path}', '-X', method]
    if body is not None:
        f = tempfile.NamedTemporaryFile('w', suffix='.json', delete=False); json.dump(body, f); f.close(); cmd += ['--input', f.name]
    for attempt in range(8):
        out = subprocess.run(cmd, capture_output=True, text=True)
        if not out.returncode: return json.loads(out.stdout)
        if 'rate limit' in (out.stderr + out.stdout).lower(): time.sleep(60 * (attempt + 1)); continue   # GitHub asks to slow down
        raise SystemExit(f'{path}: {out.stderr[:300]} {out.stdout[:300]}')
    raise SystemExit(f'{path}: still rate limited')
try: head = api(f'git/ref/heads/{BRANCH}')['object']['sha']; new_branch = False
except SystemExit: head = api('git/ref/heads/main')['object']['sha']; new_branch = True
base_tree = api(f'git/commits/{head}')['tree']['sha']
files = [os.path.join(d, f) for d, _, fs in os.walk(ROOT) for f in fs]
# skip files already on the branch with the same content (git blob hash)
have = {e['path']: e['sha'] for e in api(f'git/trees/{head}?recursive=1')['tree'] if e['type'] == 'blob'}
def git_sha(p):
    b = open(p, 'rb').read(); return hashlib.sha1(b'blob %d\0' % len(b) + b).hexdigest()
local = {os.path.relpath(p, ROOT) for p in files}
# files under the folders this delivery owns that are no longer in the build come off the branch
MANAGED = [m for m in os.environ.get('MANAGED', '').split(',') if m]
gone = [p for p in have if any(p.startswith(m) for m in MANAGED) and p not in local]
files = [p for p in files if have.get(os.path.relpath(p, ROOT)) != git_sha(p)]
print(len(gone), 'files to remove', flush=True)
print(len(files), 'new or changed files to upload', flush=True)
def blob(p):
    sha = api('git/blobs', 'POST', {'content': base64.b64encode(open(p, 'rb').read()).decode(), 'encoding': 'base64'})['sha']
    return {'path': os.path.relpath(p, ROOT), 'mode': '100644', 'type': 'blob', 'sha': sha}
def try_api(path, method, body):
    f = tempfile.NamedTemporaryFile('w', suffix='.json', delete=False); json.dump(body, f); f.close()
    out = subprocess.run(['gh', 'api', f'{REPO}/{path}', '-X', method, '--input', f.name], capture_output=True, text=True)
    return json.loads(out.stdout) if not out.returncode else None
# a blob's name is the hash of its content, so pictures already uploaded (even by a failed earlier run) need no upload
known = [{'path': os.path.relpath(p, ROOT), 'mode': '100644', 'type': 'blob', 'sha': git_sha(p)} for p in files]
gone_entries = [{'path': p, 'mode': '100644', 'type': 'blob', 'sha': None} for p in gone]
if not known and not gone_entries: raise SystemExit('nothing changed')
head = api(f'git/ref/heads/{BRANCH}')['object']['sha'] if not new_branch else head      # build on the tip as it is now
base_tree = api(f'git/commits/{head}')['tree']['sha']
t = try_api('git/trees', 'POST', {'base_tree': base_tree, 'tree': known + gone_entries})
if t: entries = known + gone_entries; print('all blobs already on GitHub', flush=True)
else:
    entries = []
    for i, p in enumerate(files):   # one at a time: GitHub's secondary rate limit punishes bursts of uploads
        entries.append(blob(p)); time.sleep(0.7)
        if i % 50 == 0: print(i, 'uploaded', flush=True)
    entries += gone_entries
    head = api(f'git/ref/heads/{BRANCH}')['object']['sha'] if not new_branch else head
    base_tree = api(f'git/commits/{head}')['tree']['sha']
    t = api('git/trees', 'POST', {'base_tree': base_tree, 'tree': entries})
tree = t['sha']
commit = api('git/commits', 'POST', {'message': MSG, 'tree': tree, 'parents': [head]})['sha']
if new_branch: api('git/refs', 'POST', {'ref': f'refs/heads/{BRANCH}', 'sha': commit})
else: api(f'git/refs/heads/{BRANCH}', 'PATCH', {'sha': commit})
print(len(entries), 'files', 'new branch' if new_branch else 'updated', BRANCH, commit)
