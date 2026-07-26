// Import Modules
import { BaseActor } from "./module/actor/baseActor.js";
import { ActorVsDClassicSheet } from "./module/actor/actorVsD-sheet.js";
import { BaseItem } from "./module/item/item.js";
import { BaseItemSheet, PoolItemSheet, ModifierItemSheet, VariableItemSheet, ContainerItemSheet } from "./module/item/item-sheet.js";
import { system } from "./module/config.js";
import { VsDTokenDocument, VsDToken, TokenEffects } from "./module/token.js";
import { VsDCombat, VsDCombatTracker, VsDCombatant, VsDCombatantConfig } from "./module/combat/VsDCombat.js";
import { MyDialog } from "./module/dialog.js";
import { ACTOR_DATA_MODELS, ITEM_DATA_MODELS } from "./module/data/models.js";
import "./module/migrations.js";

const { loadTemplates } = foundry.applications?.handlebars ?? { loadTemplates: globalThis.loadTemplates };

/** Normalize AppV1 jQuery / AppV2 HTMLElement hook html args. */
function asJQuery(html) {
  if (!html) return globalThis.$?.();
  if (html.jquery) return html;
  return globalThis.$(html);
}

// Pre-load templates
async function preloadHandlebarsTemplates() {
  const templatePaths = [
    "systems/vsd/templates/partials/gmod.hbs"
  ];
  return loadTemplates(templatePaths);
};

Roll.CHAT_TEMPLATE = "systems/vsd/templates/dice/roll.hbs";
Roll.TOOLTIP_TEMPLATE = "systems/vsd/templates/dice/tooltip.hbs";

