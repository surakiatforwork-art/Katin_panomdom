const { test, expect } = require("@playwright/test");
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const { pathToFileURL } = require("node:url");
const out = path.resolve("test-results");
fs.mkdirSync(out, { recursive: true });
const paragraphs = JSON.parse(
  execFileSync(
    "python",
    [
      "-c",
      `import zipfile,xml.etree.ElementTree as E,json,pathlib; n={'w':'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}; p=next(pathlib.Path('.').glob('*.docx')); r=E.fromstring(zipfile.ZipFile(p).read('word/document.xml')); print(json.dumps([''.join(t.text or '' for t in p.findall('.//w:t',n)).strip() for p in r.findall('.//w:body//w:p',n)],ensure_ascii=True))`,
    ],
    { encoding: "utf8" },
  ),
);

test("source names, full poster JPG/PNG/PDF downloads and visual layout", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator("#poster li")).toHaveCount(125);
  const rendered = await page.locator("#poster li").evaluateAll((nodes) =>
    nodes.map((n) => ({
      text: n.textContent,
      index: Number(n.dataset.sourceParagraph),
    })),
  );
  for (const entry of rendered)
    expect(entry.text).toBe(paragraphs[entry.index]);
  expect(await page.locator(".group-title").allTextContents()).toEqual([
    paragraphs[169],
    paragraphs[253],
    paragraphs[266],
  ]);
  const clipped = await page
    .locator("#poster li,.group-title,.title-plaque h2,.role-section")
    .evaluateAll((nodes) =>
      nodes
        .filter((n) => n.scrollWidth > n.clientWidth + 2)
        .map((n) => n.textContent),
    );
  expect(clipped).toEqual([]);
  await page.locator("#motion-toggle").click();
  await expect(page.locator("body")).toHaveClass(/still/);
  await page.screenshot({
    path: path.join(out, "desktop.png"),
    fullPage: true,
  });
  await page.locator("#open-export").click();
  for (const format of ["jpg", "png", "pdf"]) {
    await page.locator(`input[value="${format}"]`).check();
    const pending = page.waitForEvent("download");
    await page.locator("#save-export").click();
    const download = await pending;
    await download.saveAs(path.join(out, `poster.${format}`));
    expect(await download.failure()).toBeNull();
    await expect(page.locator("#export-status")).toContainText("สำเร็จ");
    const bytes = fs.readFileSync(path.join(out, `poster.${format}`));
    expect(bytes.length).toBeGreaterThan(100000);
    if (format === "pdf") {
      expect(bytes.subarray(0, 4).toString()).toBe("%PDF");
      const mediaBox = bytes
        .toString("latin1")
        .match(/\/MediaBox\s*\[0 0 ([\d.]+) ([\d.]+)\]/);
      expect(Number(mediaBox[1])).toBeCloseTo((210 * 72) / 25.4, 2);
      expect(Number(mediaBox[2])).toBeCloseTo((297 * 72) / 25.4, 2);
      expect(
        (bytes.toString("latin1").match(/\/Type \/Page\b/g) || []).length,
      ).toBe(1);
    } else {
      const dimensions = await page.evaluate(
        async ({ buffer, type }) => {
          const image = new Image();
          const url = URL.createObjectURL(
            new Blob([new Uint8Array(buffer)], { type }),
          );
          image.src = url;
          await image.decode();
          const dimensions = [image.width, image.height];
          URL.revokeObjectURL(url);
          return dimensions;
        },
        {
          buffer: [...bytes],
          type: format === "png" ? "image/png" : "image/jpeg",
        },
      );
      expect(dimensions[0]).toBe(2400);
      expect(dimensions[1]).toBe(Math.round((2400 * 297) / 210));
    }
  }
  expect(errors).toEqual([]);
});

test("mobile export keeps full poster width and reduced motion preference", async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    deviceScaleFactor: 2,
    reducedMotion: "reduce",
    acceptDownloads: true,
  });
  const page = await context.newPage();
  await page.goto("http://127.0.0.1:8765");
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator("body")).toHaveClass(/still/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    390,
  );
  await page.screenshot({ path: path.join(out, "mobile.png"), fullPage: true });
  await page.locator("#open-export").click();
  await page.locator('input[value="png"]').check();
  const pending = page.waitForEvent("download");
  await page.locator("#save-export").click();
  const download = await pending;
  await download.saveAs(path.join(out, "mobile-export.png"));
  await expect(page.locator("#export-status")).toContainText("สำเร็จ");
  const png = fs.readFileSync(path.join(out, "mobile-export.png"));
  expect(png.readUInt32BE(16)).toBe(2400);
  expect(png.readUInt32BE(20)).toBe(Math.round((2400 * 297) / 210));
  await context.close();
});

for (const entry of ["index.html", "dist/kathin-poster.html"]) {
  test(`double-clicked ${entry} exports offline without a web server`, async ({
    page,
  }) => {
    await page.route("https://**/*", (route) => route.abort());
    await page.route("http://**/*", (route) => route.abort());
    await page.goto(pathToFileURL(path.resolve(entry)).href);
    await page.evaluate(() => document.fonts.ready);
    await expect(page.locator("#poster li")).toHaveCount(125);
    await page.locator("#open-export").click();
    await page.locator("#export-quality").selectOption("1");
    const pending = page.waitForEvent("download");
    await page.locator("#save-export").click();
    const download = await pending;
    await download.saveAs(
      path.join(out, entry === "index.html" ? "offline.jpg" : "standalone.jpg"),
    );
    await expect(page.locator("#export-status")).toContainText("สำเร็จ");
    expect(await download.failure()).toBeNull();
  });
}
