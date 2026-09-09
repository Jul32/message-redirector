const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const baseURL = process.env.TEST_BASE_URL || "http://127.0.0.1:3000";

(async () => {
  const browser = await chromium.launch({ args: ["--no-sandbox"] });
  try {
    const context = await browser.newContext();
    const page = await context.newPage();
    const errors = [],
      requests = [],
      external = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await context.addInitScript(() => {
      window.demoOpenCalls = 0;
      window.open = () => {
        window.demoOpenCalls++;
        return null;
      };
    });
    await context.route("**/*", (route) => {
      if (new URL(route.request().url()).origin !== new URL(baseURL).origin) {
        external.push(route.request().url());
        return route.abort();
      }
      return route.continue();
    });
    await page.goto(baseURL);
    await page
      .getByRole("dialog", { name: "A quick guide to Local Haven" })
      .waitFor();
    await page.getByRole("button", { name: "Skip", exact: true }).click();
    await page.waitForSelector("tbody tr");
    const openFirst = async () => {
      await page.locator("tbody .tenant-message").first().click();
      await page.waitForFunction(() => {
        const composer = document.querySelector("#demo-reply");
        return composer && !composer.disabled;
      });
    };
    const close = () =>
      page.getByRole("button", { name: "Close dialog" }).click();
    await openFirst();
    assert.equal(
      await page.locator(".conversation-bubble.incoming").count(),
      1,
    );
    assert.equal(
      await page.locator(".conversation-bubble.outgoing").count(),
      0,
    );
    assert.equal(
      await page
        .getByRole("button", { name: "Send", exact: true })
        .isDisabled(),
      true,
    );
    await page.getByLabel("Reply", { exact: true }).fill("   ");
    assert.equal(
      await page
        .getByRole("button", { name: "Send", exact: true })
        .isDisabled(),
      true,
    );
    page.on("request", (r) => requests.push(r.url()));
    for (const text of [
      "We can visit tomorrow morning.",
      "Please confirm that 10 AM works.",
      "Demo only — thank you!",
    ]) {
      await page.getByLabel("Reply", { exact: true }).fill(text);
      await page.getByRole("button", { name: "Send", exact: true }).click();
      await page
        .locator(".conversation-bubble.outgoing")
        .filter({ hasText: text })
        .waitFor();
      assert.equal(
        await page.getByLabel("Reply", { exact: true }).inputValue(),
        "",
      );
    }
    assert.equal(
      await page.locator(".conversation-bubble.outgoing").count(),
      3,
    );
    assert.equal(
      await page
        .locator(".conversation-bubble.outgoing time[datetime]")
        .count(),
      3,
    );
    assert.match(
      await page.locator(".conversation-bubble.outgoing").first().innerText(),
      /Outgoing/,
    );
    await page
      .getByRole("button", { name: "Open in original app", exact: true })
      .click();
    await page
      .getByText("External messaging integration coming soon.", { exact: true })
      .waitFor();
    assert.equal(page.url(), baseURL + "/");
    assert.equal(context.pages().length, 1);
    assert.equal(await page.evaluate(() => window.demoOpenCalls), 0);
    assert.deepEqual(
      requests,
      [],
      "Sending and the original-app placeholder must not issue any requests",
    );
    assert.deepEqual(external, []);
    await close();
    // A separate tenant and a separate message from the same tenant remain isolated.
    await page.locator("tbody .tenant-message").nth(1).click();
    assert.equal(
      await page.locator(".conversation-bubble.outgoing").count(),
      0,
    );
    await page
      .getByLabel("Reply", { exact: true })
      .fill("Reply only for Phoenix.");
    await page.getByRole("button", { name: "Send", exact: true }).click();
    await close();
    await page
      .locator("tbody .tenant-message")
      .filter({ hasText: "Olivia Rhye" })
      .nth(1)
      .click();
    assert.equal(
      await page.locator(".conversation-bubble.outgoing").count(),
      0,
    );
    await close();
    await openFirst();
    assert.equal(
      await page.locator(".conversation-bubble.outgoing").count(),
      3,
    );
    await page.getByRole("button", { name: "Mark as resolved" }).click();
    await page.getByRole("button", { name: "Reopen message" }).click();
    assert.equal(
      await page.locator(".conversation-bubble.outgoing").count(),
      3,
    );
    await page.reload();
    await page.waitForSelector("tbody tr");
    await openFirst();
    await page.waitForFunction(
      () =>
        document.querySelectorAll(".conversation-bubble.outgoing").length === 3,
    );
    await close();
    await page.locator("tbody .tenant-message").nth(1).click();
    await page
      .locator(".conversation-bubble.outgoing")
      .filter({ hasText: "Reply only for Phoenix." })
      .waitFor();
    await page.setViewportSize({ width: 390, height: 844 });
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      true,
    );
    assert.deepEqual(errors, []);
    // Denied storage must still support several replies and reopening in this tab.
    const blocked = await browser.newContext();
    await blocked.addInitScript(() =>
      Object.defineProperty(window, "localStorage", {
        get() {
          throw new Error("Blocked");
        },
      }),
    );
    const p = await blocked.newPage();
    await p.goto(baseURL);
    await p
      .getByRole("dialog", { name: "A quick guide to Local Haven" })
      .waitFor();
    await p.getByRole("button", { name: "Skip", exact: true }).click();
    await p.waitForSelector("tbody tr");
    await p.locator("tbody .tenant-message").first().click();
    for (const text of ["Local one", "Local two"]) {
      await p.getByLabel("Reply", { exact: true }).fill(text);
      await p.getByRole("button", { name: "Send", exact: true }).click();
    }
    assert.equal(await p.locator(".conversation-bubble.outgoing").count(), 2);
    assert.match(
      await p.locator(".reply-composer .storage-notice").innerText(),
      /lost on reload/,
    );
    await p.getByRole("button", { name: "Close dialog" }).click();
    await p.locator("tbody .tenant-message").first().click();
    await p.waitForFunction(
      () =>
        document.querySelectorAll(".conversation-bubble.outgoing").length === 2,
    );
    await blocked.close();
    console.log(
      "PASS: multiple local replies, timestamps/direction, conversation isolation, reload persistence, status preservation, mobile, denied storage, and zero network calls/external opens from demo actions.",
    );
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
