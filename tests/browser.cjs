/* Run against a clean demo-mode server: npm run build && npm start */
const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const baseURL = process.env.TEST_BASE_URL || "http://127.0.0.1:3000";

(async () => {
  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox"],
  });
  try {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 1000 },
    });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("response", (r) => {
      if (r.url().includes("/_next/") && r.status() >= 400)
        errors.push(`Asset ${r.status()}: ${r.url()}`);
    });
    const nav = (label) =>
      page
        .getByRole("navigation")
        .getByRole("button", { name: new RegExp(`^${label}(?:\\s*\\d+)?$`) });
    const rows = async (n) => {
      await page.waitForFunction(
        (n) => document.querySelectorAll("tbody tr").length === n,
        n,
      );
    };
    const close = async () => {
      await page.getByRole("button", { name: "Close dialog" }).click();
      await page.locator("dialog").waitFor({ state: "hidden" });
    };
    const search = page.getByRole("textbox", {
      name: "Search messages or tenants",
    });
    const select = (name) => page.getByRole("combobox", { name });
    await page.goto(baseURL);
    await page
      .getByRole("dialog", { name: "A quick guide to Local Haven" })
      .waitFor();
    await page.getByRole("button", { name: "Skip", exact: true }).click();
    await rows(12);
    assert.equal(
      await page
        .getByRole("button", { name: "New message", exact: true })
        .isEnabled(),
      true,
    );

    // Sidebar, summary cards, status tabs and property/category drill-downs.
    await nav("Open").click();
    await rows(8);
    await nav("Resolved").click();
    await rows(4);
    await nav("Inbox").click();
    await rows(12);
    for (const [name, count] of [
      ["Open", 8],
      ["Resolved", 4],
      ["Total messages", 12],
    ]) {
      await page.locator(".stat-card").filter({ hasText: name }).click();
      await rows(count);
    }
    await page.locator(".stat-card").filter({ hasText: "Properties" }).click();
    await page
      .locator(".property-card")
      .filter({ hasText: "The Maplewood" })
      .click();
    await rows(5);
    await search.fill("nonexistent");
    await rows(0);
    await nav("Categories").click();
    await page.locator(".category-card").filter({ hasText: "Payment" }).click();
    await rows(3);
    await nav("Properties").click();
    await page
      .locator(".property-card")
      .filter({ hasText: "Oak & Willow" })
      .click();
    await rows(4);
    await nav("Inbox").click();
    await rows(12);
    await page
      .getByRole("group", { name: "Message status" })
      .getByRole("button", { name: /^Resolved/ })
      .click();
    await rows(4);
    assert.equal(await nav("Resolved").getAttribute("aria-current"), "page");
    await page
      .getByRole("button", { name: "Clear filters", exact: true })
      .click();
    await rows(12);

    // Search and combined filters, clear buttons, sorting both ways.
    await search.fill("Olivia");
    await rows(3);
    await page.getByRole("button", { name: "Clear search" }).click();
    await rows(12);
    await select("Filter by property").selectOption({ label: "The Maplewood" });
    await select("Filter by category").selectOption("Urgent");
    await select("Filter by status").selectOption("Open");
    await rows(1);
    await page
      .getByRole("button", { name: "Clear filters", exact: true })
      .click();
    await rows(12);
    const newest = await page
      .locator("tbody time")
      .first()
      .getAttribute("datetime");
    await page.getByRole("button", { name: "Sort oldest first" }).click();
    assert.notEqual(
      await page.locator("tbody time").first().getAttribute("datetime"),
      newest,
    );
    await page.getByRole("button", { name: "Sort newest first" }).click();
    assert.equal(
      await page.locator("tbody time").first().getAttribute("datetime"),
      newest,
    );

    // Previously decorative workspace control, help and logo.
    await page
      .getByRole("button", { name: "Workspace details", exact: true })
      .click();
    await page
      .getByRole("button", { name: "View properties", exact: true })
      .click();
    await page
      .getByRole("heading", { name: "Properties", exact: true })
      .waitFor();
    await page.getByRole("button", { name: "Help & getting started" }).click();
    await page.getByRole("button", { name: "Got it" }).click();
    await page.getByRole("link", { name: "Haven home" }).click();
    await rows(12);

    // Dialog open, cancel and Escape paths.
    await page
      .getByRole("button", { name: "New message", exact: true })
      .click();
    await page.getByRole("button", { name: "Cancel", exact: true }).click();
    await page
      .getByRole("button", { name: "New message", exact: true })
      .click();
    await page.keyboard.press("Escape");
    await page.locator("dialog").waitFor({ state: "hidden" });
    await page.locator("tbody .icon-button").first().click();
    await page.getByRole("dialog", { name: "Message details" }).waitFor();
    await close();

    // Add a rule, reject a duplicate, use the new rule for a message.
    await nav("Rules").click();
    await page.getByRole("button", { name: "Add rule", exact: true }).click();
    await page.getByLabel("When the message contains").fill("parcel");
    await page.getByLabel("Assign category").selectOption("Payment");
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Add rule", exact: true })
      .click();
    await page.getByRole("button", { name: "Delete parcel rule" }).waitFor();
    await page.getByRole("button", { name: "Add rule", exact: true }).click();
    await page.getByLabel("When the message contains").fill("PARCEL");
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Add rule", exact: true })
      .click();
    await page
      .getByRole("alert")
      .filter({ hasText: "already exists" })
      .waitFor();
    await page.getByRole("button", { name: "Cancel", exact: true }).click();
    await nav("Inbox").click();
    // Create from an incompatible filter; the created message must be visible.
    await select("Filter by status").selectOption("Resolved");
    await search.fill("impossible match");
    await rows(0);
    await page
      .getByRole("button", { name: "New message", exact: true })
      .click();
    await page
      .getByRole("combobox", { name: "Tenant", exact: true })
      .selectOption({ index: 1 });
    await page
      .getByRole("combobox", { name: "Source", exact: true })
      .selectOption("WhatsApp");
    await page
      .getByLabel("Message", { exact: true })
      .fill("PARCEL core flow verification");
    assert.match(
      await page.locator(".category-preview").innerText(),
      /Payment/,
    );
    await page
      .getByRole("button", { name: "Create message", exact: true })
      .click();
    await rows(13);
    assert.match(
      await page.locator("tbody tr").first().innerText(),
      /PARCEL core flow verification/,
    );
    assert.match(
      await page.locator("tbody tr").first().innerText(),
      /Phoenix Baker/,
    );
    await page.locator("tbody .tenant-message").first().click();
    await page.getByRole("button", { name: "Mark as resolved" }).click();
    await page.getByRole("button", { name: "Reopen message" }).waitFor();
    await close();
    await nav("Resolved").click();
    await rows(5);
    await page.locator("tbody .tenant-message").first().click();
    await page.getByRole("button", { name: "Reopen message" }).click();
    await page.getByRole("button", { name: "Mark as resolved" }).waitFor();
    await close();
    await rows(4);
    await page.reload();
    await rows(13);
    assert.match(
      await page.locator("tbody tr").first().innerText(),
      /PARCEL core flow verification/,
    );
    await nav("Rules").click();
    await page.getByRole("button", { name: "Delete parcel rule" }).click();
    await page
      .getByRole("button", { name: "Delete parcel rule" })
      .waitFor({ state: "hidden" });
    await page.reload();
    await rows(13);
    await nav("Rules").click();
    assert.equal(
      await page.getByRole("button", { name: "Delete parcel rule" }).count(),
      0,
    );

    // Mobile menu, message creation and close control.
    await page.setViewportSize({ width: 390, height: 844 });
    await nav("Inbox").click();
    await rows(13);
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      true,
    );
    await page
      .getByRole("button", { name: "New message", exact: true })
      .click();
    await close();
    assert.deepEqual(errors, []);

    // Reproduce storage-related startup failures in isolated browser sessions.
    for (const mode of ["blocked", "invalid", "http-crypto"]) {
      const context = await browser.newContext();
      await context.addInitScript((mode) => {
        if (mode === "blocked")
          Object.defineProperty(window, "localStorage", {
            get() {
              throw new Error("Blocked");
            },
          });
        if (mode === "invalid")
          localStorage.setItem("haven-inbox-v1", '{"messages":null}');
        if (mode === "http-crypto")
          Object.defineProperty(crypto, "randomUUID", { value: undefined });
      }, mode);
      const p = await context.newPage();
      await p.goto(baseURL);
      await p
        .getByRole("dialog", { name: "A quick guide to Local Haven" })
        .waitFor();
      await p.getByRole("button", { name: "Skip", exact: true }).click();
      await p.waitForSelector("tbody tr");
      await p.getByRole("button", { name: "New message", exact: true }).click();
      await p
        .getByLabel("Message", { exact: true })
        .fill("Emergency leak regression");
      await p
        .getByRole("button", { name: "Create message", exact: true })
        .click();
      await p.waitForFunction(
        () => document.querySelectorAll("tbody tr").length === 13,
      );
      assert.match(await p.locator("tbody tr").first().innerText(), /Urgent/);
      if (mode === "blocked")
        assert.match(
          await p.locator(".storage-notice").innerText(),
          /lost when you reload/,
        );
      await context.close();
    }
    console.log(
      `PASS: all inbox controls, navigation, workspace, help, sorting, filters, rules, create/resolve/reopen, persistence, mobile, storage recovery and asset loading at ${baseURL}`,
    );
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
