"""Create one portable HTML with local fonts, illustration and libraries."""
from pathlib import Path
import base64
import re

root = Path(__file__).resolve().parent.parent
html = (root / 'index.html').read_text(encoding='utf-8')
css = (root / 'styles.css').read_text(encoding='utf-8')
for weight in [400, 500, 600, 700]:
    font = base64.b64encode((root / 'assets' / f'thai-{weight}.ttf').read_bytes()).decode('ascii')
    css = re.sub(r'''url\((['"]?)assets/thai-''' + str(weight) + r'''\.ttf\1\)''',
                 lambda match: f"url('data:font/ttf;base64,{font}')", css)
# app.js sets the data-URL artwork before the first rendered frame.
css = re.sub(r'''url\((['"]?)assets/reference-temple\.png\1\)''', 'none', css)
assert 'url("assets/' not in css and "url('assets/" not in css
html = html.replace('<link rel="stylesheet" href="styles.css">', '<style>\n' + css + '\n</style>')
scripts = re.findall(r'<script defer src="([^"]+)"></script>', html)
html = re.sub(r'  <script defer src="[^"]+"></script>\n', '', html)
inline = []
for script in scripts:
    text = (root / script).read_text(encoding='utf-8')
    text = re.sub(r'</script', r'<\\/script', text, flags=re.I)
    inline.append('<script>\n' + text + '\n</script>')
html = html.replace('</body>', '\n'.join(inline) + '\n</body>')
dest = root / 'dist' / 'kathin-poster.html'
dest.parent.mkdir(exist_ok=True)
dest.write_text(html, encoding='utf-8')
print(f'Built portable HTML: {dest.name} ({dest.stat().st_size:,} bytes)')
