"""Scale poster layout dimensions without a transformed compositor surface."""
from pathlib import Path
import re

root = Path(__file__).resolve().parent.parent
css = (root / 'styles.css').read_text(encoding='utf-8')
main = css[css.index('.poster {'):css.index('.sparkles {')]
extra = css[css.rindex('.temple-location {'):css.index('.intro-rule span {')]
rules = []
for selector, declarations in re.findall(r'([^{}]+)\{([^{}]*)\}', main + extra):
    selector = ', '.join('body.touch-layout ' + part.strip() for part in selector.strip().split(','))
    declarations = re.sub(r'(-?\d+(?:\.\d+)?)px\b', r'calc(\1px * var(--poster-scale))', declarations)
    rules.append(selector + ' {' + declarations + '}')
rules.append('''
body.touch-layout .stage { perspective:none; }
body.touch-layout .poster-sizer { transform:none!important; transform-style:flat; transition:none; }
body.touch-layout .poster { transform:none!important; transform-origin:initial; isolation:auto; overflow:visible; }
body.touch-layout .poster-header { overflow:visible; }
body.touch-layout .lotus-3d, body.touch-layout .frame-glint { display:none; }
body.touch-layout .floating-petals { perspective:none; }
''')
(root / 'mobile.css').write_text('/* Generated native mobile poster layout; no scale transform. */\n' + '\n'.join(rules), encoding='utf-8')
