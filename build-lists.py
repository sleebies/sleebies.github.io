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

# Videos also get the date they were first added to the repo, newest first.
# No --follow: on big binary files git mistakes a new video for a renamed old one.
# Dates are shown in New York time (where swag is).
def added(path):
    try:
        env = dict(os.environ, TZ='America/New_York')
        out = subprocess.run(['git', 'log', '--diff-filter=A', '--date=format-local:%Y-%m-%dT%H:%M:%S',
                              '--format=%cd', '--', path], capture_output=True, text=True, env=env).stdout.split()
        return out[-1] if out else ''
    except Exception:
        return ''

vids = sorted(n for n in os.listdir('videos') if n.lower().endswith(('.mp4', '.webm', '.mov'))) if os.path.isdir('videos') else []
stamps = {n: added('videos/' + n) for n in vids}
vids.sort(key=lambda n: stamps[n] or '9999', reverse=True)   # not committed yet = newest
items = [{'file': n, 'date': stamps[n][:10]} for n in vids]
with open('videos.js', 'w', encoding='utf-8') as f:
    f.write('// Built automatically from the videos folder (date = when it was added), no need to edit by hand.\n')
    f.write('const VIDEOS = [\n' + ''.join('  ' + json.dumps(v) + ',\n' for v in items) + '];\n')
print(f'videos.js: {len(items)} files')
