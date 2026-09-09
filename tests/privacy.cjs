const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const baseURL = process.env.TEST_BASE_URL || "http://127.0.0.1:3000";
(async () => {
  const browser = await chromium.launch({ args: ["--no-sandbox"] });
  try {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 1000 },
    });
    const errors = [],
      requests = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.route("**/api/feedback", async (route) => {
      requests.push(route.request().postDataJSON());
      await route.fulfill({ status: 200, json: { success: true } });
    });
    const response = await page.goto(baseURL + "/privacy");
    assert.equal(response.status(), 200);
    await page
      .getByRole("heading", {
        name: "Local Haven Demo Privacy Policy",
        exact: true,
      })
      .waitFor();
    assert.equal(await page.locator(".privacy-policy h2").count(), 11);
    assert.equal(
      await page.getByText("[YOUR CONTACT EMAIL]", { exact: true }).count(),
      2,
    );
    await page
      .getByText("Last updated: September 9, 2026", { exact: true })
      .waitFor();
    assert.equal(await page.getByRole("dialog").count(), 0);
    assert.equal(await page.getByRole("textbox").count(), 0);
    await page
      .getByRole("link", { name: "Back to Local Haven", exact: false })
      .click();
    await page.getByRole("button", { name: "Skip", exact: true }).click();
    await page.waitForSelector("tbody tr");
    await page
      .getByText(
        "Fictional demo data. Please do not enter real tenant or sensitive information.",
        { exact: true },
      )
      .waitFor();
    await page
      .getByRole("link", { name: "Privacy Policy", exact: true })
      .click();
    await page.waitForURL("**/privacy");
    await page
      .getByRole("link", { name: "Back to Local Haven", exact: false })
      .click();
    await page.waitForSelector("tbody tr");
    await page
      .getByRole("button", { name: "Give feedback", exact: true })
      .click();
    const dialog = page.getByRole("dialog", {
      name: "Give feedback",
      exact: true,
    });
    await dialog
      .getByText(
        "Email is optional. If provided, it will only be used to follow up about your feedback.",
        { exact: true },
      )
      .waitFor();
    await dialog
      .getByText(
        "By submitting feedback, you acknowledge that your information will be handled as described in our Privacy Policy.",
        { exact: true },
      )
      .waitFor();
    assert.equal(await dialog.getByRole("checkbox").count(), 0);
    for (const name of ["Name (optional)", "Email (optional)"])
      assert.equal(
        await dialog
          .getByRole("textbox", { name, exact: true })
          .getAttribute("required"),
        null,
      );
    const formNames = await dialog
      .locator("input,textarea")
      .evaluateAll((fields) => [...new Set(fields.map((f) => f.name))].sort());
    assert.deepEqual(formNames, [
      "confusing",
      "email",
      "liked",
      "missing",
      "name",
      "wouldUse",
    ]);
    await dialog.getByRole("radio", { name: "Maybe", exact: true }).check();
    await dialog.getByRole("button", { name: "Submit", exact: true }).click();
    await dialog
      .getByText("Thank you for your feedback.", { exact: true })
      .waitFor();
    assert.equal(requests.length, 1);
    assert.equal(requests[0].name, undefined);
    assert.equal(requests[0].email, undefined);
    await dialog.getByRole("button", { name: "Done", exact: true }).click();
    await page
      .getByRole("button", { name: "Give feedback", exact: true })
      .click();
    const policy = page
      .getByRole("dialog")
      .getByRole("link", { name: "Privacy Policy", exact: true });
    assert.equal(await policy.getAttribute("href"), "/privacy");
    await policy.click();
    await page.waitForURL("**/privacy");
    for (const width of [390, 320]) {
      await page.setViewportSize({ width, height: 844 });
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        true,
      );
      await page
        .getByRole("heading", {
          name: "11. Changes to this policy",
          exact: true,
        })
        .scrollIntoViewIfNeeded();
      await page
        .getByRole("link", { name: "Back to Local Haven", exact: false })
        .click();
      await page.waitForSelector("tbody tr");
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        true,
      );
      await page
        .getByRole("button", { name: "Give feedback", exact: true })
        .click();
      await page
        .getByRole("dialog")
        .getByRole("link", { name: "Privacy Policy", exact: true })
        .click();
      await page.waitForURL("**/privacy");
    }
    assert.deepEqual(errors, []);
    console.log(
      "PASS: public privacy route, all links, exact disclosures, optional anonymous feedback, no added fields/checkboxes, desktop and mobile.",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
