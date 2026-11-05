const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
initializeApp();
exports.kingdomAction = onCall(
  {
    region: "us-central1",
    maxInstances: 2,
    memory: "256MiB",
    timeoutSeconds: 30,
  },
  async (request) => {
    if (!request.auth || request.auth.token.email_verified !== true)
      throw new HttpsError(
        "unauthenticated",
        "Sign in with a verified Google account.",
      );
    const { nonce, command } = request.data || {};
    if (
      typeof nonce !== "string" ||
      !/^[a-zA-Z0-9-]{20,80}$/.test(nonce) ||
      !command ||
      JSON.stringify(command).length > 2000
    )
      throw new HttpsError("invalid-argument", "Invalid action.");
    const db = getFirestore(),
      ref = db.doc("kingdoms/hearth-hollow"),
      access = db.doc("access/hearth-hollow");
    const uid = request.auth.uid,
      email = request.auth.token.email?.toLowerCase();
    const { apply, newKingdom } = await import("./engine.mjs");
    try {
      return await db.runTransaction(async (tx) => {
        const [acl, snapshot] = await Promise.all([
          tx.get(access),
          tx.get(ref),
        ]);
        const emails = acl.data()?.emails;
        if (
          !Array.isArray(emails) ||
          emails.length !== 2 ||
          !emails.includes(email)
        )
          throw new HttpsError(
            "permission-denied",
            "This private kingdom is limited to its two authorized accounts.",
          );
        const now = Date.now(),
          k = snapshot.exists ? snapshot.data() : newKingdom(now);
        // Durable receipt documents make retries safe even after old journal entries expire.
        const receiptRef = db.doc(
          `kingdoms/hearth-hollow/receipts/${uid}_${nonce}`,
        );
        const receipt = await tx.get(receiptRef);
        if (receipt.exists)
          return {
            revision: receipt.data().revision,
            serverTime: now,
            duplicate: true,
          };
        const rateRef = db.doc(`kingdoms/hearth-hollow/rates/${uid}`),
          rate = await tx.get(rateRef);
        const bucket = Math.floor(now / 60000),
          count = rate.data()?.bucket === bucket ? rate.data().count : 0;
        if (count >= 120)
          throw new HttpsError(
            "resource-exhausted",
            "Take a moment before your next action.",
          );
        const next = apply(k, uid, command, now);
        tx.set(ref, next);
        tx.set(receiptRef, { revision: next.revision, created: new Date(now) });
        tx.set(rateRef, { bucket, count: count + 1 });
        return { revision: next.revision, serverTime: now };
      });
    } catch (error) {
      if (error instanceof HttpsError) throw error;
      throw new HttpsError(
        "failed-precondition",
        error.message || "Action could not be completed.",
      );
    }
  },
);