Hooks.once('init', () => {

  CONFIG.system = system;

  // Define custom Document classes and TypeDataModels (V13/V14)
  CONFIG.Actor.documentClass = BaseActor;
  CONFIG.Actor.dataModels = ACTOR_DATA_MODELS;
  CONFIG.Item.documentClass = BaseItem;
  CONFIG.Item.dataModels = ITEM_DATA_MODELS;
  CONFIG.Token.documentClass = VsDTokenDocument;
  CONFIG.Token.objectClass = VsDToken;
  CONFIG.system.chartype = "CharacterVsD";

  // Roll an Open-Ended die
  CONFIG.Dice.terms.d.MODIFIERS.oe = async function (modifier) {
    // Match oe2<5>96, oe2=5, oe5, oe
    const rgx = /oe([0-9]+)?([<>=]+)?([0-9]+)?([<>]+)?([0-9]+)?/i;
    const match = modifier.match(rgx);
    if (!match) return false;
    let [depth, lowcomp, lowtarget, highcomp, hightarget] = match.slice(1);

    // set the default range
    let range = Math.ceil(this.faces / 20);

    // If there is no depth, set it to the default range
    depth = Number.isNumeric(depth) ? parseInt(depth) : range;

    // If no comparison or target are provided, use the default range
    if (depth && !(lowtarget || lowcomp)) {
      lowtarget = depth + 1;
      hightarget = this.faces - depth;
      depth = null;
    }
    // Determine lowtarget values
    lowtarget = Number.isNumeric(lowtarget) ? parseInt(lowtarget) : range + 1;

    if (depth && !(hightarget || highcomp)) {
      if (lowcomp == "=") {
        lowtarget += 1;
      }
      hightarget = this.faces - lowtarget + 1;
    }
    // Determine hightarget values
    hightarget = Number.isNumeric(hightarget) ? parseInt(hightarget) : this.faces - range;

    // Recursively explode until there are no remaining results to explode
    let current = 0;
    let newresults = [];
    if (depth == null) depth = 100;

    // only cycle through the original results
    const initial = this.results.length;
    while (current < initial) {
      let thisdepth = depth; // allow current result to explode depth times
      let r = this.results[current];
      newresults.push(r);
      current++;
      if (!r.active) continue;

      // Determine whether to explode this result
      if (foundry.dice.terms.DiceTerm.compareResult(r.result, ">", hightarget)) {
        r.exploded = true;
        let discard = { ...r };
        discard.discarded = true;
        discard.active = false;
        newresults.push(discard);
        let newrollindex = this.results.length;
        await this.roll();
        thisdepth--;
        let newresult = this.results[newrollindex];
        newresult.discarded = true;
        newresult.active = false;
        newresults.push(newresult);
        r.result += newresult.result;
        while (foundry.dice.terms.DiceTerm.compareResult(newresult.result, ">", hightarget) && thisdepth > 0) {
          newresult.exploded = true;
          newrollindex++;
          await this.roll();
          thisdepth--;
          newresult = this.results[newrollindex];
          newresult.discarded = true;
          newresult.active = false;
          newresults.push(newresult);
          r.result += newresult.result;
        }
      } else if (foundry.dice.terms.DiceTerm.compareResult(r.result, "<", lowtarget)) {
        r.exploded = true;
        let discard = { ...r };
        discard.discarded = true;
        discard.active = false;
        newresults.push(discard);
        let newrollindex = this.results.length;
        await this.roll();
        thisdepth--;
        let newresult = this.results[newrollindex];
        newresult.discarded = true;
        newresult.active = false;
        newresult.result = -newresult.result;
        newresults.push(newresult);
        r.result += newresult.result;
        while (foundry.dice.terms.DiceTerm.compareResult(-newresult.result, ">", hightarget) && thisdepth > 0) {
          newresult.exploded = true;
          newrollindex++;
          await this.roll();
          thisdepth--;
          newresult = this.results[newrollindex];
          newresult.discarded = true;
          newresult.active = false;
          newresult.result = -newresult.result;
          newresults.push(newresult);
          r.result += newresult.result;
        }
      }
    }
    this.results = newresults;
  };

  // Which crit was most recently rolled on this browser
  game.settings.register("vsd", "currentCrit", {
    name: "Current Critical Name",
    hint: "Which critical was most recently rolled?",
    scope: "client",
    config: false,
    default: "null",
    type: String
  });
  // Which secondary crit was most recently rolled on this browser
  game.settings.register("vsd", "secondCrit", {
    name: "Second Critical Name",
    hint: "Which secondary critical was most recently rolled?",
    scope: "client",
    config: false,
    default: "null",
    type: String
  });
  // Which actor in this browser most recently made a roll on this browser
  game.settings.register("vsd", "currentActor", {
    name: "Current Actor Name",
    hint: "Which actor most recently made a roll on this browser?",
    scope: "client",
    config: false,
    default: "null",
    type: String
  });

  // Register Macro Dialog Delay
  game.settings.register("vsd", "macroDialogDelay", {
    name: "SETTINGS.macroDialogDelay.name",
    hint: "SETTINGS.macroDialogDelay.hint",
    scope: "client",
    config: true,
    default: 500,
    requiresReload: false,
    type: Number
  });


  // Which Status Effects are we using
  game.settings.register("vsd", "statusEffectChoice", {
    name: "SETTINGS.statusEffectChoice.name",
    hint: "SETTINGS.statusEffectChoice.hint",
    scope: "world",
    config: true,
    default: "ruleset",
    type: String,
    requiresReload: true,
    choices: {
      "ruleset": "Those prepared for the Ruleset",
      "default": "The Foundry default Effects",
      "user-defined": "Those contained in a 'Status Effects' compendium"
    }
  });

  // Register whether using FourAmigos House Rules
  game.settings.register("vsd", "useFAHR", {
    name: "SETTINGS.useFAHR.name",
    hint: "SETTINGS.useFAHR.hint",
    scope: "world",
    config: true,
    default: false,
    requiresReload: true,
    type: Boolean
  });

  // Register whether attack tables should pop up when rolled
  game.settings.register("vsd", "preventTablePopUp", {
    name: "SETTINGS.preventTablePopUp.name",
    hint: "SETTINGS.preventTablePopUp.hint",
    scope: "world",
    config: true,
    default: false,
    requiresReload: false,
    type: Boolean
  });

  // Which Rank counting method are we using?
  game.settings.register("vsd", "rankMode", {
    name: "SETTINGS.rankMode.name",
    hint: "SETTINGS.rankMode.hint",
    scope: "world",
    config: true,
    default: "0:5:2:1:1",
    requiresReload: true,
    type: String
  });

  // Register Combat Tracker in use
  game.settings.register("vsd", "combatTrackerInUse", {
    name: "SETTINGS.combatTrackerInUse.name",
    hint: "SETTINGS.combatTrackerInUse.hint",
    scope: "world",
    config: true,
    default: "vsd",
    requiresReload: true,
    type: String,
    choices: {
      "default": "Foundry Default",
      "vsd": "Against the Darkmaster"
    }
  });
  CONFIG.Combat.tracker = game.settings.get("vsd", "combatTrackerInUse");

  game.settings.register("vsd", "systemMigrationVersion", {
    name: "SETTINGS.systemMigrationVersion.name",
    hint: "SETTINGS.systemMigrationVersion.hint",
    scope: "world",
    config: true,
    type: Number
  });

  // Register Defence Variables
  game.settings.register("vsd", "defenceVariables", {
    name: "SETTINGS.defenceVariables.name",
    hint: "SETTINGS.defenceVariables.hint",
    scope: "world",
    config: true,
    restricted: true,
    default: CONFIG.system.defencevariables.toString(),
    requiresReload: true,
    type: String
  });
  CONFIG.system.defencevariables = game.settings.get("vsd", "defenceVariables").split(",").map(word => word.trim());

  // Register Attack Variables
  game.settings.register("vsd", "attackVariables", {
    name: "SETTINGS.attackVariables.name",
    hint: "SETTINGS.attackVariables.hint",
    scope: "world",
    config: true,
    restricted: true,
    default: CONFIG.system.attackvariables.toString(),
    requiresReload: true,
    type: String
  });
  CONFIG.system.attackvariables = game.settings.get("vsd", "attackVariables").split(",").map(word => word.trim());

  // Register Skill Variables
  game.settings.register("vsd", "skillVariables", {
    name: "SETTINGS.skillVariables.name",
    hint: "SETTINGS.skillVariables.hint",
    scope: "world",
    config: true,
    restricted: true,
    default: CONFIG.system.skillvariables.toString(),
    requiresReload: true,
    type: String
  });
  CONFIG.system.skillvariables = game.settings.get("vsd", "skillVariables").split(",").map(word => word.trim());

  // Register Spell Variables
  game.settings.register("vsd", "spellVariables", {
    name: "SETTINGS.spellVariables.name",
    hint: "SETTINGS.spellVariables.hint",
    scope: "world",
    config: true,
    restricted: true,
    default: CONFIG.system.spellvariables.toString(),
    requiresReload: true,
    type: String
  });
  CONFIG.system.spellvariables = game.settings.get("vsd", "spellVariables").split(",").map(word => word.trim());

  // Register Show Test Data
  game.settings.register("vsd", "showTestData", {
    name: "SETTINGS.showTestData.name",
    hint: "SETTINGS.showTestData.hint",
    scope: "world",
    config: true,
    default: false,
    requiresReload: true,
    type: Boolean
  });
  CONFIG.system.testMode = game.settings.get("vsd", "showTestData");

  // Register Show Hooks Data
  game.settings.register("vsd", "showHooks", {
    name: "SETTINGS.showHooks.name",
    hint: "SETTINGS.showHooks.hint",
    scope: "world",
    config: true,
    default: false,
    requiresReload: true,
    type: Boolean
  });
  CONFIG.debug.hooks = game.settings.get("vsd", "showHooks");

  game.settings.register("vsd", "narrateJustifyLeft", {
    name: "SETTINGS.narrateJustifyLeft.name",
    hint: "SETTINGS.narrateJustifyLeft.hint",
    scope: "client",
    config: true,
    default: false,
    requiresReload: true,
    type: Boolean
  });
  CONFIG.system.narrateJustifyLeft = game.settings.get("vsd", "narrateJustifyLeft");

  /*
  game.settings.register("vsd", "effectSize", {
    name: "SETTINGS.tokenEffectSize.name",
    hint: "SETTINGS.tokenEffectSize.hint",
    default: CONFIG.tokenEffects.effectSizeChoices.large,
    scope: "client",
    type: String,
    choices: CONFIG.tokenEffects.effectSizeChoices,
    config: true,
    onChange: s => {
      TokenEffects.patchCore();
      canvas.draw();
    }
  });
  TokenEffects.patchCore();
  */

  // ================ end of system settings

  // ================ beginning of system setup
  if (CONFIG.Combat.tracker == "vsd") {
    CONFIG.Combat.documentClass = VsDCombat;
    CONFIG.ui.combat = VsDCombatTracker;
    CONFIG.Combatant.documentClass = VsDCombatant;
    CONFIG.Combat.sheetClass = VsDCombatantConfig;
    CONFIG.time.roundTime = 10;
  } else {
    // use the Foundry Default settings
    CONFIG.Combat.documentClass = Combat;
    CONFIG.Combat.initiative.formula = "@bs.value";
  }

  // Change the thickness of the border around Objects. Default = 4
  CONFIG.Canvas.objectBorderThickness = 8;

  // Register sheet application classes (ApplicationV2)
  const ActorsCollection = foundry.documents.collections.Actors;
  const ItemsCollection = foundry.documents.collections.Items;
  ActorsCollection.unregisterSheet("core", foundry.appv1?.sheets?.ActorSheet ?? ActorSheet);
  ActorsCollection.registerSheet("vsd", ActorVsDClassicSheet, {
    types: ["CharacterVsD"],
    makeDefault: true,
    label: "Classic VsD Character Sheet"
  });
  ItemsCollection.unregisterSheet("core", foundry.appv1?.sheets?.ItemSheet ?? ItemSheet);
  ItemsCollection.registerSheet("vsd", BaseItemSheet, {
    types: ["Primary-Attribute", "Melee-Attack", "Ranged-Attack", "Container", "Rollable", "Trait", "Defence", "Equipment", "Hit-Location"],
    makeDefault: true,
    label: "Items"
  });
  ItemsCollection.registerSheet("vsd", PoolItemSheet, {
    types: ["Pool"],
    makeDefault: true,
    label: "Pool Item"
  });
  ItemsCollection.registerSheet("vsd", ModifierItemSheet, {
    types: ["Modifier"],
    makeDefault: true,
    label: "Modifier Item"
  });
  ItemsCollection.registerSheet("vsd", VariableItemSheet, {
    types: ["Variable"],
    makeDefault: true,
    label: "Variable Item"
  });
  ItemsCollection.registerSheet("vsd", ContainerItemSheet, {
    types: ["Container"],
    makeDefault: true,
    label: "Container Item"
  });

  preloadHandlebarsTemplates();

  // If you need to add Handlebars helpers, here are a few useful examples:
  Handlebars.registerHelper('concat', function () {
    var outStr = '';
    for (var arg in arguments) {
      if (typeof arguments[arg] != 'object') {
        outStr += arguments[arg];
      }
    }
    return outStr;
  });

  Handlebars.registerHelper('toLowerCase', function (str) {
    return str.toLowerCase();
  });

  Handlebars.registerHelper('contains', function (str, text) {
    return str.includes(text);
  });

  Handlebars.registerHelper('isModulus', function (value, div, rem) {
    return value % div == rem;
  });

  Handlebars.registerHelper('debug', function (text, content) {
    return console.debug(text, content);
  });

  Handlebars.registerHelper('toSentenceCase', function (str) {
    return str.replace(
      /\w\S*/g,
      function (txt) {
        return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
      }
    );
  });

  Handlebars.registerHelper('times', function (n, content) {
    let result = "";
    for (let i = 0; i < n; ++i) {
      content.data.index = i + 1;
      result += content.fn(i);
    }
    return result;
  });

  Handlebars.registerHelper('slugify', function (str) {
    return system.slugify(str);
  });

  Handlebars.registerHelper('isnum', function (num) {
    return Number.isInteger(num);
  });

});

