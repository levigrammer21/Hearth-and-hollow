# Hearth & Hollow

A cozy cooperative farming game for two. Release candidate 1.0.0-rc.1.

## Play right away

Upload the **contents of the Hearth-Hollow folder** to the root of your GitHub repository. The app's HTML, CSS, JavaScript, game content, Firebase configuration, and rules are all at the root. Original artwork is in `img/`. The `.github/workflows` directory is the only deployment-related exception.

In the GitHub phone website, open **Settings → Pages → Source → GitHub Actions**. Push to `main`, or run **Actions → Deploy game to GitHub Pages**. Open the resulting Pages link. Choose **Step into Willowbrook** to play immediately in local practice. This mode saves in the same browser and never pretends to be cloud multiplayer.

You can also use Pages' **Deploy from a branch → main / root** without Actions. The app is buildless. Do not open `index.html` as a `file://` URL; JavaScript modules require hosting.

On Android, use the browser's Install app / Add to home screen command. On iPhone, open the Pages link in Safari and choose Share → Add to Home Screen. Initial loading needs a connection; cached local practice works offline afterward.

## Your private Firebase kingdom

Your supplied `micrommo-77c6e` web configuration is already in `firebase-config.js`. Firebase's browser API key identifies this app; access is controlled by authentication, Firestore rules, and the callable function. No service-account key is included in browser source.

Google sign-in alone is not enough to deploy backend code or authorize your two accounts. Complete this one-time setup:

1. In Firebase Authentication, enable **Google**. Add your exact GitHub Pages hostname (`YOURNAME.github.io`) to **Settings → Authorized domains**. If using a custom domain, add that hostname too. Keep the Firebase auth domain from the supplied configuration.
2. Create the default **Cloud Firestore** database. Choose the region you prefer; the function currently uses `us-central1`.
3. Deploy the included `kingdomAction` callable function, rules, and indexes. Firebase requires a **Blaze billing account** for function deployment; this is a deployment prerequisite, not a promise that usage is free. Nothing in this package enables billing. If this cost requirement is unacceptable, stay in local practice until the secure backend architecture is changed.
4. In Firestore, create collection `access`, document **`hearth-hollow`**. Add field **`emails`** as an array containing exactly the two lowercase Google account emails. Use two distinct addresses, with no spaces. This list is private and cannot be edited or read by the game client.
5. Open the hosted game and tap **Settings → Sign in with Google** on each phone. Each account gets its own estate. Local practice progress is intentionally separate and is not uploaded as trusted cloud state.

### Deploying Firebase from a phone

Use a browser-based terminal such as Google Cloud Shell or GitHub Codespaces. You do not need a desktop computer or a local build toolchain. Open this repository in that terminal, then run:

```sh
npm ci
npx firebase login --no-localhost
npx firebase deploy --project micrommo-77c6e --only functions:hearth-hollow,firestore:rules,firestore:indexes
```

Authenticate as a project owner or an account with the appropriate Firebase deployment roles. Complete Google's sign-in yourself. These commands deploy only this package's named function codebase and Firestore rules/indexes. **Firestore rules apply to the entire project:** review and merge them if this Firebase project already contains another app. This package's rules deny all paths except the private kingdom document. Do not blindly overwrite another app's rules.

Alternatively, the optional **Deploy private Firebase kingdom** GitHub workflow supports deployment from the Actions screen. It requires a project-scoped service-account JSON saved as the repository Actions secret `FIREBASE_SERVICE_ACCOUNT` and suitable deployment IAM roles. Keep that JSON only in GitHub Secrets, never in source code or a chat. See the workflow file for the exact deployment command. The access-list document is still configured in Firebase Console.

### Access document example

Replace both example addresses in the Firebase Console; these are not preauthorized accounts:

```json
{"emails":["first-player@example.com","second-player@example.com"]}
```

Only these verified emails can read the kingdom or execute actions. Client writes to all game data, access lists, rate counters, and receipts are denied. The server computes costs, timers, outputs, unlocks, and rewards. All shared updates run in a Firestore transaction. Request receipts prevent accidental replay of an action.

## A five-minute first session

