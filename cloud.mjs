import {
  firebaseConfig,
  functionsRegion,
  kingdomId,
} from "./firebase-config.js";
const CDN = "https://www.gstatic.com/firebasejs/11.10.0/";
let auth, db, fn, authSdk, fireSdk;
export async function connect(callback, status) {
  const [app, a, f, c] = await Promise.all([
    import(CDN + "firebase-app.js"),
    import(CDN + "firebase-auth.js"),
    import(CDN + "firebase-firestore.js"),
    import(CDN + "firebase-functions.js"),
  ]);
  const instance = app.initializeApp(firebaseConfig);
  authSdk = a;
  fireSdk = f;
  auth = a.getAuth(instance);
  db = f.getFirestore(instance);
  fn = c.httpsCallable(
    c.getFunctions(instance, functionsRegion),
    "kingdomAction",
  );
  await a.setPersistence(auth, a.browserLocalPersistence);
  a.onAuthStateChanged(auth, async (user) => {
    if (!user) {
      status("signed-out");
      return;
    }
    status("connecting", user);
    try {
      const result = await fn({
        nonce: crypto.randomUUID(),
        command: {
          type: "join",
          name: user.displayName?.split(" ")[0] + "’s Hollow",
        },
      });
      status("clock", result.data.serverTime);
      f.onSnapshot(
        f.doc(db, "kingdoms", kingdomId),
        { includeMetadataChanges: true },
        (snap) => {
          if (snap.exists() && !snap.metadata.fromCache)
            callback(snap.data(), user.uid);
          else if (snap.metadata.fromCache) status("cached");
        },
        (error) => status("error", error),
      );
    } catch (error) {
      status("error", error);
    }
  });
}
export async function login() {
  if (!auth) throw new Error("Firebase is still connecting. Please try again.");
  try {
    await authSdk.signInWithPopup(auth, new authSdk.GoogleAuthProvider());
  } catch (err) {
    if (
      [
        "auth/popup-blocked",
        "auth/operation-not-supported-in-this-environment",
      ].includes(err.code)
    )
      await authSdk.signInWithRedirect(auth, new authSdk.GoogleAuthProvider());
    else throw err;
  }
}
export async function send(command, nonce = crypto.randomUUID()) {
  const r = await fn({ nonce, command });
  return r.data;
}
export async function logout() {
  await authSdk.signOut(auth);
  location.reload();
}
