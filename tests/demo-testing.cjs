const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const baseURL = process.env.TEST_BASE_URL || "http://127.0.0.1:3000";
const guideTitle = "A quick guide to Local Haven";

(async () => {
  const browser = await chromium.launch({ args: ["--no-sandbox"] });
  try {
    const page = await browser.newPage();
    const errors = [];
    const records = [];
    let release;
    const firstResponse = new Promise((resolve) => {
      release = resolve;
    });
    await page.route("**/api/feedback", async (route) => {
      records.push(route.request().postDataJSON());
      if (records.length === 1) await firstResponse;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, saved: true, emailSent: true }),
      });
    });
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(baseURL);
    await page.getByRole("dialog", { name: guideTitle }).waitFor();
    await page
      .getByRole("heading", { name: "All tenant communication in one inbox" })
      .waitFor();
    assert.equal(
      await page
        .getByRole("button", { name: "Back", exact: true })
        .isDisabled(),
      true,
    );
    await page.getByRole("button", { name: "Next", exact: true }).click();
    await page
      .getByRole("heading", { name: "Stay organized automatically" })
      .waitFor();
    await page.getByRole("button", { name: "Back", exact: true }).click();
    await page
      .getByRole("heading", { name: "All tenant communication in one inbox" })
      .waitFor();
    await page.getByRole("button", { name: "Next", exact: true }).click();
    await page.getByRole("button", { name: "Next", exact: true }).click();
    await page
      .getByRole("heading", { name: "Reply without leaving Local Haven" })
      .waitFor();
    await page
      .getByRole("button", { name: "Explore demo", exact: true })
      .click();
    assert.equal(
      await page.evaluate(() => localStorage.getItem("haven-demo-guide-v1")),
      "seen",
    );
    await page.reload();
    await page.waitForSelector("tbody tr");
    assert.equal(await page.getByRole("dialog").count(), 0);
    await page
      .getByRole("button", { name: "View demo guide", exact: true })
      .click();
    await page
      .getByRole("heading", { name: "All tenant communication in one inbox" })
      .waitFor();
    await page.getByRole("button", { name: "Skip", exact: true }).click();
    await page
      .getByRole("button", { name: "Give feedback", exact: true })
      .click();
    await page.getByRole("button", { name: "Submit", exact: true }).click();
    assert.equal(await page.locator(".feedback-success").count(), 0);
    await page.getByLabel("What did you like?").fill("The unified inbox");
    await page.getByLabel("What was confusing?").fill("Nothing yet");
    await page
      .getByLabel("What feels missing?")
      .fill("Real integrations later");
    await page.getByRole("radio", { name: "Maybe", exact: true }).check();
    // Dispatch twice in the same event turn, before React can replace the form.
    await page.locator(".feedback-form").evaluate((form) => {
      form.requestSubmit();
      form.requestSubmit();
    });
    await page.getByRole("button", { name: "Sending…", exact: true }).waitFor();
    assert.equal(
      await page
        .getByRole("button", { name: "Sending…", exact: true })
        .isDisabled(),
      true,
    );
    await page.keyboard.press("Escape");
    assert.equal(
      await page
        .getByRole("dialog", { name: "Give feedback", exact: true })
        .count(),
      1,
    );
    release();
    await page
      .getByText("Thank you for your feedback.", { exact: true })
      .waitFor();
    assert.equal(records.length, 1);
    assert.equal(records[0].wouldUse, "Maybe");
    assert.equal(records[0].liked, "The unified inbox");
    assert.equal(records[0].name, undefined);
    assert.equal(records[0].email, undefined);
    await page.getByRole("button", { name: "Done", exact: true }).click();
    await page.reload();
    await page.waitForSelector("tbody tr");
    assert.equal(
      await page.evaluate(
        () =>
          Object.keys(localStorage).filter((k) =>
            k.startsWith("haven-demo-feedback-v1:"),
          ).length,
      ),
      0,
    );
    await page.setViewportSize({ width: 390, height: 844 });
    await page
      .getByRole("button", { name: "Give feedback", exact: true })
      .click();
    await page.getByRole("radio", { name: "Yes", exact: true }).check();
    await page.getByLabel("Name (optional)").fill("Demo Tester");
    await page.getByLabel("Email (optional)").fill("tester@example.com");
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      true,
    );
    await page.getByRole("button", { name: "Submit", exact: true }).click();
    await page.getByRole("button", { name: "Done", exact: true }).click();
    assert.equal(records.length, 2);
    assert.ok(
      records.some(
        (r) => r.email === "tester@example.com" && r.wouldUse === "Yes",
      ),
    );
    await page
      .getByRole("button", { name: "View demo guide", exact: true })
      .click();
    await page.keyboard.press("Escape");
    await page.getByRole("dialog").waitFor({ state: "hidden" });
    assert.deepEqual(errors, []);
    // First-visit skip is remembered independently of finishing the guide.
    const fresh = await browser.newPage({
      viewport: { width: 390, height: 844 },
    });
    await fresh.goto(baseURL);
    await fresh.getByRole("button", { name: "Skip", exact: true }).click();
    await fresh.reload();
    await fresh.waitForSelector("tbody tr");
    assert.equal(await fresh.getByRole("dialog").count(), 0);
    await fresh
      .getByRole("button", { name: "Give feedback", exact: true })
      .click();
    await fresh.getByRole("button", { name: "Cancel", exact: true }).click();
    assert.equal(await fresh.getByRole("dialog").count(), 0);
    // Server failure retains answers, retries reuse their ID, and feedback does not need localStorage.
    const blocked = await browser.newContext();
    await blocked.addInitScript(() => {
      window.failWrites = true;
      const original = Storage.prototype.setItem;
      Storage.prototype.setItem = function (...args) {
        if (window.failWrites) throw new Error("Blocked storage");
        return original.apply(this, args);
      };
    });
    const p = await blocked.newPage();
    const attempts = [];
    await p.route("**/api/feedback", async (route) => {
      attempts.push(route.request().postDataJSON());
      await route.fulfill({
        status: attempts.length === 1 ? 502 : 200,
        contentType: "application/json",
        body: JSON.stringify(
          attempts.length === 1
            ? {
                error:
                  "Your feedback could not be saved. Your answers have been kept. Please try again later.",
                code: "FEEDBACK_SAVE_FAILED",
              }
            : { success: true, saved: true, emailSent: true },
        ),
      });
    });
    await p.goto(baseURL);
    await p.getByRole("button", { name: "Skip", exact: true }).click();
    await p
      .getByText("Guide dismissed for this visit.", { exact: false })
      .waitFor();
    await p.getByRole("button", { name: "Give feedback", exact: true }).click();
    await p.getByLabel("What did you like?").fill("Keep this draft");
    await p.getByRole("radio", { name: "No", exact: true }).check();
    await p.getByRole("button", { name: "Submit", exact: true }).click();
    await p
      .getByRole("alert")
      .filter({ hasText: "could not be saved" })
      .waitFor();
    assert.equal(
      await p.getByLabel("What did you like?").inputValue(),
      "Keep this draft",
    );
    assert.equal(await p.locator(".feedback-success").count(), 0);
    assert.equal(await p.getByText("Private provider diagnostic").count(), 0);
    await p.getByRole("button", { name: "Submit", exact: true }).click();
    await p
      .getByText("Thank you for your feedback.", { exact: true })
      .waitFor();
    assert.equal(
      await p.evaluate(
        () =>
          Object.keys(localStorage).filter((k) =>
            k.startsWith("haven-demo-feedback-v1:"),
          ).length,
      ),
      0,
    );
    assert.equal(attempts.length, 2);
    assert.deepEqual(attempts[0], attempts[1]);
    await p.getByRole("button", { name: "Done", exact: true }).click();
    await p.unroute("**/api/feedback");
    await p.route("**/api/feedback", (route) =>
      route.fulfill({
        status: 502,
        json: {
          success: false,
          saved: true,
          emailSent: false,
          code: "FEEDBACK_NOTIFICATION_FAILED",
        },
      }),
    );
    await p.getByRole("button", { name: "Give feedback", exact: true }).click();
    await p.getByRole("radio", { name: "Maybe", exact: true }).check();
    await p.getByRole("button", { name: "Submit", exact: true }).click();
    await p
      .getByText(
        "Your feedback was saved, but the notification email could not be sent. You do not need to submit it again.",
        { exact: true },
      )
      .waitFor();
    assert.equal(
      await p.getByRole("button", { name: "Submit", exact: true }).count(),
      0,
    );
    await p
      .getByRole("heading", {
        name: "Feedback saved — email not sent",
        exact: true,
      })
      .waitFor();
    assert.equal(
      await p
        .getByText("Thank you for your feedback.", { exact: true })
        .count(),
      0,
    );
    await p.getByRole("button", { name: "Done", exact: true }).click();
    await p.unroute("**/api/feedback");
    await p.route("**/api/feedback", (route) =>
      route.fulfill({ status: 200, json: { success: true } }),
    );
    await p.getByRole("button", { name: "Give feedback", exact: true }).click();
    await p.getByRole("radio", { name: "Maybe", exact: true }).check();
    await p.getByRole("button", { name: "Submit", exact: true }).click();
    await p
      .getByRole("alert")
      .filter({ hasText: "Could not confirm" })
      .waitFor();
    assert.equal(
      await p
        .getByText("Thank you for your feedback.", { exact: true })
        .count(),
      0,
    );
    console.log(
      "PASS: first visit, Next/Back/finish/skip/reopen, reload memory, anonymous and optional feedback, duplicate prevention, mobile, sending state, server failures and idempotent retry (mocked endpoint).",
    );
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
