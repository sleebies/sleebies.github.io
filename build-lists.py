# Rebuilds slideshow.js, photos.js and videos.js from what's in the
# slideshow, photos and videos folders. The Neocities deploy runs this
# automatically, so adding a file to a folder is all it takes.
import json, os, subprocess

def build(folder, var, exts, out):
    names = sorted(n for n in os.listdir(folder) if n.lower().endswith(exts)) if os.path.isdir(folder) else []
    with open(out, 'w', encoding='utf-8') as f:
        f.write(f'// Built automatically from the {folder} folder, no need to edit by hand.\n')
        f.write(f'const {var} = [\n' + ''.join('  ' + json.dumps(n) + ',\n' for n in names) + '];\n')
    print(f'{out}: {len(names)} files')

IMG = ('.png', '.jpg', '.jpeg', '.gif', '.webp')
build('slideshow', 'IMAGES', IMG, 'slideshow.js')
build('photos', 'PHOTOS', IMG, 'photos.js')

# Videos are dated by when they were made, newest first. Where the date comes from:
#   1. video-dates.txt, one line per video: "real_shep_dance.mp4 = 2026-03-14"
#   2. the creation time stored inside the mp4 (if the file kept it)
#   3. otherwise, the day it was added to the repo
import struct, datetime
NY = 'America/New_York'

def listed_dates():
    out = {}
    if os.path.exists('video-dates.txt'):
        for line in open('video-dates.txt', encoding='utf-8'):
            line = line.split('#')[0].strip()
            if '=' in line:
                name, date = (x.strip() for x in line.split('=', 1))
                out[name] = date
    return out

def made(path):
    # mvhd creation time: seconds since 1904-01-01 UTC
    try:
        data = open(path, 'rb').read()
        i = data.find(b'mvhd')
        if i < 0: return ''
        ver = data[i + 4]
        secs = struct.unpack('>Q', data[i + 8:i + 16])[0] if ver == 1 else struct.unpack('>I', data[i + 8:i + 12])[0]
        if secs < 3000000000: return ''   # empty or nonsense (before ~1999)
        t = datetime.datetime(1904, 1, 1, tzinfo=datetime.timezone.utc) + datetime.timedelta(seconds=secs)
        try:
            from zoneinfo import ZoneInfo
            t = t.astimezone(ZoneInfo(NY))
        except Exception:
            pass
        return t.strftime('%Y-%m-%dT%H:%M:%S')
    except Exception:
        return ''

def added(path):
    # No --follow: on big binary files git mistakes a new video for a renamed old one.
    try:
        env = dict(os.environ, TZ=NY)
        out = subprocess.run(['git', 'log', '--diff-filter=A', '--date=format-local:%Y-%m-%dT%H:%M:%S',
                              '--format=%cd', '--', path], capture_output=True, text=True, env=env).stdout.split()
        return out[-1] if out else ''
    except Exception:
        return ''

vids = sorted(n for n in os.listdir('videos') if n.lower().endswith(('.mp4', '.webm', '.mov'))) if os.path.isdir('videos') else []
given = listed_dates()
stamps = {n: given.get(n) or made('videos/' + n) or added('videos/' + n) for n in vids}
vids.sort(key=lambda n: stamps[n] or '9999', reverse=True)   # no date yet = newest
items = [{'file': n, 'date': stamps[n][:10]} for n in vids]
with open('videos.js', 'w', encoding='utf-8') as f:
    f.write('// Built automatically from the videos folder (date = when it was made, see video-dates.txt), no need to edit by hand.\n')
    f.write('const VIDEOS = [\n' + ''.join('  ' + json.dumps(v) + ',\n' for v in items) + '];\n')
print(f'videos.js: {len(items)} files')
