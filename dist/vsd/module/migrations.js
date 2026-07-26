/**
 * Perform a system migration for the entire World, applying migrations for Actors, Items, and Compendium packs
 * @return {Promise}      A Promise which resolves once the migration is completed
 */
export const migrateWorld = async function () {
  ui.notifications.notify(`Beginning Migration to vsd ${game.system.version}`, { permanent: true });

  // Migrate World Actors
  for (let a of game.actors.contents) {
    try {
      const updatedata = await migrateActorData(a);
      if (!foundry.utils.isEmpty(updatedata)) {
        console.debug(`Migrating Actor: ${a.name}`);
        await a.update(updatedata, { enforceTypes: false });
      }
    } catch (err) {
      err.message = `Failed migration for Actor ${a.name}: ${err.message}`;
      console.error(err);
    }
  }

  // Migrate World Items
  for (let i of game.items.contents) {
    try {
      const updatedata = await migrateItemData(i);
      if (!foundry.utils.isEmpty(updatedata)) {
        console.debug(`Migrating Item: ${i.name}`);
        await i.update(updatedata, { enforceTypes: false });
      }
    } catch (err) {
      err.message = `Failed migration for Item ${i.name}: ${err.message}`;
      console.error(err);
    }
  }

  // Migrate Actor Override Tokens
  for (let s of game.scenes.contents) {
    try {
      const updatedata = await migrateSceneData(s);
      if (!foundry.utils.isEmpty(updatedata)) {
        console.debug(`Migrating Scene: ${s.name}`);
        await s.update(updatedata, { enforceTypes: false });
        // If we do not do this, then synthetic token actors remain in cache
        // with the un-updated actordata.
        s.tokens.contents.forEach(t => t._actor = null);
      }
    } catch (err) {
      err.message = `Failed migration for Scene ${s.name}: ${err.message}`;
      console.error(err);
    }
  }

  // Migrate World Compendium Packs
  for (let p of game.packs) {
    if (p.metadata.packageType !== "world") continue; // comment out to migrate system packs
    if (!["Actor", "Item", "Scene"].includes(p.documentName)) continue;
    await migrateCompendium(p);
  }

  game.settings.set("vsd", "systemMigrationVersion", game.system.version);
  ui.notifications.notify(`Migration to VsD ${game.system.version} Finished`, { permanent: true });
}

/**
 * Apply migration rules to all Documents within a single Compendium pack
 * @param pack
 * @return {Promise}
 */
export const migrateCompendium = async function (pack) {
  const document = pack.documentName;
  if (!["Actor", "Item", "Scene"].includes(document)) return;

  // Unlock the pack for editing
  const wasLocked = pack.locked;
  await pack.configure({ locked: false });

  // Begin by requesting server-side data model migration and get the migrated content
  await pack.migrate();
  const documents = await pack.getDocuments();

  // Iterate over compendium entries - applying fine-tuned migration functions
  for (let doc of documents) {
    let updatedata = {};
    try {
      switch (document) {
        case "Actor":
          updatedata = migrateActorData(doc);
          break;
        case "Item":
          updatedata = migrateItemData(doc);
          break;
        case "Scene":
          updatedata = migrateSceneData(doc);
          break;
      }

      // Save the entry, if data was changed
      if (foundry.utils.isEmpty(updatedata)) continue;
      await doc.update(updatedata);
      console.debug(`Migrated ${document} document ${doc.name} in Compendium ${pack.collection}`);
    }
    catch (err) {    // Handle migration failures
      err.message = `Failed migration for document ${doc.name} in pack ${pack.collection}: ${err.message}`;
      console.error(err);
    }
  }

  // Apply the original locked status for the pack
  await pack.configure({ locked: wasLocked });
  console.debug(`Migrated all ${document} documents from Compendium ${pack.collection}`);
};

/**
 * Migrate a single Actor document to incorporate latest data model changes
 * Return an Object of updatedata to be applied
 * @param {object} actor    The actor data object to update
 * @return {Object}         The updatedata to apply
 */
export const migrateActorData = function (actor) {
  const updatedata = {};

  // Actor Data Updates go here
  if (actor.system) { }

  // Migrate Owned Items
  if (!actor.items) return updatedata;
  const items = actor.items.reduce((arr, itemdata) => {
    // Migrate the Owned Item
    let itemUpdate = migrateItemData(itemdata);

    // Update the Owned Item
    if (!foundry.utils.isEmpty(itemUpdate)) {
      itemUpdate._id = itemdata._id;
      arr.push(foundry.utils.expandObject(itemUpdate));
    }

    return arr;
  }, []);
  if (items.length > 0) updatedata.items = items;
  return updatedata;
}

