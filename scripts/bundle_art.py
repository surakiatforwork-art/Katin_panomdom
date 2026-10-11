"""Bundle the supplied illustration as a data URL for offline canvas export."""
from pathlib import Path
import base64

root = Path(__file__).resolve().parent.parent
image = root / 'Thai Kathin Temple Donation Poster.png'
encoded = base64.b64encode(image.read_bytes()).decode('ascii')
footer = base64.b64encode((root / 'assets' / 'footer-lotus.png').read_bytes()).decode('ascii')
(root / 'assets' / 'poster-art.js').write_text(
    '/* Supplied reference art, bundled for offline canvas export. */\n'
    'window.KATHIN_ART = "data:image/png;base64,' + encoded + '";\n'
    'window.KATHIN_FOOTER_ART = "data:image/png;base64,' + footer + '";\n', encoding='utf-8')
print('Bundled reference illustration for offline export.')
