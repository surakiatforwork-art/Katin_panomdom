const {test,expect} = require('@playwright/test');
const fs = require('node:fs');
const vm = require('node:vm');
const snapshot = JSON.parse(fs.readFileSync('name.json','utf8'));
const endpoint = 'https://script.google.com/macros/s/test_endpoint/exec';

test('API filters hidden names, sorts within roles, renumbers and rejects invalid rows', () => {
  const context = vm.createContext({});
  vm.runInContext(fs.readFileSync('apps-script/Code.gs','utf8'),context);
  const group = snapshot.groups[0].title;
  const rows = [
    [group,'กรรมการ',8,'ชื่อหลัง',true,'private note'],
    [group,'กรรมการ',2,'ชื่อก่อน',true],
    [group,'กรรมการ',1,'ชื่อซ่อน',false],
    ['','','','',true],
  ];
  const result = JSON.parse(JSON.stringify(context.buildPosterData(rows)));
  expect(result.count).toBe(2);
  expect(result.groups[0].sections[3].entries.map(e=>e.text)).toEqual(['1.ชื่อก่อน','2.ชื่อหลัง']);
  expect(JSON.stringify(result)).not.toContain('private note');
  expect(()=>context.buildPosterData([['สายผิด','กรรมการ',1,'ชื่อ',true]])).toThrow(/แถว 2/);
});

test('web refresh replaces names and retains latest data if API fails', async ({page}) => {
  let payload;
  await page.route('**/data-config.js',route=>route.fulfill({contentType:'text/javascript',body:'window.KATHIN_CONFIG='+JSON.stringify({apiUrl:endpoint})+';'}));
  await page.route(endpoint+'?**',route => {
    const callback = new URL(route.request().url()).searchParams.get('callback');
    return route.fulfill({contentType:'text/javascript',body:callback+'('+JSON.stringify(payload)+');'});
  });
  const data = structuredClone(snapshot);
  data.groups[0].sections[3].entries.push({text:'21.ชื่อเพิ่มจากชีท'});
  payload = {ok:true,data};
  await page.goto('/');
  await expect(page.locator('#data-status')).toContainText('รายชื่อจากชีท');
  await expect(page.getByText('ชื่อเพิ่มจากชีท',{exact:true})).toBeVisible();
  data.groups[0].sections[3].entries.pop();
  data.groups[0].sections[1].entries[0].text='1.ชื่อแก้จากชีท';
  await page.locator('#refresh-names').click();
  await expect(page.getByText('ชื่อเพิ่มจากชีท',{exact:true})).toHaveCount(0);
  await expect(page.getByText('ชื่อแก้จากชีท',{exact:true})).toBeVisible();
  payload={ok:false,error:'แถว 2: ลำดับไม่ถูกต้อง'};
  await page.locator('#refresh-names').click();
  await expect(page.locator('#data-status')).toContainText('คงรายชื่อที่โหลดล่าสุด');
  await expect(page.getByText('ชื่อแก้จากชีท',{exact:true})).toBeVisible();
});