Hooks.once('ready', async function () {

  CONFIG.system.hasCore = game.packs.find(key => (key.metadata.id.includes("vsd-core"))) != undefined;
  console.debug("Has Core", CONFIG.system.hasCore);

  switch (game.settings.get("vsd", "statusEffectChoice")) {
    case "default":
      break;
    case "ruleset":
      CONFIG.statusEffects = CONFIG.statusEffectsVsD;
      break;
    case "user-defined": {
      const temp = await game.packs.get(`world.status-effects`)?.getDocuments() || [];
      console.log("Status Effects", temp);
      const effects = [];
      temp.forEach(function (effect) {
        effects.push({
          img: effect.img,
          id: system.slugify(effect.name),
          name: effect.name,
          itemId: effect._id
        });
      });
      CONFIG.statusEffects = effects;
      break;
    }
  }

  system.selectOptions = {
    defence_category: [
      { value: "dodge", label: "local.item.Defence.dodge" },
      { value: "block", label: "local.item.Defence.block" }
    ],
    injuryType: [
      { value: "na", label: "local.item.Hit-Location.na" },
      { value: "minor", label: "local.item.Hit-Location.minor" },
      { value: "serious", label: "local.item.Hit-Location.serious" },
      { value: "crippling", label: "local.item.Hit-Location.crippling" }
    ],
    toCripple: [
      { value: "none", label: "local.item.Hit-Location.none" },
      { value: "critical", label: "local.item.Hit-Location.critical" },
      { value: "failure", label: "local.item.Hit-Location.failure" },
      { value: "partial", label: "local.item.Hit-Location.partial" },
      { value: "success", label: "local.item.Hit-Location.success" },
      { value: "outstanding", label: "local.item.Hit-Location.outstanding" }
    ],
    melee_damage: [
      { value: game.i18n.localize('local.tables.edged'), label: "local.shorttables.edged" },
      { value: game.i18n.localize('local.tables.blunt'), label: "local.shorttables.blunt" },
      { value: game.i18n.localize('local.tables.unarmed'), label: "local.shorttables.unarmed" },
      { value: game.i18n.localize('local.tables.beasta'), label: "local.shorttables.beasta" }
    ],
    melee_damageType: [
      { value: game.i18n.localize('local.tables.beastc'), label: "local.shorttables.beastc" },
      { value: game.i18n.localize('local.tables.impact'), label: "local.shorttables.impact" },
      { value: game.i18n.localize('local.tables.cut'), label: "local.shorttables.cut" },
      { value: game.i18n.localize('local.tables.pierce'), label: "local.shorttables.pierce" },
      { value: game.i18n.localize('local.tables.grapple'), label: "local.shorttables.grapple" }
    ],
    melee_secondary: [
      { value: game.i18n.localize('local.tables.none'), label: "local.shorttables.none" },
      { value: game.i18n.localize('local.tables.beastc'), label: "local.shorttables.beastc" },
      { value: game.i18n.localize('local.tables.impact'), label: "local.shorttables.impact" },
      { value: game.i18n.localize('local.tables.cut'), label: "local.shorttables.cut" },
      { value: game.i18n.localize('local.tables.pierce'), label: "local.shorttables.pierce" },
      { value: game.i18n.localize('local.tables.grapple'), label: "local.shorttables.grapple" }
    ],
    modifier_category: [
      { value: "attack", label: "local.item.Modifier.attack" },
      { value: "defence", label: "local.item.Modifier.defence" },
      { value: "skill", label: "local.item.Rollable.skill" },
      { value: "spell", label: "local.item.Rollable.spell" },
      { value: "reaction", label: "local.item.Modifier.reaction" },
      { value: "primary", label: "local.item.Modifier.primary" }
    ],
    ranged_damage: [
      { value: game.i18n.localize('local.tables.missile'), label: "local.shorttables.missile" },
      { value: game.i18n.localize('local.tables.area'), label: "local.shorttables.area" },
      { value: game.i18n.localize('local.tables.bolt'), label: "local.shorttables.bolt" }
    ],
    ranged_damageType: [
      { value: game.i18n.localize('local.tables.pierce'), label: "local.shorttables.pierce" },
      { value: game.i18n.localize('local.tables.impact'), label: "local.shorttables.impact" },
      { value: game.i18n.localize('local.tables.cut'), label: "local.shorttables.cut" },
      { value: game.i18n.localize('local.tables.fire'), label: "local.shorttables.fire" },
      { value: game.i18n.localize('local.tables.lightning'), label: "local.shorttables.lightning" },
      { value: game.i18n.localize('local.tables.frost'), label: "local.shorttables.frost" },
      { value: game.i18n.localize('local.tables.dark'), label: "local.shorttables.dark" }
    ],
    ranged_secondary: [
      { value: game.i18n.localize('local.tables.none'), label: "local.shorttables.none" },
      { value: game.i18n.localize('local.tables.pierce'), label: "local.shorttables.pierce" },
      { value: game.i18n.localize('local.tables.impact'), label: "local.shorttables.impact" },
      { value: game.i18n.localize('local.tables.cut'), label: "local.shorttables.cut" },
      { value: game.i18n.localize('local.tables.fire'), label: "local.shorttables.fire" },
      { value: game.i18n.localize('local.tables.lightning'), label: "local.shorttables.lightning" },
      { value: game.i18n.localize('local.tables.frost'), label: "local.shorttables.frost" },
      { value: game.i18n.localize('local.tables.dark'), label: "local.shorttables.dark" }
    ],
    rollable_category: [
      { value: "check", label: "local.item.Rollable.check" },
      { value: "skill", label: "local.item.Rollable.skill" },
      { value: "spell", label: "local.item.Rollable.spell" }
    ],
    trait_category: [
      { value: "advantage", label: "local.item.Trait.advantage" },
      { value: "disadvantage", label: "local.item.Trait.disadvantage" },
      { value: "perk", label: "local.item.Trait.perk" },
      { value: "quirk", label: "local.item.Trait.quirk" },
      { value: "charactertrait", label: "local.item.Trait.charactertrait" },
      { value: "language", label: "local.item.Trait.language" },
      { value: "experience", label: "local.item.Trait.experience" }
    ],
    withoutshield: [
      { value: "none", label: 'local.header.shield.position.none' },
      { value: "front", label: 'local.header.shield.position.front', disabled: true },
      { value: "side", label: 'local.header.shield.position.side', disabled: true }
    ],
    withshield: [
      { value: "none", label: 'local.header.shield.position.none', disabled: true },
      { value: "front", label: 'local.header.shield.position.front' },
      { value: "side", label: 'local.header.shield.position.side' }
    ],
  };

  /**
   * Fetch the journals from Compendia for reference
   */
  const packjournals = await game.packs.get("vsd.vsd-journals").getDocuments();
  system.journalref = {};
  packjournals.forEach((je) => {
    system.journalref[system.slugify(je.name)] = je;
    if (je.pages.size > 1) {
      je.pages.contents.forEach((jep) => {
        system.journalref[system.slugify(jep.name)] = jep;
      });
    }
  });

  /**
   * Insert the premium content journals here.
   */
  const premiumjournals = await game.packs.get("vsd-core.core-journal-entries")?.getDocuments() || [];
  premiumjournals.forEach((je) => {
    system.journalref[system.slugify(je.name)] = je;
    if (je.pages.size > 1) {
      je.pages.contents.forEach((jep) => {
        system.journalref[system.slugify(jep.name)] = jep;
      });
    }
  });


  // prioritise journals in the sidebar as they may have been edited by the user
  const sidebarjournals = game.journal.contents;
  sidebarjournals.forEach((je) => {
    system.journalref[system.slugify(je.name)] = je;
    if (je.pages.size > 1) {
      je.pages.contents.forEach((jep) => {
        system.journalref[system.slugify(jep.name)] = jep;
      });
    }
  });
});

