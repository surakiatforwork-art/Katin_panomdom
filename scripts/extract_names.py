"""Generate JSON and browser data from the organized Word document."""
from pathlib import Path
import json, re, zipfile
import xml.etree.ElementTree as ET
ROOT = Path(__file__).resolve().parent.parent
source = ROOT / 'output' / 'รายชื่อกฐินสามัคคี_ฉบับจัดระเบียบ.docx'
ns = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
with zipfile.ZipFile(source) as archive:
    xml = ET.fromstring(archive.read('word/document.xml'))
groups = []
for index, paragraph in enumerate(xml.findall('.//w:body//w:p', ns)):
    text = ''.join(t.text or '' for t in paragraph.findall('.//w:t', ns)).strip()
    if not text:
        continue
    if text.startswith('สาย'):
        groups.append({'title': text, 'sections': []})
    elif text in ('ประธานอุปถัมภ์', 'ประธาน', 'รองประธาน', 'กรรมการ'):
        groups[-1]['sections'].append({'title': text, 'entries': []})
    elif re.match(r'^\d+\.', text):
        text = re.sub(r'^(\d+\.)\s*', r'\1', text)
        groups[-1]['sections'][-1]['entries'].append({'text': text, 'sourceParagraph': index})
assert [[len(s['entries']) for s in g['sections']] for g in groups] == [[1,25,34,20],[2,2,5],[4,3,30]]
data = {'title': 'รายชื่อผู้ร่วมทำบุญกฐินสามัคคี ณ วัดเขาพนมโดมวนาราม', 'source': source.relative_to(ROOT).as_posix(), 'groups': groups}
payload = json.dumps(data, ensure_ascii=False, indent=2)
(ROOT / 'name.json').write_text(payload + '\n', encoding='utf-8')
(ROOT / 'names.js').write_text('/* Generated from organized Word and name.json. */\nwindow.KATHIN_DATA = ' + payload + ';\n', encoding='utf-8')
print('Generated name.json and names.js with 126 entries from organized Word.')
