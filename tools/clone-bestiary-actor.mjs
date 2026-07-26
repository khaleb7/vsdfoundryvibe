#!/usr/bin/env node
/**
 * Clone a bestiary actor bundle into vsd-actors with new IDs and overrides.
 * Usage: node tools/clone-bestiary-actor.mjs --template Skeleton-bundle.json --name "Wraith" --hp 200 --notes "..." --img path
 */
import { ClassicLevel } from "classic-level";
import fs from "fs";
import path from "path";
import crypto from "crypto";

function randomId(len = 16) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = crypto.randomBytes(len);
  let id = "";
  for (let i = 0; i < len; i++) id += alphabet[bytes[i] % alphabet.length];
  return id;
}

function deepClone(o) {
  return JSON.parse(JSON.stringify(o));
}

function parseArgs(argv) {
  const out = { extras: [] };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--template") out.template = argv[++i];
    else if (a === "--name") out.name = argv[++i];
    else if (a === "--hp") out.hp = Number(argv[++i]);
    else if (a === "--notes") out.notes = argv[++i];
    else if (a === "--img") out.img = argv[++i];
    else if (a === "--pack") out.pack = argv[++i];
    else if (a === "--trait") out.extras.push(argv[++i]);
    else if (a === "--level") out.level = argv[++i];
  }
  return out;
}

const args = parseArgs(process.argv);
if (!args.template || !args.name) {
  console.error("Need --template and --name");
  process.exit(1);
}

const packDir = path.resolve(args.pack || "packs/vsd-actors");
const bundle = JSON.parse(fs.readFileSync(path.resolve(args.template), "utf8"));
const actor = deepClone(bundle.actor);
const items = deepClone(bundle.items);
const newActorId = randomId();
const idMap = new Map();

for (const item of items) {
  const oldId = item._id;
  const newId = randomId();
  idMap.set(oldId, newId);
  item._id = newId;
}

actor._id = newActorId;
actor.name = args.name;
if (args.img) actor.img = args.img;
actor.items = items.map((i) => i._id);
actor.flags = actor.flags || {};
actor.flags.vsd = { ...(actor.flags.vsd || {}), coreRulesImport: "1.5", importedAt: Date.now() };
actor._stats = {
  ...(actor._stats || {}),
  systemId: "vsd",
  systemVersion: "14.0.1",
  coreVersion: "14.000",
  createdTime: Date.now(),
  modifiedTime: Date.now(),
  lastModifiedBy: null,
};

const shortNotes = args.notes || "";
if (actor.system) {
  if (typeof actor.system.biography === "string") {
    actor.system.biography = `<h1>${args.name}</h1><p>${shortNotes.replace(/\n/g, "</p><p>")}</p>`;
  }
  actor.system.notes = shortNotes;
}

for (const item of items) {
  item._stats = {
    ...(item._stats || {}),
    systemId: "vsd",
    systemVersion: "14.0.1",
    coreVersion: "14.000",
    modifiedTime: Date.now(),
  };
  if (item.name === "Hit Points" && Number.isFinite(args.hp)) {
    item.system.value = args.hp;
    // Keep formula but seed current HP for quick use
  }
  if (item.name === "Description" && item.type === "Trait") {
    item.system.notes = `${args.name}: ${shortNotes}`;
  }
  if (item.name === "General Information" && item.type === "Trait") {
    item.system.notes = [
      args.level ? `Level/Type: ${args.level}` : null,
      shortNotes,
    ]
      .filter(Boolean)
      .join("\n");
  }
  if (item.name === "Combat Tactics" && item.type === "Trait" && shortNotes) {
    item.system.notes = shortNotes.split("\n").slice(0, 3).join("\n");
  }
}

// Optional extra trait stubs
for (const traitLine of args.extras) {
  const [title, ...rest] = traitLine.split(":");
  items.push({
    _id: randomId(),
    name: title.trim(),
    type: "Trait",
    img: "icons/svg/aura.svg",
    system: {
      notes: traitLine,
      chartype: "CharacterVsD",
      group: "kin",
      applied: false,
      category: "perk",
      sort: -1,
    },
    effects: [],
    folder: null,
    sort: 0,
    ownership: { default: 0 },
    flags: {},
    _stats: {
      systemId: "vsd",
      systemVersion: "14.0.1",
      coreVersion: "14.000",
      createdTime: Date.now(),
      modifiedTime: Date.now(),
    },
  });
  actor.items.push(items[items.length - 1]._id);
}

const db = new ClassicLevel(packDir, {
  keyEncoding: "utf8",
  valueEncoding: "utf8",
  createIfMissing: false,
});

// Remove existing actor with same name
const toDelete = [];
for await (const [key, value] of db.iterator()) {
  try {
    const doc = JSON.parse(value);
    if (doc.type === "CharacterVsD" && doc.name === args.name) {
      toDelete.push(key);
      const prefix = key + ".items!";
      for await (const [k2] of db.iterator()) {
        if (k2.startsWith(prefix)) toDelete.push(k2);
      }
    }
  } catch {
    /* skip */
  }
}
for (const k of [...new Set(toDelete)]) {
  await db.del(k);
  console.error("removed", k);
}

const actorKey = `!actors!${newActorId}`;
await db.put(actorKey, JSON.stringify(actor));
for (const item of items) {
  await db.put(`!actors!${newActorId}.items!${item._id}`, JSON.stringify(item));
}
await db.close();
console.log(`Created ${args.name} (${items.length} items) -> ${actorKey}`);
