from pathlib import Path
from copy import deepcopy
from hashlib import sha256
import json, zipfile
from lxml import etree as E

root = Path(__file__).resolve().parent.parent
source = root / 'Dowload-ซองผ้าป่า.docx'
out = root / 'output' / 'ซองกฐินสามัคคี_วัดเขาพนมโดมวนาราม.docx'
qa = root / 'test-results' / 'envelope'
qa.mkdir(parents=True, exist_ok=True)
W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'
ns = {'w': W}
def tag(name): return '{'+W+'}'+name
def rewrite(p, text):
    props = deepcopy(p.find('w:pPr', ns))
    first = p.find('w:r', ns)
    rprops = deepcopy(first.find('w:rPr', ns)) if first is not None else None
    for c in list(p): p.remove(c)
    if props is not None: p.append(props)
    run = E.SubElement(p, tag('r'))
    if rprops is not None: run.append(rprops)
    t = E.SubElement(run, tag('t'))
    t.set('{http://www.w3.org/XML/1998/namespace}space', 'preserve')
    t.text = text
    return p

data = json.loads((root/'name.json').read_text(encoding='utf8'))
date = 'วันที่........ เดือน........................ พ.ศ. ........ เวลา........ น.'
monk = '........................................................................'
config = root/'test-results/envelope/event-details.json'
if config.exists():
    details = json.loads(config.read_text(encoding='utf8'))
    date = details.get('date', date)
    monk = details.get('monk', monk)
with zipfile.ZipFile(source) as z:
    raw = z.read('word/document.xml')
    tree = E.fromstring(raw)
    body = tree.find('w:body', ns)
    original = [deepcopy(p) for p in body]
    boxes = tree.findall('.//w:txbxContent', ns)
    title = 'ขอเรียนเชิญท่านผู้มีจิตศรัทธาร่วมเป็นเจ้าภาพทอดกฐินสามัคคี'
    envelope = [title, 'ณ วัดเขาพนมโดมวนาราม',
                'ตำบลวัดตะแบก อำเภอเทพสถิต จังหวัดชัยภูมิ', date]
    for box in boxes[:2]:
        paragraphs = box.findall('w:p',ns)
        for p, text in zip(paragraphs[:4], envelope): rewrite(p, text)
        rewrite(paragraphs[8], 'ความเจริญด้วย อายุ วรรณะ สุขะ พละ มีความมั่นคงในชีวิต เจริญก้าวหน้าในหน้าที่การงาน เทอญ')
    envelope_p = deepcopy(body[0])
    list_templates = [deepcopy(p) for p in boxes[6].findall('w:p',ns)]
    items = []
    for g in data['groups']:
        items.append(('group', g['title']))
        for s in g['sections']:
            items.append(('role',s['title']))
            items.extend(('name', e['text']) for e in s['entries'])
    pages = []
    current = []
    capacity = 22
    used = 0
    for role, text in items:
        cost = 2 if len(text)>72 else 1
        if used + cost > capacity or (role != 'name' and used >= capacity-2):
            pages.append(current)
            current, used = [], 0
            capacity = 28
        current.append((role,text)); used += cost
    if current: pages.append(current)
    for c in list(body): body.remove(c)
    body.append(envelope_p)
    body.append(original[1]); body.append(original[2])
    for i, entries in enumerate(pages):
        if i:
            p=E.SubElement(body,tag('p')); run=E.SubElement(p,tag('r'))
            E.SubElement(run,tag('br')).set(tag('type'),'page')
        border=deepcopy(original[3]); content=deepcopy(original[4])
        for box in content.findall('.//w:txbxContent',ns):
            for c in list(box): box.remove(c)
            if i==0:
                for template, text in [(0,title),(1,date),(2,'ณ วัดเขาพนมโดมวนาราม'),(3,'ประธานฝ่ายสงฆ์'),(4,monk)]:
                    box.append(rewrite(deepcopy(list_templates[template]),text))
            else:
                box.append(rewrite(deepcopy(list_templates[1]),f'รายชื่อผู้ร่วมทำบุญกฐินสามัคคี วัดเขาพนมโดมวนาราม หน้า {i+1}'))
            for role,text in entries:
                p=rewrite(deepcopy(list_templates[8]),text)
                if role!='name':
                    for prop in p.findall('.//w:rPr',ns):
                        E.SubElement(prop,tag('b'))
                        E.SubElement(prop,tag('bCs'))
                box.append(p)
        body.append(border); body.append(content)
    body.append(original[-1])
    serial=100
    for element in tree.iter():
        local=E.QName(element).localname
        if local in ('docPr','cNvPr'):
            serial+=1; element.set('id',str(serial))
        if local=='shape':
            serial+=1; element.set('id',f'KathinShape{serial}')
            spid='{urn:schemas-microsoft-com:office:office}spid'
            if spid in element.attrib: element.set(spid,f'_x0000_s{serial+2000}')
    contract = f'''Reference {source}\nSHA256 {sha256(source.read_bytes()).hexdigest()}\nReference pages 3 sections 2\nEnvelope 225.4 by 98.4 mm landscape margins 5.0 mm\nList A4 portrait margins 5.0 mm\nPreserve PSL Malinee blue 000D9E typography, corner images, donor fields and blessings\nEditable slots document.xml textboxes including DrawingML and VML fallback\nReplace old event title, location, date, purpose and all old donor lists\nExtend reference list page pattern for all 126 names, no font shrinking\nRetain every package part except document.xml byte for byte\nDate and monk blank pending user details\n'''
    (qa/'artifact.md').write_text(contract,encoding='utf8')
    with zipfile.ZipFile(out,'w',zipfile.ZIP_DEFLATED) as dest:
        for info in z.infolist():
            dest.writestr(info,E.tostring(tree,xml_declaration=True,encoding='UTF-8',standalone=True) if info.filename=='word/document.xml' else z.read(info.filename))
with zipfile.ZipFile(source) as a, zipfile.ZipFile(out) as b:
    assert all(a.read(n)==b.read(n) for n in a.namelist() if n!='word/document.xml')
assert 'ผ้าป่า' not in ''.join(tree.xpath('//w:t/text()',namespaces=ns))
expected=[e['text'] for g in data['groups'] for s in g['sections'] for e in s['entries']]
actual=[]
for box in tree.findall('.//w:txbxContent',ns)[4::2]:
    for p in box.findall('w:p',ns):
        text=''.join(p.xpath('.//w:t/text()',namespaces=ns))
        if text[:1].isdigit(): actual.append(text)
assert actual==expected, (len(actual),len(expected))
print('Created envelope and',len(pages),'list pages with 126 entries.')
