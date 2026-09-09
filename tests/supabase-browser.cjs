// Connected-mode UI test with a persistent in-process database fixture.
// SDK request mapping and real PostgreSQL SQL/RLS are verified in separate tests.
const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const seed = require("../lib/seed.json");
const baseURL = process.env.TEST_BASE_URL || "http://127.0.0.1:3000";
(async () => {
  const browser = await chromium.launch({ args: ["--no-sandbox"] });
  try {
    const data = structuredClone(seed),
      replies = [];
    let failReply = false,
      failRead = false;
    const attempts = [];
    async function connect(page) {
      await page.route("**/api/demo*", async (route) => {
        const req = route.request(),
          url = new URL(req.url());
        let result;
        if (req.method() === "GET") {
          if (failRead)
            return route.fulfill({
              status: 503,
              json: { error: "Unavailable" },
            });
          result = url.searchParams.has("conversation")
            ? {
                replies: replies.filter(
                  (r) => r.reply_to === url.searchParams.get("conversation"),
                ),
              }
            : { mode: "supabase", data };
        } else {
          const body = req.postDataJSON();
          attempts.push(body);
          if (body.action === "reply") {
            if (failReply)
              return route.fulfill({
                status: 503,
                json: { error: "private diagnostic" },
              });
            const parent = data.messages.find(
              (m) => m.id === body.conversationId,
            );
            result = {
              ...parent,
              id: body.id,
              content: body.content,
              direction: "outgoing",
              reply_to: body.conversationId,
              created_at: new Date().toISOString(),
            };
            replies.push(result);
          } else throw new Error("Unexpected action " + body.action);
        }
        await route.fulfill({ status: 200, json: result });
      });
      await page.goto(baseURL);
      await page.getByRole("button", { name: "Skip", exact: true }).click();
      await page.waitForSelector("tbody tr");
    }
    const page = await browser.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await connect(page);
    assert.equal(await page.locator("tbody tr").count(), 12);
    await page.getByText("Connected workspace", { exact: true }).waitFor();
    await page.locator("tbody .tenant-message").first().click();
    for (const content of [
      "First shared demo reply",
      "Second shared demo reply",
    ]) {
      await page
        .getByRole("textbox", { name: "Reply", exact: true })
        .fill(content);
      await page.getByRole("button", { name: "Send", exact: true }).click();
      await page.locator(".outgoing").filter({ hasText: content }).waitFor();
    }
    assert.equal(replies.length, 2);
    assert.equal(
      await page.evaluate(
        () =>
          Object.keys(localStorage).filter((k) =>
            k.startsWith("haven-demo-replies"),
          ).length,
      ),
      0,
    );
    await page.reload();
    await page.waitForSelector("tbody tr");
    await page.locator("tbody .tenant-message").first().click();
    await page.waitForFunction(
      () =>
        document.querySelectorAll(".conversation-bubble.outgoing").length === 2,
    );
    await page.getByRole("button", { name: "Close dialog" }).click();
    await page.locator("tbody .tenant-message").nth(1).click();
    assert.equal(
      await page.locator(".conversation-bubble.outgoing").count(),
      0,
    );
    failReply = true;
    await page
      .getByRole("textbox", { name: "Reply", exact: true })
      .fill("Retain this reply");
    await page.getByRole("button", { name: "Send", exact: true }).click();
    await page
      .locator(".reply-feedback")
      .filter({ hasText: "try again" })
      .waitFor();
    assert.equal(
      await page
        .getByRole("textbox", { name: "Reply", exact: true })
        .inputValue(),
      "Retain this reply",
    );
    failReply = false;
    await page.getByRole("button", { name: "Send", exact: true }).click();
    await page
      .locator(".outgoing")
      .filter({ hasText: "Retain this reply" })
      .waitFor();
    assert.equal(attempts.at(-1).id, attempts.at(-2).id);
    const second = await browser.newPage();
    await connect(second);
    await second.locator("tbody .tenant-message").first().click();
    await second.waitForFunction(
      () =>
        document.querySelectorAll(".conversation-bubble.outgoing").length === 2,
    );
    await page.setViewportSize({ width: 390, height: 844 });
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      true,
    );
    failRead = true;
    await page.reload();
    await page
      .getByRole("alert")
      .filter({ hasText: "could not be loaded" })
      .waitFor();
    assert.equal(
      await page
        .getByRole("button", { name: "New message", exact: true })
        .isDisabled(),
      true,
    );
    assert.equal(await page.locator("tbody tr").count(), 0);
    failRead = false;
    await page
      .getByRole("button", { name: "Retry loading", exact: true })
      .click();
    await page.waitForSelector("tbody tr");
    assert.deepEqual(errors, []);
    console.log(
      "PASS: connected seeds, shared replies across reload and browser contexts, isolation, retry IDs, no local writes, database error recovery, mobile.",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
