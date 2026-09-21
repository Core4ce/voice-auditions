#!/usr/bin/env python3
"""Play the recorded audition in catalog order; Ctrl-C stops playback."""
import argparse
import json
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--voice', action='append', help='Limit playback to preset ID(s)')
parser.add_argument('--dry-run', action='store_true')
args = parser.parse_args()
catalog = json.loads((ROOT / 'site/voices.json').read_text())
voices = sorted(catalog['voices'], key=lambda v: v['order'])
if args.voice:
    unknown = set(args.voice) - {v['id'] for v in voices}
    if unknown:
        parser.error(f'Unknown voices: {sorted(unknown)}')
    voices = [v for v in voices if v['id'] in args.voice]
try:
    for index, voice in enumerate(voices, 1):
        print(f"{index}/{len(voices)} {voice['name']} ({voice['id']})", flush=True)
        if not args.dry_run:
            path = ROOT / 'site' / voice['audio']
            if not path.is_file():
                parser.error(f'Missing recording: {voice["id"]}; run record-voices.py first')
            subprocess.run(['afplay', str(path)], check=True)
except KeyboardInterrupt:
    print('\nStopped.')
