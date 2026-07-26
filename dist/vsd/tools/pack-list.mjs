#!/usr/bin/env node
/**
 * List documents in a Foundry LevelDB pack.
 * Usage: node tools/pack-list.mjs <packDir> [--type CharacterVsD]
 */
import { ClassicLevel } from "classic-level";
import path from "path";

const packDir = process.argv[2];
const typeFilter = process.argv.includes("--type")
  ? process.argv[process.argv.indexOf("--type") + 1]
  : null;

if (!packDir) {
  console.error("Usage: node tools/pack-list.mjs <packDir> [--type Type]");
  process.exit(1);
}

const db = new ClassicLevel(path.resolve(packDir), {
  keyEncoding: "utf8",
  valueEncoding: "utf8",
  createIfMissing: false,
});

const docs = [];
for await (const [, value] of db.iterator()) {
  try {
    const doc = JSON.parse(value);
    if (!doc?.name) continue;
    if (typeFilter && doc.type !== typeFilter) continue;
    docs.push({ name: doc.name, type: doc.type, id: doc._id });
  } catch {
    /* skip */
  }
}
await db.close();
docs.sort((a, b) => a.name.localeCompare(b.name));
for (const d of docs) console.log(`${d.type}\t${d.name}\t${d.id ?? ""}`);
console.error(`# count=${docs.length}`);