Hooks.on('getSceneControlButtons', (controls) => {
  console.debug("Get Scene Control Buttons");
  // V13+: controls is a keyed object (not an array)
  const tokenTools = controls.tokens?.tools;
  if (!tokenTools) return;
  tokenTools.assignStatusEffects = {
    name: "assignStatusEffects",
    title: "HUD.AssignStatusEffects",
    icon: "fa-solid fa-user-gear",
    order: Object.keys(tokenTools).length,
    button: true,
    onChange: async () => {
      const renderTpl = foundry.applications?.handlebars?.renderTemplate ?? renderTemplate;
      const content = await renderTpl("systems/vsd/templates/rollmacro/status-effect-toggle.hbs", {
        statusEffects: CONFIG.statusEffects
      });

      new MyDialog({
        title: "Assign Status Effects",
        buttons: [],
        content: content,
      }, {
        width: 200,
        height: "fit-content",
        classes: ["mydialog"],
        top: 70,
        left: 110,
      }).render(true);
    }
  };
});

/**
 * ################### Active Effect Hooks ###################
 */
Hooks.on('createActiveEffect', async (effect, options, user) => {
  if (user != game.user.id) return;

  let userEffectCompendiumName = 'world.status-effects';

  if (game.settings.get("vsd", "statusEffectChoice") == "ruleset") {
    userEffectCompendiumName = (CONFIG.system.hasCore) ? "vsd-core.core-status-effects" : "vsd.vsd-status-effects";
  }

  const userEffect = game.packs.get(userEffectCompendiumName)?.index.getName(effect.name);

  if (userEffect) {
    const effectItem = await fromUuid(userEffect.uuid);
    await effect.parent.createEmbeddedDocuments("Item", [effectItem]);
  }
  console.debug("Create", [effect]);
});

