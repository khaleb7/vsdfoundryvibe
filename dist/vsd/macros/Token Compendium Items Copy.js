/**
 * This macro will copy all items from a named world compendium 
 * to each selected token, replacing any of the same name and type.
 */
const compendiumName = "conditions";

const items = await game.packs.get(`world.${compendiumName}`)?.getDocuments() || [];
if (items.length == 0) {
  ui.notifications.error(`The world compendium "${compendiumName}" does not exist or is empty.`);
  return;
}

const tokens = canvas.tokens.controlled;
if (tokens.length == 0) {
  ui.notifications.error("Please select at least one token first");
  return;
}

ui.notifications.info(`Assigning conditions to tokens. Please wait until the process is complete.`);

tokens.forEach(async function (token) {
  const actor = token.actor;
  const newitems = [];
  const olditems = [];
  items.forEach(function (newitem) {
    // set the chartype to the type of the actor
    newitem.system.chartype = actor.type;
    // add the item to the array of those to be added to the actor
    newitems.push(newitem);
    const existing = actor.items.filter(item => item.name == newitem.name && item.type == newitem.type);
    while (existing[0]) {
      // if there is already an item of this name and type, delete it
      const current = existing.pop();
      olditems.push(current.id)
    }
  });
  await actor.deleteEmbeddedDocuments('Item', olditems);
  await actor.createEmbeddedDocuments('Item', newitems, { renderSheet: false });
  console.log(`Copied ${newitems.length} items to ${actor.name}.`);
  console.log(`Deleted ${olditems.length} items from ${actor.name}.`);
});

ui.notifications.info(`Conditions have been assigned to tokens. You may proceed.`);
