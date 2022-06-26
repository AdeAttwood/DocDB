import assert from "node:assert";
import fs from "node:fs";
import test from "node:test";

import { Database } from "./database";

async function setup() {
  const db = new Database({ root: "/tmp/database" });
  await db.open();

  return db;
}

async function teardown(db: Database) {
  await db.close();
  fs.rmSync("/tmp/database", { recursive: true, force: true });
}

test("You can create a database", async () => {
  const db = await setup();
  assert.equal(fs.existsSync("/tmp/database/db/CURRENT"), true);

  await teardown(db);
});

test("Adding and getting a document", async () => {
  const db = await setup();

  await db.insert(1, { user_id: 1, first_name: "Ade", last_name: "Attwood" });
  const doc = await db.get(1);

  assert.equal("Ade", doc.first_name);
  assert.equal("Attwood", doc.last_name);

  await teardown(db);
});
