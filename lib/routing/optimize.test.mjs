import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const compile = (file) => ts.transpileModule(readFileSync(new URL(file, import.meta.url), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const load = (source, dependencies = {}) => {
  const module = { exports: {} };
  new Function("exports", "require", "module", source)(module.exports, (id) => dependencies[id] ?? require(id), module);
  return module.exports;
};
const distance = load(compile("./distance.ts"));
const { optimizeRoutes } = load(compile("./optimize.ts"), { "./distance": distance });

const point = (latitude, longitude) => ({ latitude, longitude });
const request = (id, load = 2, pickup = point(19, 73), delivery = point(19.1, 73.1)) => ({ id, load, pickup, delivery });
const vehicle = (id, capacity = 10) => ({ id, capacity, available: true, start: point(18.9, 72.9) });

test("Haversine returns zero for the same point and a known-distance sanity value", () => {
  assert.equal(distance.haversineDistanceKm(point(12, 77), point(12, 77)), 0);
  assert.ok(Math.abs(distance.haversineDistanceKm(point(0, 0), point(0, 1)) - 111.195) < 0.2);
});

test("one request produces pickup before delivery with an exact capacity fit", () => {
  const result = optimizeRoutes([request("r1", 10)], [vehicle("v1", 10)]);
  assert.equal(result.unassignedRequests.length, 0);
  assert.equal(result.routes[0].totalLoad, 10);
  assert.deepEqual(result.routes[0].stops.map((stop) => stop.type), ["pickup", "delivery"]);
  assert.ok(result.routes[0].totalLoad <= result.routes[0].capacity);
});

test("capacity, invalid inputs, duplicate IDs, empty selections, and partial assignment are explicit", () => {
  assert.equal(optimizeRoutes([request("large", 11)], [vehicle("v", 10)]).unassignedRequests[0].reason, "Request load exceeds every selected vehicle capacity.");
  assert.equal(optimizeRoutes([request("zero", 0)], [vehicle("v")]).unassignedRequests[0].reason, "Request load must be a positive number.");
  assert.equal(optimizeRoutes([{ ...request("missing"), pickup: null }], [vehicle("v")]).unassignedRequests[0].reason, "Pickup coordinate is missing or invalid.");
  assert.equal(optimizeRoutes([request("same"), request("same")], [vehicle("v")]).unassignedRequests.length, 2);
  assert.equal(optimizeRoutes([], [vehicle("v")]).routes.length, 0);
  assert.equal(optimizeRoutes([request("r")], []).unassignedRequests.length, 1);
  const partial = optimizeRoutes([request("a", 7), request("b", 7)], [vehicle("v", 10)]);
  assert.equal(partial.routes.length, 1);
  assert.equal(partial.unassignedRequests.length, 1);
});

test("multiple vehicles are capacity-safe and identical input is deterministic", () => {
  const input = [request("a", 6), request("b", 4), request("c", 5)];
  const vehicles = [vehicle("v2", 8), vehicle("v1", 10)];
  const first = optimizeRoutes(input, vehicles);
  const second = optimizeRoutes(input, vehicles);
  assert.deepEqual(first, second);
  assert.equal(first.routes.reduce((sum, route) => sum + route.requestIds.length, 0) + first.unassignedRequests.length, 3);
  for (const route of first.routes) {
    assert.ok(route.totalLoad <= route.capacity);
    for (const id of route.requestIds) {
      const stops = route.stops.filter((stop) => stop.requestId === id);
      assert.equal(stops[0].type, "pickup");
      assert.equal(stops[1].type, "delivery");
    }
  }
});

test("unavailable selected vehicles fail validation instead of being silently omitted", () => {
  assert.throws(() => optimizeRoutes([request("r")], [{ ...vehicle("v"), available: false }]), /unavailable/);
});
