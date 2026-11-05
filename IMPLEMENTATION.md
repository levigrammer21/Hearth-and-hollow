# Implementation record — 1.0.0-rc.1

## What is functional

The package contains a playable game, not a UI-only preview. State changes flow through the same tested command engine in practice and live mode. Farming, animal care, offline villager work, production, economy, placement, upgrades, inventory, orders, gifting, market escrow, help requests, royal contributions, shared rewards, expeditions, achievements, and collections are connected to real state. Art and animation assets are original generated assets supplied with the source.

The supplied Firebase web configuration is integrated. Live mode uses Google Auth, an allowlist of two verified email accounts, a server-side action handler, Firestore transactions, durable action receipts, restricted reads, and no client game-state writes. There are no invented credentials or simulated online players.

## Exact release limits

- Live Google sign-in, production deployment, two real phones, and restoration across those phones have **not** been verified. The Firebase configuration is a public app configuration, not deployment authority. No live project settings, billing, security rules, or data were changed during development.
- The private access document still needs the two real Google account emails. The target GitHub repository was not supplied; source and both deployment workflows are packaged for it.
- This build requires a billing-enabled Firebase project for its callable function. That is a deviation from a strict “no billing account required” interpretation. It must not be presented as a guaranteed zero-cost backend. A Spark-only alternative would require a substantially different, separately tested server-enforced rules design.
- Browser QA used a desktop cloud browser and a real 390 × 844 CSS iframe viewport. This verified responsive layout and mouse-driven phone-sized interactions, not physical Android/iPhone touch performance or real multitouch. Device frame-rate, thermal behavior, iOS home-screen installation, and pinch gestures remain to be checked on actual devices.
- The renderer targets 40 animation frames per second and pauses while hidden. No measured hardware frame-rate claim is made.
- Character walk cycles use original eight-frame sprites. Other effects are procedural. Animals wander near their housing, villagers travel toward their assigned workplaces, and growing plants scale through stages and sway. This is stylized environmental movement, not a collision-aware pathfinding simulation or a directional four/eight-way character animation system.
- Buildings rotate their footprint and mirror their appearance. They do not have four separately painted directional views. Three hue-based building color variants are supported. Some decorations are palette variants of the same sprite (oak/blossom/lilac, statue/shrine). Seasonal decorations are available through normal leveling; there is no real-calendar season system.
- Food and overall happiness are intentionally simple. Animal “traits” are descriptive; they do not currently supply separate mechanical bonuses. Villager skill experience is shared across reassigned jobs rather than a separate XP table per profession. These differ from the more extensive possible interpretation of the handoff.
- Personal market listings are fixed-price whole-lot sales. Gifts and goods requests are supported. Item-for-item escrow barter and partial listing purchases are not implemented.
- Help is server-enforced for posted goods requests, crop watering, animal feeding, and completing construction. Direct visitor completion of merchant orders or a separate repairs system is not implemented.
- The kingdom hub visibly contains the castle and improved public structures. Project completion grants real benefits. It is a small shared grounds scene, not a large second editable kingdom map.
- Offline workers simulate at most 24 hours. Manual animal collection holds one batch; workshops hold queued finished batches. Housing and animals never die or permanently regress during inactivity.
- Maps cap at 32 × 32, 240 objects, 40 animals, and 24 villagers per estate. Both estates share one transactional document, suitable only for this two-player design.
- Long-term progression and economy have automated invariants and a mixed-action smoke test, but not weeks of human playtesting. The release is not represented as perfectly balanced or as polished to the level of the commercial art references.

## Remaining release gates

1. Confirm Blaze billing is acceptable, then deploy the backend and merge rules if the Firebase project already serves another app.
2. Configure Google provider, authorized Pages domain, and the exact two-account access list.
3. Deploy the supplied source to the selected GitHub repository.
4. Verify both real accounts, sign-out/sign-in, reload and cross-phone persistence, Google popup/redirect behavior, and revocation of an account.
5. Repeat trading, help, royal projects, and offline production between the two production accounts.
6. Check physical touch/pinch/drag and installation on Android and iPhone, and measure performance on those phones.
7. Playtest longer progression and address observed balance or artwork issues before promoting the release candidate to final 1.0.

## Source map

- `index.html`, `style.css`: page and responsive drawers.
- `app.mjs`: all interface actions, local save flow, cloud status, practice-player switching.
- `world.mjs`: cached terrain, original art atlases, animation, hit testing, pan/zoom/placement.
- `content.mjs`: full content catalog and economy values.
- `engine.mjs`: pure authoritative gameplay commands and offline settlement.
- `cloud.mjs`, `firebase-config.js`: Firebase client integration.
- `backend.cjs`: authenticated transaction handler, rate limits, receipts.
- `firestore.rules`, `firestore.indexes.json`, `firebase.json`: backend deployment configuration.
- `sw.js`, `manifest.webmanifest`, `icon.svg`, `img/`: PWA and assets.
- `engine.test.mjs`, `rules.test.mjs`, `backend.test.mjs`: executable validation.
- `.github/workflows/`: Pages and manual Firebase deployment.
