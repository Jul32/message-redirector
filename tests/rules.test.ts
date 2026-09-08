import { test } from "node:test";
import assert from "node:assert/strict";
import { categorize } from "../lib/rules.ts";
const rules = [
  { id: "01", keyword: "leak", category: "Maintenance" as const },
  { id: "02", keyword: "rent", category: "Payment" as const },
  { id: "03", keyword: "emergency", category: "Urgent" as const },
];
test("matches a keyword inside mixed-case tenant content", () =>
  assert.equal(
    categorize("There is a LEAK under my sink", rules),
    "Maintenance",
  ));
test("unmatched messages default to General", () =>
  assert.equal(categorize("Can I have a spare key?", rules), "General"));
test("urgent takes precedence over other matching rules", () =>
  assert.equal(categorize("Emergency: leak in the hallway", rules), "Urgent"));
test("multiple non-urgent matches use ID order independently of query order", () =>
  assert.equal(
    categorize("rent and leak", [...rules].reverse()),
    "Maintenance",
  ));
test("empty keywords never match", () =>
  assert.equal(
    categorize("hello", [{ id: "01", keyword: " ", category: "Urgent" }]),
    "General",
  ));
test("deleted rule stops categorizing future messages", () =>
  assert.equal(
    categorize(
      "leak in sink",
      rules.filter((r) => r.keyword !== "leak"),
    ),
    "General",
  ));