Hooks.on('deleteActiveEffect', async (effect, options, user) => {
  if (user != game.user.id) return;
  const existing = effect.parent.items.filter(item => item.name == effect.name && item.type == "Modifier");
  const olditems = [];
  while (existing[0]) {
    olditems.push(existing.pop().id)
  }
  await effect.parent.deleteEmbeddedDocuments("Item", olditems);
  console.debug("Delete", [effect]);
});

/**
 * Organise some data before rendering the sheet
 */
Hooks.on("getBaseActorSheetHeaderButtons", (sheet, buttonarray) => {
  if (CONFIG.system.testMode) {
    console.debug("getBaseActorSheetHeaderButtons\n", [sheet, buttonarray]);
  }
  return;
  // This happens before the call to render the sheet
});

/**
 * Organise some data before rendering the sheet
 */
Hooks.on("createActor", async (actor) => {
  if (CONFIG.system.testMode) {
    console.debug("VsD system: createActor\n", [actor]);
  }
  if (actor.items.size == 0 && game.users.activeGM.isSelf) {
    console.debug(`Creating basic items for: ${actor.name}`);
    const newitems = await game.packs.get("vsd.vsd-actor-items").getDocuments();
    await actor.createEmbeddedDocuments('Item', newitems, { renderSheet: false });
    // there are no actor items in the core module anymore
    // Hooks.call("vsdNewActorCreated", actor);
  }
  return;
});

/**
 * Organise some data before closing the sheet
 *
 * Reset temporary modifiers and variables
 */
Hooks.on("closeActorSheet", (sheet, html) => {
  const actor = sheet.actor;
  if (CONFIG.system.testMode) {
    console.debug("closeActorSheet\n", [sheet, html, actor.system]);
  }
  return;
});

/**
 * Specific Tailoring of actor types on creation
 *
 * Preparing to fake actor subclasses and need to make all actor templates the same
 */
Hooks.on("preCreateActor", (document, data, options, userId) => {
  if (CONFIG.system.testMode)
    console.debug("preCreateActor:\n", [document, data, options, userId]);
  // if the actor has an image, it already exists. No reason to be doing anything to it here yet.
  if (data.img) return;

  const newdata = {};

  // set the basic features according to system requirements
  switch (data.type) {
    case "CharacterVsD": {
      newdata.bm = {
        step: 15,
      };
      break;
    }
  }
  data.system = newdata;
  data.flags = { core: { sheetClass: "vsd.ActorVsDClassicSheet" } };

  // TODO:document updates require an _id to function and this cannot have one
  document.updateSource(data);
});

/**
 * Specific Tailoring of actor types on creation
 *
 * Preparing to fake actor subclasses and need to make all actor templates the same
 */
Hooks.on("preUpdateActor", (document, data, options, userId) => {
  if (CONFIG.system.testMode)
    console.debug("preUpdateActor:\n", [document, data, options, userId]);

  // if diff is false it is probably a data import otherwise return
  if (options.diff) return;

  try {
    console.debug(ImagePopout.getImageSize(data.img));
    return;
  } catch (err) {
    console.error(err);
  }

  // if you get here, there is no image or they are in a place we cannot be sure to reach
  data.img = "icons/svg/mystery-man-black.svg";
  data.token.img = "icons/svg/mystery-man-black.svg";

  document.updateSource(data);
});

Hooks.on('dropCanvasData', (canvas, data) => {
  // is there a token under the drop point?
  for (let token of canvas.tokens.ownedTokens) {
    if (token.x > data.x) continue;
    if (token.y > data.y) continue;
    if (token.x + token.w < data.x) continue;
    if (token.y + token.h < data.y) continue;

    return token.actor.sheet._onTokenDrop(data, token);
  }
});

/**
 * Set the dimensions for a spell description journal (not working properly at the moment)
 */
Hooks.on("getJournalSheetHeaderButtons", (log, headerbuttons) => {

  if (log._pages[0]?.text.content?.includes("spell-choice")) { // this is a spell description journal
    log.position.height = 500;
    log.position.width = 435;
  }
});

