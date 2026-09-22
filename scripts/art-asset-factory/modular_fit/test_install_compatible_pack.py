from pathlib import Path
import hashlib
import json
import tempfile
import unittest
from install_compatible_pack import install_compatible


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


class CompatiblePackTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        root = Path(self.tmp.name)
        self.pack, self.target = root / 'pack', root / 'target'
        (self.pack / 'files').mkdir(parents=True)
        self.target.mkdir()
        (self.pack / 'files/pixel.bin').write_bytes(b'original-private-pixels')
        (self.target / 'source.ts').write_text('composed-source')
        old = 'a' * 64
        self.manifest = {'sourceSha': '1' * 40, 'requiredSourceFiles': {'source.ts': old},
                         'files': [{'path': 'pixel.bin', 'sha256': digest(self.pack / 'files/pixel.bin')}],
                         'acceptance': 'candidate-unapproved'}
        m = self.pack / 'manifest.json'
        m.write_text(json.dumps(self.manifest))
        (self.pack / 'manifest.sha256').write_text(digest(m) + '  manifest.json\n')
        new = digest(self.target / 'source.ts')
        self.receipt = {'schema': 'modular-source-compatibility-v1', 'originalManifestSha256': digest(m),
                        'originalSourceSha': '1' * 40, 'sourceSha': '2' * 40,
                        'requiredSourceFiles': {'source.ts': new},
                        'sourceOverrides': {'source.ts': {'before': old, 'after': new,
                                                        'reason': 'reviewed composition'}}}
        self.path = root / 'compatibility.json'

    def write_receipt(self):
        self.path.write_text(json.dumps(self.receipt))
        self.path.with_suffix('.sha256').write_text(digest(self.path) + '  ' + self.path.name + '\n')

    def test_installs_original_bytes_without_mutating_the_pack_and_retries(self):
        self.write_receipt()
        before = (self.pack / 'manifest.json').read_bytes()
        install_compatible(self.pack, self.target, self.path, True)
        install_compatible(self.pack, self.target, self.path, True)
        self.assertEqual((self.target / 'pixel.bin').read_bytes(), b'original-private-pixels')
        self.assertEqual((self.pack / 'manifest.json').read_bytes(), before)

    def test_refuses_tampered_receipt_or_wrong_original_pack(self):
        self.write_receipt()
        self.path.write_text(self.path.read_text() + ' ')
        with self.assertRaisesRegex(ValueError, 'receipt hash'): install_compatible(self.pack, self.target, self.path, True)
        self.receipt['originalManifestSha256'] = '0' * 64
        self.write_receipt()
        with self.assertRaisesRegex(ValueError, 'original pack manifest'): install_compatible(self.pack, self.target, self.path, True)
        self.assertFalse((self.target / 'pixel.bin').exists())

    def test_refuses_dropped_or_unexplained_source_contract(self):
        self.receipt['requiredSourceFiles'] = {}
        self.write_receipt()
        with self.assertRaisesRegex(ValueError, 'drops'): install_compatible(self.pack, self.target, self.path, True)
        self.receipt['requiredSourceFiles'] = {'source.ts': digest(self.target / 'source.ts')}
        self.receipt['sourceOverrides'] = {}
        self.write_receipt()
        with self.assertRaisesRegex(ValueError, 'override inventory'): install_compatible(self.pack, self.target, self.path, True)

    def test_refuses_changed_target_source_before_publishing_assets(self):
        self.write_receipt()
        (self.target / 'source.ts').write_text('unreviewed change')
        with self.assertRaisesRegex(ValueError, 'incompatible source'): install_compatible(self.pack, self.target, self.path, True)
        self.assertFalse((self.target / 'pixel.bin').exists())
