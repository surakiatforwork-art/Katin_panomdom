const { test, expect } = require("@playwright/test");
const { pathToFileURL } = require("node:url");
const path = require("node:path");

test("pointer fountain works without WebGL, and motion toggle stops them", async ({
  page,
}) => {
  await page.goto(pathToFileURL(path.resolve("dist/index.html")).href);
  await expect(page.locator("#ceremony-scene,.offering-canvas")).toHaveCount(0);
  expect(await page.evaluate(() => typeof window.THREE)).toBe("undefined");
  await page.mouse.move(350, 380);
  await page.mouse.down();
  await page.mouse.up();
  await expect
    .poll(() =>
      page.locator("#pointer-sparkles").evaluate((c) => {
        const pixels = c
          .getContext("2d")
          .getImageData(0, 0, c.width, c.height).data;
        for (let i = 3; i < pixels.length; i += 4) if (pixels[i]) return true;
        return false;
      }),
    )
    .toBe(true);
  await page.screenshot({ path: "test-results/effects-live.png" });
  await page.locator("#motion-toggle").click();
  await expect(page.locator("#pointer-sparkles")).toBeHidden();
  await expect(page.locator(".floating-petals")).toBeHidden();
  await expect(page.locator("#poster .live-decoration")).toHaveCount(3);
});

test("touch creates upward sparkles without blocking mobile scrolling", async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  await page.goto(pathToFileURL(path.resolve("dist/index.html")).href);
  await page.evaluate(() => document.fonts.ready);
  await page.touchscreen.tap(180, 250);
  await expect
    .poll(() => page.locator(".touch-spark").count())
    .toBeGreaterThan(0);
  await expect(page.locator("#pointer-sparkles")).toHaveCount(0);
  expect(
    await page
      .locator(".touch-spark")
      .first()
      .evaluate((c) => getComputedStyle(c).pointerEvents),
  ).toBe("none");
  await page.evaluate(() => window.scrollTo(0, 450));
  await expect
    .poll(() => page.evaluate(() => window.scrollY))
    .toBeGreaterThan(300);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    390,
  );
  await context.close();
});