/**
* add listeners to rendered journal text pages
*/
Hooks.on("renderJournalTextPageSheet", (document, html, data) => {
  html = asJQuery(html);

  // open a Journal Entry
  html.on('click', '.open-journal', ev => {
    system.showJournal(ev.currentTarget.dataset.table);
  });

  // open a Compendium
  html.on('click', '.open-compendium', ev => {
    ev.stopPropagation();
    game.packs.get(ev.currentTarget.dataset.name).render(true);
  });

  // send a message to the chat log
  html.on('click', '.rollable', ev => {
    // data stored in the enclosing element
    let parentset = "";
    // data stored in this element
    let dataset = ev.currentTarget.dataset;
    let message = "";
    let armour = "";
    let crit = "";
    let sec = "";
    const crittype = game.settings.get("vsd", "currentCrit") || "";
    const sectype = game.settings.get("vsd", "secondCrit") || "none";

    switch (dataset.type) {
      case "attack": {
        parentset = ev.currentTarget.parentElement.dataset;
        switch (dataset.armour) {
          // case "na": armour = "No Armor"; break;
          case "na": armour = `${game.i18n.localize(`COMBAT.dataset.armour.no_armor`)}`; break;
          // case "la": armour = "Light Armor"; break;
          case "la": armour = `${game.i18n.localize(`COMBAT.dataset.armour.light_armor`)}`; break;
          // case "ma": armour = "Medium Armor"; break;
          case "ma": armour = `${game.i18n.localize(`COMBAT.dataset.armour.medium_armor`)}`; break;
          // case "ha": armour = "Heavy Armor"; break;
          case "ha": armour = `${game.i18n.localize(`COMBAT.dataset.armour.heavy_armor`)}`; break;
        }
        switch (dataset.crit) {
          // case "Sup": crit = "Superficial"; break;
          case "Sup": crit = `${game.i18n.localize(`COMBAT.dataset.crit.superficial`)}`; break;
          // case "Lig": crit = "Light +10"; break;
          case "Lig": crit = `${game.i18n.localize(`COMBAT.dataset.crit.light`)}`; break;
          // case "Mod": crit = "Moderate +20"; sec = "Superficial"; break;
          case "Mod": crit = `${game.i18n.localize(`COMBAT.dataset.crit.moderate`)}`; sec = `${game.i18n.localize(`COMBAT.dataset.sec.moderate`)}`; break;
          // case "Gri": crit = "Grievous +30"; sec = "Light +10"; break;
          case "Gri": crit = `${game.i18n.localize(`COMBAT.dataset.crit.grievous`)}`; sec = `${game.i18n.localize(`COMBAT.dataset.sec.grievous`)}`; break;
          // case "Let": crit = "Lethal +50"; sec = "Moderate +20"; break;
          case "Let": crit = `${game.i18n.localize(`COMBAT.dataset.crit.lethal`)}`; sec = `${game.i18n.localize(`COMBAT.dataset.sec.lethal`)}`; break;
        }
        message += `<table class="attack-result"><tr><td>${game.i18n.localize(`local.rolls.table`)}:</td><td>${parentset.table}</td></tr>`;
        message += `<tr><td>${game.i18n.localize(`local.rolls.roll`)}:</td><td>${parentset.roll}</td></tr>`;
        message += `<tr><td>${game.i18n.localize(`local.rolls.against`)}:</td><td>${armour}</td></tr></table>`;
        message += `<p class="damageresult" data-type="damage" data-hits="${dataset.hits}"><b>${dataset.hits}</b> ${game.i18n.localize(`COMBAT.chat_message.hits`)}</p>`;
        if (crit) {
          // message += `<p class="critseverity" data-type="severity" data-crit="${crit}"><b>${crit} - ${crittype}</b><br>critical strike. <a class="rollmacro" data-category="dodge" data-target="Critical (${crittype}"> <i class="fas fa-scroll" style="color:coral"></i></a></p>`;
          message += `<p class="critseverity" data-type="severity" data-crit="${crit}"><b>${crit} - ${crittype}</b><br>${game.i18n.localize(`COMBAT.chat_message.critical_strike`)} <a class="rollmacro" data-category="dodge" data-target="Critical (${crittype}"> <i class="fas fa-scroll" style="color:coral"></i></a></p>`;
        }
        if (sec != "" && sectype != "none") {
          // message += `<p class="critseverity" data-type="severity" data-crit="${sec}"><b>${sec} - ${sectype}</b><br>critical strike. <a class="rollmacro" data-category="dodge" data-target="Critical (${sectype}"> <i class="fas fa-scroll" style="color:coral"></i></a></p>`;
          message += `<p class="critseverity" data-type="severity" data-crit="${sec}"><b>${sec} - ${sectype}</b><br>${game.i18n.localize(`COMBAT.chat_message.critical_strike`)} <a class="rollmacro" data-category="dodge" data-target="Critical (${sectype}"> <i class="fas fa-scroll" style="color:coral"></i></a></p>`;
        }
        system.closeJournal(parentset.table);
        break;
      }
      case "fearsaveroll":
      case "reactionrolls":
      case "spellfailure":
      case "spellcasting":
      case "missilefumble":
      case "meleethrownfumble":
      case "magicalresonance": {
        message += `<table class="critical-result"><tr><td>${game.i18n.localize(`local.rolls.table`)}:</td><td>${dataset.table}</td></tr>`;
        message += `<tr><td>${game.i18n.localize(`local.rolls.roll`)}:</td><td>${dataset.roll}</td></tr></table>`;
        message += `<p><b>${dataset.result}</b></p>`;
        break;
      }
      case "critical": {
        // todo: do we have access to the actor name for the speaker?
        // todo: include a link to the crit table we just rolled so it can be re-opened quickly
        message += `<table class="critical-result"><tr><td>${game.i18n.localize(`local.rolls.table`)}:</td><td class="open-journal" data-table="${dataset.table}">${dataset.table}</td></tr>`;
        message += `<tr><td>${game.i18n.localize(`local.rolls.roll`)}:</td><td>${dataset.roll}</td></tr></table>`;
        if (dataset.condition != "null") {
          message += `<p><b>${dataset.result}</b></p>`;
          // message += `<p class="critresult" data-type="critical" data-message="${dataset.result}" data-woundtitle="${dataset.woundtitle}" data-hits="${dataset.hits1}" data-bleed="${dataset.bleed1}" data-action="${dataset.action1}" data-effect="${dataset.effect1}">Has ${dataset.condition}</p>`;
          message += `<p class="critresult" data-type="critical" data-message="${dataset.result}" data-woundtitle="${dataset.woundtitle}" data-hits="${dataset.hits1}" data-bleed="${dataset.bleed1}" data-action="${dataset.action1}" data-effect="${dataset.effect1}">${game.i18n.localize(`COMBAT.chat_message.has`)} ${dataset.condition}</p>`;

          // message += `<p class="critresult" data-type="critical" data-message="${dataset.result}" data-woundtitle="${dataset.woundtitle}" data-hits="${dataset.hits2}" data-bleed="${dataset.bleed2}" data-action="${dataset.action2}" data-effect="${dataset.effect2}">Does not</p>`;
          message += `<p class="critresult" data-type="critical" data-message="${dataset.result}" data-woundtitle="${dataset.woundtitle}" data-hits="${dataset.hits2}" data-bleed="${dataset.bleed2}" data-action="${dataset.action2}" data-effect="${dataset.effect2}">${game.i18n.localize(`COMBAT.chat_message.does_not`)}</p>`;
        } else { // there is no condition, only a single outcome
          message += `<p class="critresult" data-type="critical" data-message="${dataset.result}" data-woundtitle="${dataset.woundtitle}" data-hits="${dataset.hits1}" data-bleed="${dataset.bleed1}" data-action="${dataset.action1}" data-effect="${dataset.effect1}">${dataset.result}</p>`;
        }
        system.closeJournal(dataset.table);
        break;
      }
      case "spell": {
        message += `<table class="spell-choice"><tr class="open-journal" data-table="${dataset.table}"><td>${game.i18n.localize(`local.rolls.spell.lore`)}:</td><td>${dataset.table}</td></tr>`;
        message += `<tr><td>${game.i18n.localize(`local.rolls.spell.weave`)}:</td><td>${dataset.weave}</td></tr>`;
        message += `<tr class="open-journal" data-table="${dataset.spell}"><td>${game.i18n.localize(`local.rolls.spell.spell`)}:</td><td class="spellname">${dataset.spell}</td></tr>`;
        message += `<tr><td>${game.i18n.localize(`local.rolls.spell.range`)}:</td><td>${dataset.range}</td></tr>`;
        message += `<tr><td>${game.i18n.localize(`local.rolls.spell.aoe`)}:</td><td>${dataset.aoe}</td></tr>`;
        message += `<tr><td>${game.i18n.localize(`local.rolls.spell.duration`)}:</td><td>${dataset.duration}</td></tr>`;
        message += `<tr><td>${game.i18n.localize(`local.rolls.spell.save`)}:</td><td>${dataset.save}</td></tr></table>`;
        // todo: add description and warps for premium content
        system.closeJournal(dataset.spell);
        break;
      }
      default: {
        ui.notifications.info(`Journal rolling for Type:${dataset.type} is not supported yet.`);
        return;
      }
    }
    ChatMessage.create({
      speaker: { actor: game.settings.get("vsd", "currentActor") },
      content: message,
    });
  });

});

