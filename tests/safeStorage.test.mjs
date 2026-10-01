import assert from "node:assert/strict";
import test from "node:test";

import { createSafeStorage } from "../src/utils/safeStorage.ts";

test("uses localStorage and restores persisted values in a new app instance", () => {
  const values = new Map();
  const localStorage = {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value)
  };

  createSafeStorage(() => localStorage).setItem("state", "saved");

  assert.equal(createSafeStorage(() => localStorage).getItem("state"), "saved");
});

test("falls back to memory when the localStorage property getter throws", () => {
  let attempts = 0;
  const storage = createSafeStorage(() => {
    attempts += 1;
    throw new Error("SecurityError: opaque origin");
  });

  assert.doesNotThrow(() => assert.equal(storage.getItem("state"), null));
  storage.setItem("state", "in-memory");

  assert.equal(storage.getItem("state"), "in-memory");
  assert.equal(attempts, 1);
});

test("falls back to memory when localStorage reads are denied", () => {
  const storage = createSafeStorage(() => ({
    getItem() {
      throw new Error("SecurityError: storage access denied");
    },
    setItem() {
      throw new Error("SecurityError: storage access denied");
    }
  }));

  assert.equal(storage.getItem("state"), null);
  storage.setItem("state", "in-memory");

  assert.equal(storage.getItem("state"), "in-memory");
});

test("preserves the last readable value if a later localStorage write fails", () => {
  const storage = createSafeStorage(() => ({
    getItem: () => "before-write",
    setItem() {
      throw new Error("QuotaExceededError");
    }
  }));

  assert.equal(storage.getItem("state"), "before-write");
  storage.setItem("state", "after-write");

  assert.equal(storage.getItem("state"), "after-write");
});
