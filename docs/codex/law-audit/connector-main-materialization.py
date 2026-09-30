import json,pathlib,subprocess,hashlib,sys
from datetime import datetime
metadata=json.loads(pathlib.Path(sys.argv[1]).read_text())
paths=json.loads(pathlib.Path(sys.argv[2]).read_text())
if paths:subprocess.run(['git','add','--']+paths,check=True)
tree=subprocess.check_output(['git','write-tree'],text=True).strip()
assert tree==metadata['tree']['sha'], ('Local tree is not actual main',tree,metadata['tree']['sha'])
def identity(raw):return hashlib.sha1(b'commit '+str(len(raw)).encode()+b'\0'+raw).hexdigest()
verification=metadata.get('verification',{})
raw=None
if verification.get('payload') and verification.get('signature'):
    header,body=verification['payload'].split('\n\n',1)
    for trim in (True,False):
        sig=verification['signature'].rstrip('\n') if trim else verification['signature']
        field='gpgsig '+sig.replace('\n','\n ')
        candidate=(header+'\n'+field+'\n\n'+body).encode()
        if identity(candidate)==metadata['sha']:raw=candidate;break
else:
    base=['tree '+metadata['tree']['sha']]+['parent '+p['sha'] for p in metadata['parents']]
    for minute in [0]+list(range(-840,841)):
        offset=('+' if minute>=0 else '-')+f'{abs(minute)//60:02d}{abs(minute)%60:02d}'
        lines=base[:]
        for key in ('author','committer'):
            who=metadata[key];timestamp=int(datetime.fromisoformat(who['date'].replace('Z','+00:00')).timestamp())
            lines.append(f"{key} {who['name']} <{who['email']}> {timestamp} {offset}")
        for suffix in ('','\n','\n\n'):
            candidate=('\n'.join(lines)+'\n\n'+metadata['message']+suffix).encode()
            if identity(candidate)==metadata['sha']:raw=candidate;break
        if raw:break
assert raw is not None,'Actual-main raw commit identity not reconstructed; NO RUN'
actual=subprocess.check_output(['git','hash-object','-t','commit','-w','--stdin'],input=raw).decode().strip()
assert actual==metadata['sha']
shallow=pathlib.Path('.git/shallow');prior=shallow.read_text() if shallow.exists() else ''
if actual not in prior.splitlines():shallow.write_text(prior+actual+'\n')
subprocess.run(['git','switch','--detach',actual],check=True)
assert subprocess.check_output(['git','status','--porcelain'],text=True).strip()==''
print(json.dumps({'actualMain':actual,'tree':tree,'dirty':''}))
