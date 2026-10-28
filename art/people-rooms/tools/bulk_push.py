"""Push thousands of files to a branch in seconds without a clone: put only the new files in a fresh temporary git
folder, push it to a side branch in one bundle (GitHub stores every picture), then commit to the target branch through
the API by pointing at the bundle's folders (FOLDER_DEPTH levels deep) and loose files, so nothing is uploaded twice
and files already on the target branch outside those folders stay.
usage: python3 bulk_push.py ROOT TARGET_BRANCH "message" [FOLDER_DEPTH=6] [FOLDER_PREFIX=art/people-engine/v2/wardrobe/]"""
import sys, os, json, shutil, subprocess, tempfile

REPO = 'lamontaes/Political-Game-Git'
root, target, msg = sys.argv[1:4]
depth = int(sys.argv[4]) if len(sys.argv) > 4 else 6
prefix = sys.argv[5] if len(sys.argv) > 5 else 'art/people-engine/v2/wardrobe/'
side = 'claude/people-wardrobe-objects'

def api(path, method='GET', body=None):
    cmd = ['gh', 'api', f'repos/{REPO}/{path}', '-X', method]
    if body is not None:
        f = tempfile.NamedTemporaryFile('w', suffix='.json', delete=False); json.dump(body, f); f.close(); cmd += ['--input', f.name]
    out = subprocess.run(cmd, capture_output=True, text=True)
    if out.returncode: raise SystemExit(f'{path}: {out.stderr[:300]} {out.stdout[:300]}')
    return json.loads(out.stdout)

work = tempfile.mkdtemp(prefix='bulk-')
for name in os.listdir(root): shutil.copytree(os.path.join(root, name), os.path.join(work, name)) if os.path.isdir(os.path.join(root, name)) else shutil.copy2(os.path.join(root, name), work)
git = lambda *a: subprocess.run(['git', '-C', work, '-c', 'user.name=Claude CTO', '-c', 'user.email=noreply@anthropic.com', *a], check=True, capture_output=True, text=True)
git('init', '-q'); git('checkout', '-q', '-b', side); git('add', '-A'); git('commit', '-q', '-m', 'art: bulk objects for ' + target)
subprocess.run(['git', '-C', work, '-c', 'credential.helper=', '-c', 'credential.helper=!gh auth git-credential', 'push', '-q', '-f',
                f'https://github.com/{REPO}.git', side], check=True, capture_output=True, text=True)
obj = api(f'git/ref/heads/{side}')['object']['sha']
T = api(f"git/trees/{api(f'git/commits/{obj}')['tree']['sha']}?recursive=1")
if T.get('truncated'): raise SystemExit('tree listing truncated; push in smaller parts')
entries = []
for e in T['tree']:
    parts = e['path'].split('/')
    if e['type'] == 'tree' and len(parts) == depth and e['path'].startswith(prefix): entries.append({'path': e['path'], 'mode': '040000', 'type': 'tree', 'sha': e['sha']})
    elif e['type'] == 'blob' and not (len(parts) > depth and e['path'].startswith(prefix)): entries.append({'path': e['path'], 'mode': '100644', 'type': 'blob', 'sha': e['sha']})
head = api(f'git/ref/heads/{target}')['object']['sha']
tree = api('git/trees', 'POST', {'base_tree': api(f'git/commits/{head}')['tree']['sha'], 'tree': entries})['sha']
commit = api('git/commits', 'POST', {'message': msg, 'tree': tree, 'parents': [head]})['sha']
api(f'git/refs/heads/{target}', 'PATCH', {'sha': commit})
shutil.rmtree(work); print(len(entries), 'entries', target, commit)
