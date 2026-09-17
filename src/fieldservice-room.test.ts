import { strict as assert } from "node:assert";
import { chooseTechnician } from "./fieldservice-room.ts";

const order = { id: "WO-1", requiredSkill: "hvac", photoCount: 2 };
const result = chooseTechnician(order, [
  { id: "tech-z", skills: ["hvac"], online: true },
  { id: "tech-a", skills: ["hvac"], online: true },
  { id: "tech-b", skills: ["hvac"], online: false }
]);
assert.equal(result?.id, "tech-a");
assert.equal(chooseTechnician(order, [{ id: "tech-x", skills: ["electrical"], online: true }]), undefined);
console.log("matchmaking decision verified");
