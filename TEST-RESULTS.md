# Verification — 1.0.0-rc.1

Executed November 5, 2026. **46 automated tests passed: 31 gameplay, 8 permission, and 7 backend transaction tests.**

## Automated results

| Area | Result | Evidence covered |
| --- | --- | --- |
| Gameplay rules | 31 / 31 passed | Two independent estates, account cap, timestamp growth/reload, one-time harvest, crop locks, bulk planting costs, full storage rollback, actual crafting inputs/outputs, sequential queues, feeding and breeding, safe hunger, offline workers, food limits, placement, relocations, gifts, escrow purchases and cancellation, help transfers, watering, construction help, shared project rewards, prerequisites, festival yield, expeditions, achievements, invalid identifiers/quantities, content references, and 100 mixed farming/economy actions. |
| Firestore rules | 8 / 8 passed | Both allowed verified emails can read the kingdom. Strangers, unverified accounts, and signed-out clients are denied. Clients cannot forge inventory, edit/read the allowlist, list kingdoms, or read server receipts. |
| Backend transactions | 7 / 7 passed | Authenticated handler rejects outsiders, creates two estates, deduplicates a replayed gift, rejects a double purchase under concurrency, conserves inventory during simultaneous gifts, caps simultaneous royal contributions, awards both players once, and rejects forged totals/malformed nonces. |
| JavaScript syntax | Passed | Frontend modules, service worker, content/rules engine, and backend checked with Node. |
| Static packaging | Passed | Public files copied by an explicit allowlist; private backend/deployment files are excluded from the static site. |

The backend tests invoke the **actual exported callable handler** after verifying Auth Emulator tokens, and use real Firestore Emulator transactions. They are not mocks of the transaction logic. The Functions HTTP emulator could not start its Unix socket (`EPERM`) in this execution environment. The handler was therefore tested directly against the Auth/Firestore emulators; the deployed callable HTTPS endpoint and Google OAuth were not exercised.

The final emulator run used Firestore Emulator 1.22.0 and current installed backend/test dependencies. Local execution used Node 24.22.1 and Java 21; deployment targets Node 22. The Node 22 production runtime itself has not been exercised here.

## Browser checks performed

- Estate loads with original artwork and animated world elements.
- First local session saves successfully.
- Bulk harvest increases stored crop quantities and XP.
- Bulk planting charges the real seed total, and gold/crop state survives page reload.
- Creating and switching to the second local practice estate preserves independent state.
- A practice gift removes the sent goods and records the real transfer.
- A 390 × 844 iframe viewport renders the mobile header, canvas, bottom navigation, drawers, and two-column crop catalog.
- Mobile-sized construction flow builds an actual garden bed, subtracts 25 gold, and awards 2 XP.
- Plant buttons expose the compatible affordable bed count and total seed cost.
- Console inspection showed browser-extension metadata errors; no game-source runtime error was observed in the inspected log entries.

These are browser and responsive-viewport checks. They do not constitute physical-device testing, Google sign-in verification, or a measured frame-rate benchmark. The final inventory icon atlas was integrated after the interactive browser pass; its cell mapping was checked against all 34 goods programmatically.

## Dependency audit

Production dependencies were updated to Firebase Admin 14.5.0 and Firebase Functions 7.4.0. The final `npm audit --omit=dev` reported **0 high, 0 critical, and 4 moderate advisories** in the transitive `google-gax` / `rimraf` / `glob` / `minimatch` dependency chain. No claim of a clean dependency audit is made. The package lock preserves the tested versions; review upstream fixes before promoting this candidate to final production release.

## Production verification still required

- Deploy to the selected GitHub repository and actual Firebase project.
- Configure the two-account allowlist, Google provider, and authorized hosting domain.
- Exercise real Google sign-in on both phones and cross-device save restoration.
- Exercise the deployed HTTPS callable endpoint, retries, permissions, and both accounts' live contributions.
- Check iOS and Android touch pan, actual multitouch pinch, placement dragging, safe areas, PWA installation, offline shell behavior, and sustained hardware performance.
- Human playtesting of long-term progression and balance.

See `IMPLEMENTATION.md` for explicit scope limits. No live project settings, data, billing, or account access were changed during this execution.
