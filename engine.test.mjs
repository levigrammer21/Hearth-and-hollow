import test from "node:test";
import assert from "node:assert/strict";
import {
  apply,
  newKingdom,
  settle,
  fits,
  capacity,
  used,
  level,
  WORK,
  DAY,
} from "./engine.mjs";
import {
  CROPS,
  CATALOG,
  RECIPES,
  ANIMALS,
  PROJECTS,
  ITEMS,
} from "./content.mjs";
const T = 1900000000000;
const act = (k, a, c, t = T) => apply(k, a, c, t);
function fixture() {
  let k = act(newKingdom(T), "a", { type: "join", name: "Willowbrook" });
  return act(k, "b", { type: "join", name: "Briarwood" });
}
function rich(k) {
  for (const e of Object.values(k.estates)) {
    e.gold = 100000;
    e.xp = 20000;
    e.food = 10000;
    e.villagers.forEach((v) => (v.job = "idle"));
    e.buildings.push(
      ...Array.from({ length: 15 }, (_, i) => ({
        id: "storage" + i,
        type: "warehouse",
        level: 5,
        x: 25,
        y: 25,
        ready: T,
        rotation: 0,
        queue: [],
      })),
    );
    for (const id of Object.keys(ITEMS)) e.inventory[id] = 100;
  }
  return k;
}
const bed = (k) =>
  k.estates.a.buildings.find((b) => b.type === "field" && !b.crop);
const workshop = (k, type) =>
  k.estates.a.buildings.find((b) => b.type === type);
test("two independent estates, third account denied", () => {
  const k = fixture();
  assert.equal(Object.keys(k.estates).length, 2);
  assert.notEqual(k.estates.a.inventory, k.estates.b.inventory);
  assert.throws(() => act(k, "c", { type: "join" }), /two estates/);
});
test("new estates have real merchant orders", () =>
  assert.equal(fixture().estates.a.orders.length, 3));
test("crops grow by timestamp across serialization and reload", () => {
  let k = fixture(),
    id = bed(k).id;
  k = act(k, "a", { type: "plant", id, crop: "wheat" });
  assert.throws(
    () => act(k, "a", { type: "harvest", id }, T + 29999),
    /still growing/,
  );
  k = JSON.parse(JSON.stringify(k));
  const n = k.estates.a.inventory.wheat;
  k = act(k, "a", { type: "harvest", id }, T + 30000);
  assert.equal(k.estates.a.inventory.wheat, n + 3);
  assert.throws(() => act(k, "a", { type: "harvest", id }, T + 30000));
});
test("locked crop cannot be planted", () =>
  assert.throws(
    () =>
      act(fixture(), "a", {
        type: "plant",
        id: bed(fixture()).id,
        crop: "dreamleaf",
      }),
    /higher level/,
  ));
