#!/usr/bin/env python3
"""Check that every published recording matches its catalog and provenance."""
import hashlib
import json
from pathlib import Path

root = Path(__file__).resolve().parents[1]
catalog = json.loads((root / 'site/voices.json').read_text())
manifest = json.loads((root / 'site/recordings.json').read_text())
voices = catalog['voices']
ids = [v['id'] for v in voices]
assert len(ids) == len(set(ids)) == 54, 'Expected 54 unique presets'
assert set(ids) == set(manifest['recordings']), 'Catalog and recordings differ'
assert set(ids) == {p.stem for p in (root / 'site/audio').glob('*.mp3')}, 'Audio files differ'
for v in voices:
    r = manifest['recordings'][v['id']]
    audio = root / 'site' / v['audio']
    assert audio.resolve().parent == (root / 'site/audio').resolve(), v['id']
    assert r['duration'] > 0 and r['decodeVerified'], v['id']
    assert audio.stat().st_size == r['bytes'], v['id']
    assert hashlib.sha256(audio.read_bytes()).hexdigest() == r['sha256'], v['id']
    text = ' '.join([v['introduction'], catalog['passage'], catalog['closing'].format(name=v['name'])])
    assert hashlib.sha256(text.encode()).hexdigest() == r['textSha256'], v['id']
print(f"Verified {len(ids)} recordings, file hashes and spoken-text hashes.")
