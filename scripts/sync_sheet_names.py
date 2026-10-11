"""Build a fresh Sheet snapshot; retain the last snapshot if Google is unavailable."""
import json
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
config = json.loads((ROOT / 'data-config.json').read_text(encoding='utf-8'))
snapshot = json.loads((ROOT / 'name.json').read_text(encoding='utf-8'))
if config.get('apiUrl'):
    try:
        with urllib.request.urlopen(config['apiUrl'], timeout=30) as response:
            payload = json.load(response)
        if not payload.get('ok'):
            raise ValueError(payload.get('error', 'API failed'))
        data = payload['data']
        assert [g['title'] for g in data['groups']] == [g['title'] for g in snapshot['groups']], 'Group headings changed'
        for group, old in zip(data['groups'], snapshot['groups']):
            assert [s['title'] for s in group['sections']] == [s['title'] for s in old['sections']], 'Roles changed'
            for section in group['sections']:
                for index, entry in enumerate(section['entries']):
                    assert isinstance(entry['text'], str) and entry['text'].startswith(str(index+1)+'.'), 'Invalid name numbering'
        snapshot = data
        (ROOT / 'name.json').write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
        print('Updated poster snapshot from Google Sheets.')
    except Exception as error:
        print(f'Sheet API unavailable; retaining the last saved snapshot: {error}')
else:
    print('API not configured; using saved snapshot.')
(ROOT / 'names.js').write_text('/* Saved snapshot; live-data.js reads Google Sheets on opening. */\nwindow.KATHIN_DATA = '+json.dumps(snapshot,ensure_ascii=False,indent=2)+';\n',encoding='utf-8')
(ROOT / 'data-config.js').write_text('window.KATHIN_CONFIG = '+json.dumps(config,ensure_ascii=False,indent=2)+';\n',encoding='utf-8')
