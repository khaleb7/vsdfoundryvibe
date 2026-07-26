#!/usr/bin/env node
/**
 * Upsert a JSON document into a Foundry LevelDB pack.
 * Usage: node tools/pack-upsert.mjs <packDir> <doc.json> [--key !actors!ID]
 *
 * If --key omitted, uses !{collection}!{_id} from doc (_id generated if missing).
 * Collection inferred from doc.type: CharacterVsD -> actors, else items.
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

const packDir = process.argv[2];
const docPath = process.argv[3];
const keyIdx = process.argv.indexOf("--key");
let key = keyIdx >= 0 ? process.argv[keyIdx + 1] : null;

if (!packDir || !docPath) {
  console.error("Usage: node tools/pack-upsert.mjs <packDir> <doc.json> [--key KEY]");
  process.exit(1);
}

const raw = JSON.parse(fs.readFileSync(docPath, "utf8"));
const doc = raw.doc ?? raw;
if (!doc._id) doc._id = randomId();
if (!doc._stats) {
  doc._stats = {
    systemId: "vsd",
    systemVersion: "14.0.1",
    coreVersion: "14.000",
    createdTime: Date.now(),
    modifiedTime: Date.now(),
    lastModifiedBy: null,
  };
} else {
  doc._stats.modifiedTime = Date.now();
  doc._stats.systemVersion = "14.0.1";
}

const collection = doc.type === "CharacterVsD" ? "actors" : "items";
if (!key) key = `!${collection}!${doc._id}`;

const db = new ClassicLevel(path.resolve(packDir), {
  keyEncoding: "utf8",
  valueEncoding: "utf8",
  createIfMissing: false,
});

// Remove existing doc with same name+type if different key
for await (const [k, value] of db.iterator()) {
  try {
    const existing = JSON.parse(value);
    if (existing.name === doc.name && existing.type === doc.type && k !== key) {
      await db.del(k);
      console.error(`removed duplicate key ${k}`);
    }
  } catch {
    /* skip */
  }
}

await db.put(key, JSON.stringify(doc));
await db.close();
console.log(`upserted ${doc.type} "${doc.name}" -> ${key}`);
