"""Read the authoritative, complete copy of each group in the supplied DOCX.

The document contains three pasted copies of the groups. Paragraphs 169–306
contain one complete main group and the first complete two smaller groups.
Do not deduplicate individual names: a name may occur in a heading and a list.
Only outer paragraph whitespace is removed; spelling/internal spaces are kept.
"""
from pathlib import Path
import json
import re
import zipfile
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parent.parent
source = next(p for p in ROOT.glob('*.docx') if not p.name.startswith('~$'))
ns = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
with zipfile.ZipFile(source) as archive:
    xml = ET.fromstring(archive.read('word/document.xml'))
lines = [''.join(t.text or '' for t in p.findall('.//w:t', ns))
         for p in xml.findall('.//w:body//w:p', ns)]
groups = []
for start, end in [(169, 253), (253, 266), (266, 307)]:
    group = {'title': lines[start].strip(), 'sections': []}
    for index in range(start + 1, end):
        text = lines[index].strip()
        if not text:
            continue
        if re.match(r'^\d+\.', text):
            for entry in re.split(r'\s+(?=\d+\.)', text):
                group['sections'][-1]['entries'].append({'text': entry, 'sourceParagraph': index})
        else:
            group['sections'].append({'title': text, 'entries': []})
    groups.append(group)
committee = groups[0]['sections'][3]['entries']
addition = '20.สท.รุ่งอรุณ หายโศก และครอบครัว'
if not any(entry['text'] == addition for entry in committee):
    committee.append({'text': addition, 'sourceNote': 'Added by user request'})
assert [[len(s['entries']) for s in g['sections']] for g in groups] == [[1, 25, 34, 20], [2, 2, 5], [4, 3, 30]]
# Corrections already approved in the repository, retained on regeneration.
corrections = {'เข็มกกลัด': 'เข็มกลัด', 'คุณอารียื': 'คุณอารีย์',
               'คุณหมุยยง แช่ภู่': 'คุณหมุยยง แซ่ภู่', 'คุณาญจนา': 'คุณกาญจนา'}
for group in groups:
    for section in group['sections']:
        for entry in section['entries']:
            for before, after in corrections.items():
                entry['text'] = entry['text'].replace(before, after)
data = {'title': lines[0].strip(), 'source': source.name, 'groups': groups}
output = ROOT / 'names.js'
output.write_text('/* Generated from the supplied DOCX; do not correct names here. */\nwindow.KATHIN_DATA = ' + json.dumps(data, ensure_ascii=False, indent=2) + ';\n', encoding='utf-8')
print('Generated 126 entries in 3 groups, including the requested committee addition.')
