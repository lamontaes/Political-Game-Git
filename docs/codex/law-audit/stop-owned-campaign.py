"""Freeze/stop only this audit's manifest-owned processes; preserve sealed bytes."""
import datetime, hashlib, json, os, pathlib, signal, sys
p=pathlib.Path(sys.argv[1]); reason=sys.argv[2]
raw=(p/'manifest.json').read_bytes(); m=json.loads(raw); driver=m['hostPid']
command=pathlib.Path(f'/proc/{driver}/cmdline').read_bytes().replace(b'\0',b' ').decode()
assert 'scripts/law-audit/all56-orchestration.mjs' in command
os.kill(driver,signal.SIGSTOP)
raw=(p/'manifest.json').read_bytes();m=json.loads(raw)
receipt=dict(at=datetime.datetime.now(datetime.timezone.utc).isoformat(),head=m['head'],driver=driver,
    reason=reason,workers=[],sealed=[])
for w in m['worlds']:
    if w['status']=='COMPLETED':
        path=pathlib.Path(w['output']+'.json')
        receipt['sealed'].append(dict(state=w['state'],path=str(path),sha256=hashlib.sha256(path.read_bytes()).hexdigest(),performance=w.get('performance')))
    if w['status']=='RUNNING':
        pid=w['pid'];proc=pathlib.Path(f'/proc/{pid}')
        if proc.exists():
            cmd=(proc/'cmdline').read_bytes().replace(b'\0',b' ').decode()
            assert 'scripts/law-audit/all56-worker.mts' in cmd
            memory=[s for s in (proc/'status').read_text().splitlines() if s.startswith(('State:','VmHWM:','VmRSS:'))]
            receipt['workers'].append(dict(state=w['state'],pid=pid,memory=memory))
            os.kill(pid,signal.SIGTERM)
        w['status']='INTERRUPTED_BY_CTO';w['interruptedAt']=receipt['at']
os.kill(driver,signal.SIGTERM);os.kill(driver,signal.SIGCONT)
(p/'manifest-before-stop.json').write_bytes(raw)
m.update(status='STOPPED_BY_CTO',stoppedAt=receipt['at'],historicalOnly=True)
(p/'manifest.json').write_text(json.dumps(m,indent=2)+'\n')
(p/'stop-receipt.json').write_text(json.dumps(receipt,indent=2)+'\n')
print(json.dumps(receipt,indent=2))
