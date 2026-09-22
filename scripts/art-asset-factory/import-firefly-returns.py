"""Finite local return intake; never watches, changes originals, or approves paint.
Usage: python3 import-firefly-returns.py --kit /path/PLAYTEST65-FIREFLY
Drop a provider download with any filename into returns/<request-id>/ first.
"""
import argparse
import hashlib
import json
from pathlib import Path
import shutil
import sys
from PIL import Image


def ingest(kit: Path):
    kit = kit.resolve(strict=True)
    manifest = json.loads((kit / 'manifest.json').read_text())
    if manifest.get('schema') != 'playtest65-firefly-kit-v1':
        raise ValueError('Unsupported kit schema')
    records_path = kit / 'receipts' / 'intake.json'
    prior = json.loads(records_path.read_text()) if records_path.exists() else []
    keys = {(r['requestId'], r['sha256']) for r in prior}
    report = {'added': [], 'duplicates': [], 'rejected': []}
    total_bytes = sum(p.stat().st_size for p in (kit / 'originals').glob('*') if p.is_file())
    max_bytes = 4 * 1024**3
    for request in manifest['requests']:
        request_id = request['id']
        if Path(request_id).name != request_id or request_id in ('.', '..'):
            raise ValueError('Unsafe request id')
        folder = kit / request['returns']
        if not folder.resolve().is_relative_to(kit):
            raise ValueError('Return directory escapes kit')
        if not folder.exists():
            continue
        for source in sorted(folder.iterdir()):
            if source.name.startswith('.') or not source.is_file():
                continue
            if source.is_symlink():
                report['rejected'].append({'file': str(source), 'reason': 'symlink'})
                continue
            try:
                source_bytes = source.stat().st_size
                if source_bytes > 100 * 1024**2:
                    raise ValueError('Single return exceeds 100 MiB intake limit')
                with Image.open(source) as im:
                    im.verify()
                with Image.open(source) as im:
                    im.load()
                    width, height, mode, image_format = im.width, im.height, im.mode, im.format
                digest = hashlib.sha256(source.read_bytes()).hexdigest()
                if (request_id, digest) in keys:
                    report['duplicates'].append(str(source.relative_to(kit)))
                    continue
                suffix = { 'JPEG': '.jpg', 'PNG': '.png', 'WEBP': '.webp', 'TIFF': '.tif' }.get(image_format)
                if suffix is None:
                    raise ValueError('Unsupported source image format')
                original = kit / 'originals' / (digest + suffix)
                original.parent.mkdir(exist_ok=True)
                if original.exists():
                    if hashlib.sha256(original.read_bytes()).hexdigest() != digest:
                        raise ValueError('Existing original hash mismatch')
                else:
                    if total_bytes + source_bytes > max_bytes:
                        raise ValueError('Protected original cache would exceed 4 GiB intake budget')
                    # Exclusive creation prevents accidentally replacing historical bytes.
                    with original.open('xb') as dest, source.open('rb') as src:
                        shutil.copyfileobj(src, dest)
                    total_bytes += source_bytes
                revision = 1 + sum(r['requestId'] == request_id for r in prior)
                row = {'requestId': request_id, 'candidateId': f"{request['candidatePrefix']}{revision}",
                    'revision': revision, 'sha256': digest, 'originalFilename': source.name,
                    'original': str(original.relative_to(kit)), 'width': width, 'height': height,
                    'mode': mode, 'format': image_format, 'approval': 'unreviewed',
                    'provider': 'owner-return-unverified', 'declaredRequestProvider': request['provider'],
                    'templateVersion': request['templateVersion'], 'generationMetadata': None}
                prior.append(row);keys.add((request_id, digest));report['added'].append(row)
            except Exception as error:
                report['rejected'].append({'file': str(source.relative_to(kit)), 'reason': str(error)})
    records_path.parent.mkdir(exist_ok=True)
    staging = records_path.with_suffix('.pending')
    staging.write_text(json.dumps(prior, indent=2) + '\n')
    staging.replace(records_path)
    return report

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--kit', required=True, type=Path)
    args = parser.parse_args()
    result = ingest(args.kit)
    print(json.dumps(result, indent=2))
    sys.exit(2 if result['rejected'] else 0)