test("bulk planting charges seeds for exactly empty beds", () => {
  let k = fixture();
  const n = k.estates.a.buildings.filter(
      (b) => b.type === "field" && !b.crop,
    ).length,
    g = k.estates.a.gold;
  k = act(k, "a", { type: "plantAll", crop: "wheat" });
  assert.equal(k.estates.a.gold, g - n * 8);
});
test("full storage rejects harvest without losing crop", () => {
  const k = fixture(),
    b = k.estates.a.buildings.find((b) => b.crop?.due <= T);
  k.estates.a.inventory.wood += capacity(k.estates.a) - used(k.estates.a);
  const before = JSON.stringify(k);
  assert.throws(() => act(k, "a", { type: "harvest", id: b.id }), /Storage/);
  assert.equal(JSON.stringify(k), before);
});
test("crafting consumes actual inputs and collects actual outputs offline", () => {
  let k = fixture(),
    b = workshop(k, "mill"),
    n = k.estates.a.inventory.wheat;
  k = act(k, "a", { type: "queue", id: b.id, recipe: "flour" });
  assert.equal(k.estates.a.inventory.wheat, n - 3);
  assert.throws(() =>
    act(k, "a", { type: "collectCraft", id: b.id }, T + 59000),
  );
  k = act(
    JSON.parse(JSON.stringify(k)),
    "a",
    { type: "collectCraft", id: b.id },
    T + 60000,
  );
  assert.equal(k.estates.a.inventory.flour, 2);
  assert.equal(k.estates.a.stats.crafted, 2);
  assert.throws(() =>
    act(k, "a", { type: "collectCraft", id: b.id }, T + 60000),
  );
});
test("queues are serial, finite, and reject wrong workshop recipes", () => {
  let k = fixture(),
    b = workshop(k, "mill");
  for (let i = 0; i < 3; i++)
    k = act(k, "a", { type: "queue", id: b.id, recipe: "feed" });
  const q = workshop(k, "mill").queue;
  assert.ok(q[2].due > q[1].due && q[1].due > q[0].due);
  assert.throws(
    () => act(k, "a", { type: "queue", id: b.id, recipe: "feed" }),
    /full/,
  );
  assert.throws(
    () => act(k, "a", { type: "queue", id: b.id, recipe: "iron" }),
    /not ready/,
  );
});
test("ready goods remain in queue if storage is full", () => {
  let k = fixture(),
    b = workshop(k, "mill");
  k = act(k, "a", { type: "queue", id: b.id, recipe: "feed" });
  k.estates.a.inventory.wood += capacity(k.estates.a) - used(k.estates.a);
  assert.throws(() =>
    act(k, "a", { type: "collectCraft", id: b.id }, T + 45000),
  );
  assert.equal(workshop(k, "mill").queue.length, 1);
});
test("animal production requires feeding and cannot double collect", () => {
  let k = fixture(),
    a = k.estates.a.animals[0],
    n = k.estates.a.inventory.egg;
  k = act(k, "a", { type: "animalCollect", id: a.id }, T + 120000);
  assert.equal(k.estates.a.inventory.egg, n + 2);
  assert.throws(() =>
    act(k, "a", { type: "animalCollect", id: a.id }, T + 120000),
  );
});
test("hungry animals survive a long absence and can be fed again", () => {
  let k = fixture();
  k = act(k, "a", { type: "tick" }, T + DAY * 30);
  assert.equal(k.estates.a.animals.length, 1);
  k.estates.a.animals[0].due = T + DAY * 30 + 120000;
  k = act(k, "a", { type: "feed" }, T + DAY * 30);
  assert.ok(k.estates.a.animals[0].fedUntil > T + DAY * 30);
});
test("breeding needs two animals and free housing", () => {
  let k = rich(fixture());
  assert.throws(
    () => act(k, "a", { type: "breed", id: "animal1" }),
    /two animals/,
  );
  k = act(k, "a", { type: "animalBuy", animal: "chicken" });
  k = act(k, "a", { type: "breed", id: "animal1" });
  assert.equal(k.estates.a.animals.length, 3);
  assert.throws(
    () => act(k, "a", { type: "breed", id: "animal1" }),
    /once a day/,
  );
});
test("worker simulation is equivalent for one long and six short advances", () => {
  let a = fixture(),
    b = fixture();
  a = act(a, "a", { type: "tick" }, T + 6 * WORK);
  for (let i = 1; i <= 6; i++) b = act(b, "a", { type: "tick" }, T + i * WORK);
  assert.deepEqual(a.estates.a.inventory, b.estates.a.inventory);
  assert.deepEqual(a.estates.a.food, b.estates.a.food);
});
test("workers safely stop for food and cap offline time", () => {
  let k = fixture();
  k.estates.a.food = 0;
  const n = k.estates.a.inventory.wood;
  k = act(k, "a", { type: "tick" }, T + 10 * DAY);
  assert.equal(k.estates.a.inventory.wood, n);
  assert.ok(k.estates.a.food >= 0);
  k = fixture();
  k.estates.a.food = 1000;
  k = act(k, "a", { type: "tick" }, T + 10 * DAY);
  assert.ok(k.estates.a.inventory.wood <= 80 + 144 * 4);
});
test("placement rejects overlaps, water, outside land, fractional and malicious rotations", () => {
  const k = fixture(),
    e = k.estates.a;
  assert.equal(fits(e, "field", 9, 6), false);
  assert.equal(fits(e, "field", 0, 8), false);
  assert.equal(fits(e, "field", 25, 8), false);
  assert.equal(fits(e, "field", 5.1, 8), false);
  assert.throws(() =>
    act(k, "a", { type: "build", item: "field", x: 20, y: 20, rotation: 100 }),
  );
});
test("move preserves crop timestamps and progression", () => {
  let k = fixture(),
    b = k.estates.a.buildings.find((b) => b.crop),
    crop = { ...b.crop };
  k = act(k, "a", { type: "move", id: b.id, x: 20, y: 20, rotation: 0 });
  assert.deepEqual(k.estates.a.buildings.find((v) => v.id === b.id).crop, crop);
  assert.equal(k.estates.a.buildings.find((v) => v.id === b.id).level, 1);
});
test("cannot move another player’s object using its identifier", () => {
  let k = fixture();
  k = act(k, "b", { type: "build", item: "field", x: 20, y: 20 });
  const id = k.estates.b.buildings.at(-1).id;
  assert.throws(
    () => act(k, "a", { type: "move", id, x: 21, y: 20 }),
    /not found/,
  );
});
test("gifts conserve goods, enforce destination room, and prevent self gifts", () => {
  let k = fixture();
  const total = k.estates.a.inventory.wheat + k.estates.b.inventory.wheat;
  k = act(k, "a", { type: "gift", target: "b", item: "wheat", qty: 7 });
  assert.equal(
    k.estates.a.inventory.wheat + k.estates.b.inventory.wheat,
    total,
  );
  assert.throws(() =>
    act(k, "a", { type: "gift", target: "a", item: "wheat", qty: 1 }),
  );
  k.estates.b.inventory.wood += capacity(k.estates.b) - used(k.estates.b);
  assert.throws(
    () => act(k, "a", { type: "gift", target: "b", item: "wheat", qty: 1 }),
    /full/,
  );
});
test("market escrow conserves items and gold, double purchase rejected", () => {
  let k = fixture(),
    total = k.estates.a.inventory.wheat + k.estates.b.inventory.wheat,
    g = k.estates.a.gold + k.estates.b.gold;
  k = act(k, "a", { type: "listing", item: "wheat", qty: 10, price: 33 });
  assert.equal(k.estates.a.inventory.wheat, 10);
  const id = k.listings[0].id;
  k = act(k, "b", { type: "purchase", id });
  assert.equal(
    k.estates.a.inventory.wheat + k.estates.b.inventory.wheat,
    total,
  );
  assert.equal(k.estates.a.gold + k.estates.b.gold, g);
  assert.throws(() => act(k, "b", { type: "purchase", id }), /no longer/);
});
test("cancel listing returns escrow only once and only to owner", () => {
  let k = fixture();
  k = act(k, "a", { type: "listing", item: "wood", qty: 5, price: 30 });
  const id = k.listings[0].id;
  assert.throws(() => act(k, "b", { type: "cancelListing", id }));
  k = act(k, "a", { type: "cancelListing", id });
  assert.equal(k.estates.a.inventory.wood, 80);
  assert.throws(() => act(k, "a", { type: "cancelListing", id }));
});
test("help goods are transferred once with a genuine journal entry", () => {
  let k = fixture();
  k = act(k, "a", { type: "request", kind: "goods", item: "stone", qty: 10 });
  const id = k.requests[0].id;
  k = act(k, "b", { type: "help", id, qty: 4 });
  assert.equal(k.requests[0].progress, 4);
  k = act(k, "b", { type: "help", id, qty: 100 });
  assert.equal(k.requests[0].progress, 10);
  assert.equal(k.estates.a.inventory.stone, 70);
  assert.equal(k.estates.b.inventory.stone, 50);
  assert.throws(() => act(k, "b", { type: "help", id }));
  assert.match(k.journal[0].message, /helped/);
});
test("help watering is capped and cannot be repeated", () => {
  let k = fixture();
  const b = k.estates.a.buildings.find((v) => v.crop?.type === "carrot");
  k = act(k, "a", { type: "request", kind: "water", target: b.id });
  const id = k.requests[0].id;
  k = act(k, "b", { type: "help", id });
  assert.equal(
    k.estates.a.buildings.find((v) => v.id === b.id).crop.watered,
    true,
  );
  assert.throws(() => act(k, "b", { type: "help", id }));
});
test("construction help consumes donor materials and completes real building", () => {
  let k = rich(fixture());
  k = act(k, "a", { type: "build", item: "bakery", x: 20, y: 20 });
  const b = k.estates.a.buildings.at(-1);
  k = act(k, "a", { type: "request", kind: "build", target: b.id });
  const n = k.estates.b.inventory.wood;
  k = act(k, "b", { type: "help", id: k.requests[0].id });
  assert.equal(k.estates.b.inventory.wood, n - 5);
  assert.equal(k.estates.a.buildings.at(-1).ready, T);
});
test("royal projects clamp overcontribution and reward both estates once", () => {
  let k = rich(fixture());
  const a = k.estates.a.gold,
    b = k.estates.b.gold;
  k = act(k, "a", { type: "contribute", id: "bridge", item: "wood", qty: 999 });
  assert.equal(k.projects[0].progress.wood, 80);
  assert.equal(k.estates.a.inventory.wood, 20);
  k = act(k, "b", {
    type: "contribute",
    id: "bridge",
    item: "stone",
    qty: 999,
  });
  assert.equal(k.projects[0].complete, true);
  assert.equal(k.estates.a.gold, a + 200);
  assert.equal(k.estates.b.gold, b + 200);
  assert.throws(
    () =>
      act(k, "a", { type: "contribute", id: "bridge", item: "wood", qty: 1 }),
    /complete/,
  );
});
test("royal projects enforce chain prerequisites", () =>
  assert.throws(
    () =>
      act(rich(fixture()), "a", {
        type: "contribute",
        id: "academy",
        item: "crystal",
        qty: 1,
      }),
    /previous/,
  ));
