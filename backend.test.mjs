import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { initializeApp, deleteApp, getApps } from "firebase-admin/app";
import { createRequire } from "node:module";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { randomUUID } from "node:crypto";
const project = "demo-hearth-hollow",
  app = initializeApp({ projectId: project }, "backend-tests"),
  db = getFirestore(app),
  tokens = {};
async function token(uid, email) {
  await getAuth(app).createUser({ uid, email, emailVerified: true });
  const custom = await getAuth(app).createCustomToken(uid);
  const r = await fetch(
    `http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=fake-key`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: custom, returnSecureToken: true }),
    },
  );
  return (await r.json()).idToken;
}
const handler = createRequire(import.meta.url)("./backend.cjs").kingdomAction;
async function call(uid, command, nonce = randomUUID()) {
  try {
    const decoded = tokens[uid]
      ? await getAuth(app).verifyIdToken(tokens[uid])
      : null;
    const result = await handler.run({
      data: { nonce, command },
      auth: decoded ? { uid: decoded.uid, token: decoded } : undefined,
    });
    return { status: 200, result };
  } catch (error) {
    return {
      status: 400,
      error: {
        status: error.code?.toUpperCase().replaceAll("-", "_"),
        message: error.message,
      },
    };
  }
}
const state = async () => (await db.doc("kingdoms/hearth-hollow").get()).data();
before(async () => {
  await db
    .doc("access/hearth-hollow")
    .set({ emails: ["a@example.com", "b@example.com"] });
  tokens.a = await token("a", "a@example.com");
  tokens.b = await token("b", "b@example.com");
  tokens.c = await token("c", "stranger@example.com");
});
after(async () => {
  await db.terminate();
  await Promise.all(getApps().map((a) => deleteApp(a)));
});
test("callable rejects unauthenticated and unrelated accounts", async () => {
  assert.ok((await call("none", { type: "join" })).error);
  assert.equal(
    (await call("c", { type: "join" })).error.status,
    "PERMISSION_DENIED",
  );
});
test("callable creates exactly two separate estates", async () => {
  for (const uid of ["a", "b"])
    assert.equal(
      (
        await call(uid, {
          type: "join",
          name: uid === "a" ? "Willowbrook" : "Briarwood",
        })
      ).status,
      200,
    );
  assert.equal(Object.keys((await state()).estates).length, 2);
});
test("replayed request receipt cannot send a gift twice", async () => {
  const nonce = randomUUID(),
    cmd = { type: "gift", target: "b", item: "wheat", qty: 3 };
  const first = await call("a", cmd, nonce),
    second = await call("a", cmd, nonce);
  assert.equal(first.status, 200);
  assert.equal(second.result.duplicate, true);
  const k = await state();
  assert.equal(k.estates.a.inventory.wheat, 17);
  assert.equal(k.estates.b.inventory.wheat, 23);
});
test("simultaneous distinct purchases cannot buy a listing twice", async () => {
  const posted = await call("a", {
    type: "listing",
    item: "wood",
    qty: 5,
    price: 25,
  });
  assert.equal(posted.status, 200);
  let k = await state();
  const id = k.listings[0].id,
    wood = k.estates.b.inventory.wood,
    g = k.estates.b.gold;
  const results = await Promise.all([
    call("b", { type: "purchase", id }),
    call("b", { type: "purchase", id }),
  ]);
  assert.equal(results.filter((r) => r.status === 200).length, 1);
  k = await state();
  assert.equal(k.estates.b.inventory.wood, wood + 5);
  assert.equal(k.estates.b.gold, g - 25);
  assert.equal(k.listings.length, 0);
});
test("simultaneous gifts preserve inventory across accounts", async () => {
  const before = await state(),
    total = before.estates.a.inventory.stone + before.estates.b.inventory.stone;
  const r = await Promise.all([
    call("a", { type: "gift", target: "b", item: "stone", qty: 7 }),
    call("b", { type: "gift", target: "a", item: "stone", qty: 9 }),
  ]);
  assert.ok(r.every((r) => r.status === 200));
  const after = await state();
  assert.equal(
    after.estates.a.inventory.stone + after.estates.b.inventory.stone,
    total,
  );
});
test("simultaneous royal contributions clamp and reward exactly once", async () => {
  let k = await state();
  for (const e of Object.values(k.estates)) {
    e.inventory.wood = 100;
    e.inventory.stone = 100;
  }
  await db.doc("kingdoms/hearth-hollow").set(k);
  const wood = await Promise.all([
    call("a", { type: "contribute", id: "bridge", item: "wood", qty: 100 }),
    call("b", { type: "contribute", id: "bridge", item: "wood", qty: 100 }),
  ]);
  assert.equal(wood.filter((r) => r.status === 200).length, 1);
  k = await state();
  assert.equal(k.projects[0].progress.wood, 80);
  const goldA = k.estates.a.gold,
    goldB = k.estates.b.gold;
  const stone = await Promise.all([
    call("a", { type: "contribute", id: "bridge", item: "stone", qty: 100 }),
    call("b", { type: "contribute", id: "bridge", item: "stone", qty: 100 }),
  ]);
  assert.equal(stone.filter((r) => r.status === 200).length, 1);
  k = await state();
  assert.equal(k.projects[0].complete, true);
  assert.equal(k.estates.a.gold, goldA + 200);
  assert.equal(k.estates.b.gold, goldB + 200);
});
test("callable rejects forged totals and malformed nonce", async () => {
  const before = await state();
  assert.equal(
    (await call("a", { type: "set", inventory: { wood: 999999 } })).status,
    400,
  );
  assert.equal((await call("a", { type: "tick" }, "bad")).status, 400);
  assert.equal(
    (await state()).estates.a.inventory.wood,
    before.estates.a.inventory.wood,
  );
});
