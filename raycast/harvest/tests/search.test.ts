import assert from "node:assert/strict";
import { test } from "node:test";
import { matchesSearch } from "../src/search.ts";

test("matches partial words across client, project, task, and shortcut", () => {
  const fields = ["Acme", "Website Redesign", "Tech Supervision", "acm"];
  for (const query of ["acm tech", "TECH ACM", "website supervision", "  acm   redesign tech  ", ""]) {
    assert.equal(matchesSearch(query, fields), true, query);
  }
  for (const query of ["atlas tech", "acme analytics", "acm nonexistent"]) {
    assert.equal(matchesSearch(query, fields), false, query);
  }
});

test("ignores accents and includes saved shortcut names", () => {
  assert.equal(matchesSearch("cafe quick", ["Café", "quick-switch"]), true);
});
