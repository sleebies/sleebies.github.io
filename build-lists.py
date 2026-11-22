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
def added(path):
    try:
        out = subprocess.run(['git', 'log', '--diff-filter=A', '--follow', '--format=%cs', '--', path],
                             capture_output=True, text=True).stdout.split()
        return out[-1] if out else ''
    except Exception:
        return ''

vids = sorted(n for n in os.listdir('videos') if n.lower().endswith(('.mp4', '.webm', '.mov'))) if os.path.isdir('videos') else []
items = [{'file': n, 'date': added('videos/' + n)} for n in vids]
items.sort(key=lambda v: v['date'] or '9999', reverse=True)   # not committed yet = newest
with open('videos.js', 'w', encoding='utf-8') as f:
    f.write('// Built automatically from the videos folder (date = when it was added), no need to edit by hand.\n')
    f.write('const VIDEOS = [\n' + ''.join('  ' + json.dumps(v) + ',\n' for v in items) + '];\n')
print(f'videos.js: {len(items)} files')
