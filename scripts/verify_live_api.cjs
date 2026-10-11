/* Manual end-to-end check against the real API, outside the deterministic tests. */
const {chromium,expect} = require('@playwright/test');
const {pathToFileURL} = require('node:url');
const path = require('node:path');
const fs = require('node:fs');
(async () => {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({viewport:{width:1440,height:1000}});
    const errors = [];
    page.on('pageerror',e=>errors.push(e.message));
    await page.goto(process.argv[2] || pathToFileURL(path.resolve('dist/kathin-poster.html')).href);
    await expect(page.locator('#data-status')).toContainText('รายชื่อจากชีท',{timeout:30000});
    const data = await page.evaluate(()=>window.KATHIN_DATA);
    const expected = data.groups.flatMap(g=>g.sections.flatMap(s=>s.entries.map(e=>e.text)));
    expect(await page.locator('#poster li').allTextContents()).toEqual(expected);
    expect(expected.length).toBe(data.count);
    expect(errors).toEqual([]);
    await page.locator('#refresh-names').click();
    await expect(page.locator('#refresh-names')).toBeDisabled();
    await expect(page.locator('#refresh-names')).toBeEnabled({timeout:30000});
    await expect(page.locator('#data-status')).toContainText('รายชื่อจากชีท',{timeout:30000});
    await page.evaluate(()=>document.fonts.ready);
    fs.mkdirSync('test-results',{recursive:true});
    await page.screenshot({path:'test-results/live-api-connected.png',fullPage:false});
    console.log(JSON.stringify({liveApi:true,renderedNames:expected.length,refresh:true,pageErrors:errors}));
  } finally {
    await browser.close();
  }
})().catch(error=>{console.error(error);process.exitCode=1;});
