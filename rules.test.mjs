import test, { before, after } from "node:test";
import { readFileSync } from "node:fs";
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, getDocs, collection } from "firebase/firestore";
let env;
before(async () => {
  env = await initializeTestEnvironment({
    projectId: "demo-hearth-hollow",
    firestore: { rules: readFileSync("firestore.rules", "utf8") },
  });
  await env.withSecurityRulesDisabled(async (c) => {
    const db = c.firestore();
    await setDoc(doc(db, "access/hearth-hollow"), {
      emails: ["a@example.com", "b@example.com"],
    });
    await setDoc(doc(db, "kingdoms/hearth-hollow"), {
      schema: 1,
      estates: { a: { gold: 80 } },
    });
  });
});
after(async () => await env?.cleanup());
const db = (uid, email, verified = true) =>
  env
    .authenticatedContext(uid, { email, email_verified: verified })
    .firestore();
test("authorized verified account can read only its private kingdom", async () => {
  await assertSucceeds(
    getDoc(doc(db("a", "a@example.com"), "kingdoms/hearth-hollow")),
  );
});
test("other authorized partner can read the shared document", async () => {
  await assertSucceeds(
    getDoc(doc(db("b", "b@example.com"), "kingdoms/hearth-hollow")),
  );
});
test("unrelated authenticated user cannot read kingdom", async () => {
  await assertFails(
    getDoc(doc(db("c", "stranger@example.com"), "kingdoms/hearth-hollow")),
  );
});
test("unverified email is rejected", async () => {
  await assertFails(
    getDoc(doc(db("a", "a@example.com", false), "kingdoms/hearth-hollow")),
  );
});
test("signed out browser cannot read kingdom", async () => {
  await assertFails(
    getDoc(
      doc(env.unauthenticatedContext().firestore(), "kingdoms/hearth-hollow"),
    ),
  );
});
test("member cannot directly forge inventory or rewards", async () => {
  await assertFails(
    setDoc(doc(db("a", "a@example.com"), "kingdoms/hearth-hollow"), {
      gold: 99999,
    }),
  );
});
test("member cannot read or replace access list", async () => {
  await assertFails(
    getDoc(doc(db("a", "a@example.com"), "access/hearth-hollow")),
  );
  await assertFails(
    setDoc(doc(db("a", "a@example.com"), "access/hearth-hollow"), {
      emails: ["c@example.com"],
    }),
  );
});
test("members cannot list all kingdoms or access server receipts", async () => {
  await assertFails(getDocs(collection(db("a", "a@example.com"), "kingdoms")));
  await assertFails(
    getDoc(
      doc(db("a", "a@example.com"), "kingdoms/hearth-hollow/receipts/a_123"),
    ),
  );
});
