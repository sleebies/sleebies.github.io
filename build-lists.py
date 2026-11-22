# Rebuilds slideshow.js, photos.js and videos.js from what's in the
# slideshow, photos and videos folders. The Neocities deploy runs this
# automatically, so adding a file to a folder is all it takes.
import json, os

def build(folder, var, exts, out):
    names = sorted(n for n in os.listdir(folder) if n.lower().endswith(exts)) if os.path.isdir(folder) else []
    with open(out, 'w', encoding='utf-8') as f:
        f.write(f'// Built automatically from the {folder} folder, no need to edit by hand.\n')
        f.write(f'const {var} = [\n' + ''.join('  ' + json.dumps(n) + ',\n' for n in names) + '];\n')
    print(f'{out}: {len(names)} files')

IMG = ('.png', '.jpg', '.jpeg', '.gif', '.webp')
build('slideshow', 'IMAGES', IMG, 'slideshow.js')
build('photos', 'PHOTOS', IMG, 'photos.js')
build('videos', 'VIDEOS', ('.mp4', '.webm', '.mov'), 'videos.js')