test("festival benefits apply to both players and expire by server time", () => {
  let k = rich(fixture());
  for (const [item, qty] of Object.entries({
    wheat: 60,
    carrot: 40,
    bread: 12,
  }))
    k = act(k, "a", { type: "decree", item, qty });
  assert.equal(k.decree.until, T + DAY);
  for (const actor of ["a", "b"]) {
    const b = k.estates[actor].buildings.find((v) => v.crop?.type === "wheat"),
      n = k.estates[actor].inventory.wheat;
    k = act(k, actor, { type: "harvest", id: b.id });
    assert.equal(k.estates[actor].inventory.wheat, n + 4);
  }
  assert.throws(
    () => act(k, "b", { type: "decree", item: "wheat", qty: 1 }),
    /active/,
  );
});
test("expedition returns real materials and rare choice has a tradeoff", () => {
  let k = fixture();
  k = act(k, "a", { type: "explore", region: "forest", villager: "v3" });
  const id = k.estates.a.expeditions[0].id;
  assert.throws(
    () => act(k, "a", { type: "discover", id, choice: 1 }),
    /still exploring/,
  );
  k = act(k, "a", { type: "discover", id, choice: 1 }, T + 180000);
  assert.equal(k.estates.a.inventory.relic, 4);
  assert.equal(k.estates.a.inventory.wood, 93);
  assert.throws(() =>
    act(k, "a", { type: "discover", id, choice: 1 }, T + 180000),
  );
});
test("achievements pay once and require real progress", () => {
  let k = fixture();
  assert.throws(() => act(k, "a", { type: "achievement", id: "harvest1" }));
  const b = k.estates.a.buildings.find((v) => v.crop?.due <= T);
  k = act(k, "a", { type: "harvest", id: b.id });
  const g = k.estates.a.gold;
  k = act(k, "a", { type: "achievement", id: "harvest1" });
  assert.equal(k.estates.a.gold, g + 50);
  assert.throws(() => act(k, "a", { type: "achievement", id: "harvest1" }));
});
test("invalid quantities and inherited object identifiers cannot mutate state", () => {
  for (const qty of [-1, 0, NaN, Infinity, 1.2, "10", 100000000])
    assert.throws(() =>
      act(fixture(), "a", { type: "sell", item: "wood", qty }),
    );
  for (const item of ["__proto__", "constructor", "toString", "missing"]) {
    assert.throws(() => act(fixture(), "a", { type: "sell", item, qty: 1 }));
    assert.throws(() =>
      act(fixture(), "a", { type: "listing", item, qty: 1, price: 1 }),
    );
  }
});
test("all recipe materials exist and sell for positive values", () => {
  for (const r of Object.values(RECIPES)) {
    assert.ok(CATALOG[r.building]);
    assert.ok(ITEMS[r.output]);
    for (const key of Object.keys(r.input)) assert.ok(ITEMS[key], key);
    assert.ok(r.duration > 0);
  }
  for (const c of Object.values(CROPS)) assert.ok(c.value * c.yield > c.seed);
});
test("100 mixed farming and economy actions preserve finite nonnegative resources", () => {
  let k = fixture(),
    t = T;
  for (let i = 0; i < 100; i++) {
    t += 31000;
    try {
      k = act(k, "a", { type: "harvestAll" }, t);
    } catch {}
    try {
      k = act(k, "a", { type: "plantAll", crop: "wheat" }, t);
    } catch {}
    const n = k.estates.a.inventory.wheat || 0;
    if (n > 15) k = act(k, "a", { type: "sell", item: "wheat", qty: 10 }, t);
    for (const e of Object.values(k.estates)) {
      assert.ok(Number.isFinite(e.gold) && e.gold >= 0);
      for (const n of Object.values(e.inventory))
        assert.ok(Number.isInteger(n) && n >= 0);
      assert.ok(used(e) <= capacity(e));
    }
  }
});