Hooks.on('createItem', (document, options, userId) => {
  if (CONFIG.system.testMode) console.debug("createItem:\n", [document, options, userId]);
  const docdata = document.system;

  // items dragged from the sidebar will lose their moddedformula if they have one so calculate it again
  switch (document.type) {
    case "Melee-Attack":
    case "Ranged-Attack":
    case "Defence":
    case "Rollable": {
      if (CONFIG.system.testMode) console.debug("Item Data:\n", docdata);
      if (docdata.formula) { // we will recalculate the value if the formula does not contain an @dependency
        let formula = docdata.formula;
        if (Number.isNumeric(formula)) {
          // the formula is a number
          docdata.value = Number(formula);
        } else if (formula.includes("#") || formula.includes("@")) {
          // the formula has ranks or a reference and will be processed in prepareDerivedData
        } else {
          // the formula should be a valid dice expression so has no value
          docdata.value = 0;
          docdata.moddedvalue = 0;
          docdata.moddedformula = formula;
        }
      }
      break;
    }
    case "Modifier": {
      if (docdata.alwaysOn) docdata.inEffect = true;
      break;
    }
  }
});

Hooks.on('preCreateItem', (document, data, options, userId) => {
  if (CONFIG.system.testMode) console.debug("preCreateItem:\n", [document, data, options, userId]);

  let itemdata = data.system;

  if (document.id) {// This item exists already but may have the wrong chartype
    if (document.actor) {
      // if there is an actor and the chartype matches then exit
      if (document.actor.type == itemdata.chartype) return;
      itemdata.chartype = document.actor.type;
    } else {
      // if the chartype matches the ruleset then exit
      if (CONFIG.system.chartype == itemdata.chartype) return;
      itemdata.chartype = CONFIG.system.chartype;
    }
    // correct the chartype then exit
    document.updateSource(data);
    return;
  } else if (!itemdata) {
    // the item is being created from the item sidebar so give it a chartype
    itemdata = data.system = {};
    itemdata.chartype = CONFIG.system.chartype;
  }

  if (!itemdata.group) { // initialise group field to match item category or type
    itemdata.group = itemdata.category || data.type;
  }

  if (data.name != data.type) {
    // this is an existing item being dropped in a container
    document.updateSource(data);
    return;
  }
  if (!data.img) {
    data.img = "icons/svg/mystery-man-black.svg";
  }
  document.updateSource(data);
});

