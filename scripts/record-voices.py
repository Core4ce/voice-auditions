#!/usr/bin/env python3
"""Sequential, resumable local Kokoro production from site/voices.json."""
import argparse
import datetime as dt
import fcntl
import hashlib
import json
import os
from pathlib import Path
import platform
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]


def digest(value):
    return hashlib.sha256(value).hexdigest()


def write_json(path, value):
    temp = path.with_suffix('.tmp')
    temp.write_text(json.dumps(value, indent=2) + '\n')
    temp.replace(path)


def text_for(catalog, voice):
    return ' '.join([voice['introduction'], catalog['passage'], catalog['closing'].format(name=voice['name'])])


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--speak', type=Path, default=ROOT / 'runtime/speak')
    parser.add_argument('--voice', action='append', help='Render selected preset(s); default: all')
    parser.add_argument('--dry-run', action='store_true')
    parser.add_argument('--producer-host', default=platform.node().split('.')[0])
    args = parser.parse_args()
    catalog = json.loads((ROOT / 'site/voices.json').read_text())
    voices = sorted(catalog['voices'], key=lambda v: v['order'])
    if args.voice:
        unknown = set(args.voice) - {v['id'] for v in voices}
        if unknown:
            parser.error(f'Unknown voices: {sorted(unknown)}')
        voices = [v for v in voices if v['id'] in args.voice]
    if args.dry_run:
        for voice in voices:
            print(voice['id'], text_for(catalog, voice))
        return
    work = ROOT / '.render'
    work.mkdir(exist_ok=True)
    lock = (work / 'record.lock').open('w')
    fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
    manifest_path = ROOT / 'site/recordings.json'
    manifest = json.loads(manifest_path.read_text()) if manifest_path.exists() else {'recordings': {}}
    ffmpeg_version = subprocess.check_output(['ffmpeg', '-version'], text=True).splitlines()[0]
    python = args.speak.resolve().parent / 'tts-kokoro/.venv/bin/python'
    packages = json.loads(subprocess.check_output([str(python), '-c',
        'import importlib.metadata as m,json; print(json.dumps({p:m.version(p) for p in ["mlx-audio","mlx","misaki"]}))'], text=True))
    cache = args.speak.resolve().parent / 'tts-kokoro/cache/huggingface/hub'
    model_revisions = {p.name: sorted(s.name for s in (p / 'snapshots').iterdir())
                       for p in cache.glob('models--*') if (p / 'snapshots').is_dir()}
    producer = {'host': args.producer_host, 'machine': 'Mac Studio' if args.producer_host == 'Sunset' else platform.machine(),
                'engine': 'MLX-Audio', 'versions': packages, 'model': catalog['model'], 'modelRevisions': model_revisions, 'ffmpeg': ffmpeg_version}
    manifest.update(schemaVersion=1, producer=producer)
    failures = []
    for index, voice in enumerate(voices, 1):
        voice_id = voice['id']
        text = text_for(catalog, voice)
        lang = 'b' if voice_id.startswith('b') else 'a'
        config = {'text': text, 'voice': voice_id, 'languageCode': lang,
                  'rate': catalog['rate'], 'model': catalog['model'], 'modelRevisions': model_revisions, 'versions': packages,
                  'encoder': {'codec': 'libmp3lame', 'bitrate': '96k', 'channels': 1},
                  'ffmpeg': ffmpeg_version, 'speakSha256': digest(args.speak.read_bytes())}
        input_hash = digest(json.dumps(config, sort_keys=True).encode())
        target = (ROOT / 'site' / voice['audio']).resolve()
        if target.parent != (ROOT / 'site/audio').resolve():
            raise ValueError(f'Audio path outside site/audio: {voice_id}')
        target.parent.mkdir(exist_ok=True)
        prior = manifest['recordings'].get(voice_id, {})
        if prior.get('inputSha256') == input_hash and target.exists() and digest(target.read_bytes()) == prior.get('sha256'):
            print(f'{index}/{len(voices)} cached {voice_id}', flush=True)
            continue
        # Do not retain a stale success entry if regeneration fails.
        manifest['recordings'].pop(voice_id, None)
        folder = work / input_hash
        folder.mkdir(exist_ok=True)
        wav = folder / 'narration.wav'
        tmp = folder / 'encoded.mp3'
        try:
            env = dict(os.environ, SPEAK_MODEL=catalog['model'], SPEAK_LANG=lang, SPEAK_OFFLINE='1')
            with (folder / 'render.log').open('w') as log:
                subprocess.run([str(args.speak.resolve()), '--no-play', '-v', voice_id, '-r', str(catalog['rate']), '-o', str(wav), text], env=env, stdout=log, stderr=log, check=True)
                subprocess.run(['ffmpeg', '-nostdin', '-y', '-i', str(wav), '-ac', '1', '-c:a', 'libmp3lame', '-b:a', '96k', '-map_metadata', '-1', str(tmp)], stdout=log, stderr=log, check=True)
                subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-xerror', '-i', str(tmp), '-f', 'null', '-'], stdout=log, stderr=log, check=True)
            probe = json.loads(subprocess.check_output(['ffprobe', '-v', 'error', '-show_format', '-show_streams', '-of', 'json', str(tmp)], text=True))
            stream = next(s for s in probe['streams'] if s['codec_type'] == 'audio')
            duration = float(probe['format']['duration'])
            if duration <= 0:
                raise ValueError('Empty audio')
            tmp.replace(target)
            manifest['recordings'][voice_id] = {'duration': duration, 'bytes': target.stat().st_size,
                'sha256': digest(target.read_bytes()), 'textSha256': digest(text.encode()),
                'inputSha256': input_hash, 'sampleRate': int(stream['sample_rate']),
                'channels': stream['channels'], 'languageCode': lang, 'rate': catalog['rate'],
                'model': catalog['model'], 'generatedAt': dt.datetime.now(dt.timezone.utc).isoformat(),
                'producer': producer, 'decodeVerified': True}
            print(f'{index}/{len(voices)} rendered {voice_id} {duration:.2f}s {target.stat().st_size} bytes', flush=True)
        except Exception as error:
            failures.append(voice_id)
            print(f'{index}/{len(voices)} FAILED {voice_id}: {error}', file=sys.stderr, flush=True)
        manifest['generatedAt'] = dt.datetime.now(dt.timezone.utc).isoformat()
        write_json(manifest_path, manifest)
    print(json.dumps({'recordings': len(manifest['recordings']), 'failures': failures}), flush=True)
    if failures:
        raise SystemExit(1)


if __name__ == '__main__':
    main()
