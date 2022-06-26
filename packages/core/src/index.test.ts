import assert from "node:assert";
import fs from "node:fs";
import test from "node:test";

import { Instance } from "./index";

test("Test you list an empty instance", async () => {
  const db = new Instance({ root: "/tmp/testing" });
  assert.strictEqual(db.databases().length, 0);

  fs.rmSync("/tmp/testing", { recursive: true, force: true });
});

test("You can create a database", async () => {
  const instance = new Instance({ root: "/tmp/testing" });
  const db = instance.createDatabase("users");
  await db.open();
  assert.equal(fs.existsSync("/tmp/testing/databases/users"), true);

  const databases = instance.databases();
  assert.equal(databases.length, 1);
  assert.equal(databases[0], "users");

  await db.close();
  fs.rmSync("/tmp/testing", { recursive: true, force: true });
});