1. Tap **Harvest all**, then **Plant beds**. Each crop button shows how many beds you can afford and the total seed cost.
2. Open **Estate → Crafting → Windmill**. Queue flour or animal feed. Collect when ready.
3. Open **Storehouse** to sell goods or buy basic wood, stone, and feed.
4. **Estate → Orders** pays better prices than direct selling. **Estate → Villagers** assigns helpers.
5. Open **Build**. Tap Build, choose a clear place, and confirm. Drag the preview to adjust it, or tap a new spot. Repeat placement stays active for beds, paths, flowers, and fences.
6. **Together** contains visits, gifts, personal market listings, help requests, and the visitor journal.
7. **Kingdom** contains shared permanent projects, royal orders, and the 24-hour Harvest Festival.

Tap a growing crop to inspect it or post a watering request. Tap an animal to name it, feed it, collect products, request tending, or breed. Tap a construction site to ask your neighbor to finish it with 5 wood. Tap a completed object to move, rotate its footprint, recolor, or upgrade it. Moving keeps its crop, queues, and progression.

To try cooperation without Firebase, open **Settings → Create second practice estate**. This creates a genuine second local estate and switches your control to it. **Switch practice player** swaps between the two. No automated partner activity is generated.

## Implemented content

- 28 crops across grains, vegetables, berries, herbs, flowers, fruit, magic, and orchards.
- 10 animal types, individually named, with feeding, production, traits, housing, and simple breeding.
- 22 functional/placeable building types and 18 decoration entries, with construction, upgrades, and relocations.
- 23 working recipes; serial, upgradeable queues consume and produce real inventory items.
- 12 villager professions; food provision, housing, happiness overview, work experience, and offline assistance.
- Expandable land, categorized inventory, basic supply purchases, merchant orders, active resource gathering.
- Gifts, escrowed market listings, requests for goods and assistance, secure purchasing, and real visitor history.
- 5 permanent royal projects, repeatable royal orders, shared reputation, and repeatable kingdom-wide festivals.
- 6 expedition regions with resource rewards and a discovery choice, plus 10 claimable achievements and an item collection.
- Original environment and animation atlases, animated villagers and livestock, moving water, crop sway, chimney smoke, petals, lights, and harvest particles.
- Touch pan, pinch zoom, tap-to-tend, bulk actions, tap/drag placement, keyboard pan, reduced-motion support, save status, and installable offline practice.

## Architecture

**Canvas 2D** renders the estate with cached terrain, four original atlases (environment, characters, crops, and inventory goods), depth sorting, viewport culling, and a capped animation loop. This keeps the public game buildless and avoids a heavy framework on phones. HTML drawers provide readable, accessible touch controls.

`content.mjs` holds the real catalog and balancing. `engine.mjs` is the deterministic command engine used by both practice and backend. `world.mjs` renders the world. `app.mjs` handles the interface. `cloud.mjs` integrates Firebase Auth, Firestore snapshots, and the callable function.

The two-player kingdom is a bounded Firestore document. A single transaction serializes shared state and prevents stale estate saves from replacing another player's changes. Server-only subcollections hold durable idempotency receipts and per-minute rate counters. Whole-document snapshots are appropriate for exactly two players, not for an MMO. State has an 800 KB safety guard below Firestore's document limit. Estates cap at 240 placed objects, 40 animals, and 24 villagers.

The callable function is necessary here to enforce the game's extensive economy rules on the server. Pure browser code with permissive Firestore writes would not satisfy this handoff's security requirements. No always-running custom server, paid art pack, analytics, advertisements, or game-service subscription is included. Firebase infrastructure costs remain subject to its billing plan.

## Saving and offline progress

Crops, construction, crafting queues, and expeditions store completion timestamps. Workers settle in 10-minute cycles for up to 24 hours away; they stop safely when food, materials, or storage run out. Their work is applied before each command. Animals never die due to inactivity. Finished manual workshop goods wait for collection; manual animals accumulate one ready batch until collected, rather than generating unlimited unattended stock.

Cloud mode accepts no optimistic inventory totals. It does not allow offline mutations that could conflict with trades. A network interruption keeps the command and its receipt ID in session storage; retry through Settings. Closing the tab can clear session storage, but any server-confirmed action remains in the authoritative kingdom. The next snapshot reflects it. Practice mode uses local storage and a Web Lock where supported.

## Checks

```sh
npm test
npx firebase emulators:exec --project demo-hearth-hollow --only firestore 'node --test rules.test.mjs'
npx firebase emulators:exec --project demo-hearth-hollow --only auth,firestore 'node --test backend.test.mjs'
```

See `TEST-RESULTS.md` for what actually ran and `IMPLEMENTATION.md` for release limitations and remaining verification. This is a playable release candidate, not a claim of perfection or completed live-device certification.