/**
* add listeners to dialog boxes
*/
Hooks.on("renderDialog", (dialog, html, data) => {
  html = asJQuery(html);

  if (data.content?.includes("statuseffectsdialog")) {

    // toggle a status effect on selected tokens
    html.on('click', '.status-effect', ev => {
      console.log("Status Effect Toggle", ev);
      const statusId = ev.currentTarget.dataset.statusId;
      if (canvas.tokens.controlled.length == 0) {
        ui.notifications.error("Please select at least one token first");
        return;
      }
      for (const token of canvas.tokens.controlled) {
        token.document.actor.toggleStatusEffect(statusId);
      }
    });
  }

  // isolate these listeners to mydialog windows
  if (data.content?.includes("mydialog")) {
    const actor = dialog.data.options.actor;
    const macroData = dialog.data.options.macroData;
    const delay = game.settings.get("vsd", "macroDialogDelay");

    // prevent 'enter' from submitting the form but allow it to make a change to an input.
    html.on('keydown', '.iteminput', ev => {
      if (ev.keyCode == 13) {
        ev.stopPropagation();
      }
    });

    // Open Journal Entries from a dialog window
    html.on('click', '.open-journal', ev => {
      system.showJournal(ev.currentTarget.dataset.table);
    });

    html.on("change", "select", async ev => {
      if (macroData || ev.currentTarget.name == "") {
        // do nothing. It will be handled by iteminput below
      } else {
        await actor.update({ [ev.currentTarget.name]: ev.currentTarget.value });
        const type = ev.currentTarget.closest(".mydialog").dataset.type;
        actor.actiondialog(type);
        dialog.close();
      }
    });

    // Update the GMod and primaries
    html.on('change', '.iteminput', async ev => {
      await actor.sheet._onInputChange(ev);
      await new Promise(r => setTimeout(r, delay));
      if (macroData) {
        macroData.position.left = ev.delegateTarget.offsetLeft;
        macroData.position.top = ev.delegateTarget.offsetTop - 3;
        actor.modifierdialog(ev.currentTarget.dataset.attackId, macroData);
      } else {
        const type = ev.currentTarget.closest(".mydialog").dataset.type;
        actor.actiondialog(type);
      }
      dialog.close();
    });

    // Set the EDB to the selected value
    html.on('click', '.setdefence', async ev => {
      if (macroData) {
        macroData.position.left = ev.delegateTarget.offsetLeft;
        macroData.position.top = ev.delegateTarget.offsetTop - 3;
        await actor.system.dynamic.edb.update({ ['system.attr']: Number(ev.currentTarget.dataset.db) });
        await new Promise(r => setTimeout(r, delay));
        actor.modifierdialog(ev.currentTarget.dataset.itemId, macroData);
      } else {
      }
      dialog.close();
    });

    // Select the attack to process
    html.on('click', '.selectable', async ev => {
      if (macroData) {
        macroData.position.left = ev.delegateTarget.offsetLeft;
        macroData.position.top = ev.delegateTarget.offsetTop - 3;
        actor.modifierdialog(ev.currentTarget.dataset.itemId, macroData);
      } else {
        if (ev.currentTarget.dataset.type == "refresh" && game.canvas.tokens.controlled?.length == 1) {
          // if the user is the owner of the selected token, open that sheet
          const tokenactor = game.canvas.tokens.controlled[0].actor;
          if (tokenactor?.isOwner) {
            tokenactor.actiondialog();
          }
        } else {
          await actor.update({ "data.bm.step": ev.currentTarget.dataset.direction });
          ev.currentTarget = ev.currentTarget.previousElementSibling;
          await actor.sheet._onInputChange(ev);
          await new Promise(r => setTimeout(r, delay));
          actor.actiondialog();
        }
      }
      dialog.close();
    });

    // process the rollable item
    html.on('click', '.rollable', ev => {
      actor.sheet._onRoll(ev);
      if (macroData && ev.currentTarget.dataset.type != "modlist") dialog.close();
    });

    // process the rollable item
    html.on('click', '.rollmacro', ev => {
      actor.sheet._rollmacro(ev);
    });

    // allow modifiers to be toggled
    html.on('click', '.item-toggle', async ev => {
      await actor.sheet._onToggleItem(ev);
      if (macroData) {
        macroData.position.left = ev.delegateTarget.offsetLeft;
        macroData.position.top = ev.delegateTarget.offsetTop - 3;
        actor.modifierdialog(ev.currentTarget.dataset.attackId, macroData);
      } else {
        const type = ev.currentTarget.closest(".mydialog").dataset.type;
        actor.actiondialog(type);
      }
      dialog.close();
    });
  }
});

Hooks.on('preCreateChatMessage', (message, options, userid) => {
  if (message.flags.core?.initiativeRoll) {
    return false;
  }
});

/**
 * add listeners to chat messages in the log
 */
Hooks.on("renderChatLog", (log, html, data) => {
  html = asJQuery(html);

  html.on('click', '.open-journal', ev => {
    system.showJournal(ev.currentTarget.dataset.table);
  });

});

Hooks.on("renderChatMessage", async (app, html, msg) => {
  const actor = game.actors.get(msg.message.speaker.actor) || null;
  const $html = asJQuery(html);
  const root = $html?.[0] ?? html;

  // the Narrative Tools module with left-justification instead of centred
  if (CONFIG.system.narrateJustifyLeft) {
    root?.classList?.add('left');
  };

  // process the rollable item
  $html.on('click', '.rollable', ev => {
    actor?.sheet._onRoll(ev);
  });

  // process the rollmacro item
  $html.on('click', '.rollmacro', ev => {
    actor?.sheet._rollmacro(ev);
  });

  $html.find(".critresult").each(function () {
    let exp = $(this)[0]
    exp.setAttribute("draggable", true)
    exp.addEventListener('dragstart', ev => {
      let dataTransfer = {
        type: $(exp).attr("data-type"),
        message: $(exp).attr("data-message"),
        woundtitle: $(exp).attr("data-woundtitle"),
        condition: $(exp).attr("data-condition"),
        hits: $(exp).attr("data-hits"),
        bleed: $(exp).attr("data-bleed"),
        action: $(exp).attr("data-action"),
        effect: $(exp).attr("data-effect")
      }
      ev.dataTransfer.setData("text/plain", JSON.stringify(dataTransfer));
    })
  });

  $html.find(".damageresult").each(function () {
    let exp = $(this)[0]
    exp.setAttribute("draggable", true)
    exp.addEventListener('dragstart', ev => {
      let dataTransfer = {
        type: $(exp).attr("data-type"),
        hits: $(exp).attr("data-hits")
      }
      ev.dataTransfer.setData("text/plain", JSON.stringify(dataTransfer));
    })
  });

  $html.find(".dynamicitem").each(function () {
    let exp = $(this)[0]
    exp.setAttribute("draggable", true)
    exp.addEventListener('dragstart', ev => {
      let dataTransfer = {
        type: $(exp).attr("data-type"),
        id: exp.parentNode.parentNode.dataset.messageId
      }
      ev.dataTransfer.setData("text/plain", JSON.stringify(dataTransfer));
    })
  });

  $html.find(".defencevalue").each(function () {
    let exp = $(this)[0]
    exp.setAttribute("draggable", true)
    exp.addEventListener('dragstart', ev => {
      let dataTransfer = {
        type: $(exp).attr("data-type"),
        db: $(exp).attr("data-db")
      }
      ev.dataTransfer.setData("text/plain", JSON.stringify(dataTransfer));
    })
  });

  $html.find(".critseverity").each(function () {
    let exp = $(this)[0]
    exp.setAttribute("draggable", true)
    exp.addEventListener('dragstart', ev => {
      let dataTransfer = {
        type: $(exp).attr("data-type"),
        crit: $(exp).attr("data-crit")
      }
      ev.dataTransfer.setData("text/plain", JSON.stringify(dataTransfer));
    })
  });

});