/**
 * Migrate a single Item document to incorporate latest data model changes
 *
 * @param {object} item  Item data to migrate
 * @return {object}      The updatedata to apply
 */
export const migrateItemData = function (item) {
  let updatedata;
  switch (item.type) {
    case "Pool": {
      break;
    }
    case "Variable": {
      updatedata = _migrateVariables(item, updatedata);
      break;
    }
    case "Modifier": {
      updatedata = _migrateModifiers(item, updatedata);
      break;
    }
    case "Ranged-Attack":
    case "Melee-Attack":
    case "Rollable":
    case "Defence": {
      break;
    }
    default: {
      break;
    }
  }
  if (updatedata) {
    if (updatedata.system) {
      updatedata.system.chartype = "CharacterVsD";
    } else {
      updatedata.system = { chartype: "CharacterVsD" }
    }
  } else {
    updatedata = { system: { chartype: "CharacterVsD" } }
  }
  return updatedata;
}

/**
 * Migrate a single Scene document to incorporate changes to the data model of its actor data overrides
 * Return an Object of updatedata to be applied
 * @param {Object} scene  The Scene data to Update
 * @return {Object}       The updatedata to apply
 */
export const migrateSceneData = function (scene) {
  const tokens = scene.tokens.map(token => {
    const t = token.toJSON();
    if (!t.actorId || t.actorLink) {
      t.delta = {};
    } else if (!game.actors.has(t.actorId)) {
      t.actorId = null;
      t.delta = {};
    } else if (!t.actorLink) {
      const delta = foundry.utils.duplicate(t.delta);
      delta.type = token.actor?.type;
      const update = migrateActorData(delta);
      ['items', 'effects'].forEach(embeddedName => {
        if (!update[embeddedName]?.length) return;
        const updates = new Map(update[embeddedName].map(u => [u._id, u]));
        t.delta[embeddedName].forEach(original => {
          const update = updates.get(original._id);
          if (update) foundry.utils.mergeObject(original, update);
        });
        delete update[embeddedName];
      });

      foundry.utils.mergeObject(t.delta, update);
    }
    return t;
  });
  return { tokens };
};



/**
 * Remove old blank first entries
 *
 * @param {object} item        Item data to migrate
 * @param {object} updatedata  Existing update to expand upon
 * @return {object}            The updatedata to apply
 * @private
 */
function _migrateModifiers(item, updatedata = {}) {
  let entries = Object.values(item.system.entries);
  updatedata.system = {
    entries: [...entries]
  }
  if (entries[0].formula == "") updatedata.system.entries.shift();
  return updatedata;
}

/**
 * Remove old blank first entries
 *
 * @param {object} item        Item data to migrate
 * @param {object} updatedata  Existing update to expand upon
 * @return {object}            The updatedata to apply
 * @private
 */
function _migrateVariables(item, updatedata = {}) {
  let entries = Object.values(item.system.entries);
  updatedata.system = {
    entries: [...entries]
  }
  if (entries[0].formula == "") updatedata.system.entries.shift();
  return updatedata;
}

/**
 * Ready hook loads tables, and override's foundry's document link functions to provide extension to pseudo entities
 */
Hooks.once("ready", function () {

  if (CONFIG.system.testMode) console.debug("Starting Ready");

  // Determine whether a system migration is required and feasible
  if (!game.user.isGM) return;
  const currentVersion = game.settings.get("vsd", "systemMigrationVersion");
  const NEEDS_MIGRATION_VERSION = 2.50;
  const COMPATIBLE_MIGRATION_VERSION = 2.30;
  const totalDocuments = game.actors.size + game.scenes.size + game.items.size;
  if (!currentVersion && totalDocuments === 0) return game.settings.set("vsd", "systemMigrationVersion", game.system.version);
  const needsMigration = !currentVersion || foundry.utils.isNewerVersion(NEEDS_MIGRATION_VERSION, currentVersion);
  if (!needsMigration) return;

  // Perform the migration
  if (currentVersion && foundry.utils.isNewerVersion(COMPATIBLE_MIGRATION_VERSION, currentVersion)) {
    const warning = `Your system data appears to have have missed a migration step and might not migrate completely. The process will be attempted, but errors may occur.`;
    ui.notifications.error(warning, { permanent: false });
  }
  return migrateWorld();
});
