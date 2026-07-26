import { system } from "../config.js";
import { MyDialog } from "../dialog.js";

/**
 * Extend the base Actor document by defining a custom roll data structure which is ideal for the Simple system.
 * @extends {Actor}
 */
export class BaseActor extends Actor {
  /**
   * Fetch and sort all the items, even though they will be prepared internally after this stage.
   */
  prepareBaseData() {
    const actordata = this.system;
    if (CONFIG.system.testMode)
      console.debug("entering prepareBaseData()\n", [this, actordata]);

    actordata.useFAHR = game.settings.get("vsd", "useFAHR");
    actordata.rankMode = game.settings.get("vsd", "rankMode");

    /**
     * Reference data structure to mimic static systems
     */
    actordata.dynamic = {};
    actordata.tracked = {};
    actordata.modifiers = {};

    // set some basic values
    actordata.dynamic.woundsbleed = { system: { moddedvalue: 0 } };
    actordata.dynamic.woundspen = { system: { moddedvalue: 0 } };
    actordata.dynamic.scale = { system: { moddedvalue: game.scenes?.current?.grid.distance || 1.5 }, };
    actordata.dynamic.visionType = "normal";
  }

  /**
   * Augment the basic actor data with additional dynamic data.
   *
   * Changes made here to item seem to stick.
   */
  prepareDerivedData() {
    const actor = this;
    const actordata = this.system;
    if (CONFIG.system.testMode) console.debug("entering prepareDerivedData()\n", [this, actordata]);

    const tempskills = [];
    const tempspells = [];
    const tempperks = [];
    const temppools = [];

    const rollables = [];
    const primods = [];
    const defencemods = [];
    const reactionmods = [];
    const mods = [];
    const nonmods = [];

    let nextLayer = [];
    let previousLayer = [];
    const rankitems = [];
    const actorranks = {};

    // write the items into the model
    for (const item of actor.items.contents) {
      const itemdata = item.system;
      let itemID = system.slugify(item.name);
      // collect non-modifier items with formula
      if (itemdata.formula) nonmods.push(item);

      switch (item.type) {
        case "Primary-Attribute": {
          itemID = system.slugify(itemdata.abbr);
          // only process primaries with abbreviations
          if (itemID) {
            actordata.dynamic[itemID] = item;
            nextLayer.push(itemID);
          }
          break;
        }
        case "Pool": {
          itemID = system.slugify(itemdata.abbr);
          if (itemID) {
            actordata.tracked[itemID] = item;
            if (itemdata.hasmax && itemdata.hasmin) {
              nextLayer.push(itemID);
            } else {
              nonmods.push(item);
            }
          }
          temppools.push(item);
          break;
        }
        case "Hit-Location": {
          actordata.dynamic.woundsbleed.system.moddedvalue += itemdata.damageResistance;
          actordata.dynamic.woundspen.system.moddedvalue += itemdata.damage;
          break;
        }
        case "Variable": {
          // add any items whose name starts with "Ranks:" to the list to be polled next
          if (item.name.startsWith("Ranks:")) rankitems.push(item);
          if (item.name.startsWith("Vocation:")) actordata.dynamic["vocation"] = item;
        }
        case "Ranged-Attack":
        case "Melee-Attack":
        case "Defence":
        case "Rollable": {
          actordata.dynamic[itemID] = item;
          if (Number.isNumeric(itemdata.formula) || itemdata.formula.startsWith("#"))
            nextLayer.push(itemID);
          rollables.push(item);
          switch (itemdata.category) {
            case "skill":
            case "technique": {
              tempskills.push(item);
              break;
            }
            case "spell":
            case "rms": {
              tempspells.push(item);
              break;
            }
          }
          break;
        }
        case "Trait": {
          switch (itemdata.category) {
            case "perk": {
              // Traits that define a vision type for the actor
              switch (item.name) {
                case "Keen Senses":
                case "Night Sight":
                case "Dark Sight":
                case "Darkvision":
                case "Star Sight": {
                  actordata.dynamic.visionType = item.name;
                }
              }
              tempperks.push(item);
              break;
            }
          }
          break;
        }
        case "Modifier": {
          itemdata.tempName = item.name;
          actordata.modifiers[itemID] = item;
          mods.push(item);
          if (itemdata.defence) defencemods.push(item);
          if (itemdata.reaction) reactionmods.push(item);
          if (itemdata.primary) primods.push(item);
          break;
        }
      }
    }

    /**
     * Process Ranks Calculation
     */
    {
      if (CONFIG.system.testMode)
        console.debug("rankitems to be polled:\n", [this, rankitems]);

      // count the rank standard skill items
      for (const item of rankitems) {
        for (const entry of item.system.entries) {
          let target = system.slugify(entry.label);
          // if the name is not blank
          if (target) {
            entry.value = Number(entry.formula);
            // the target may be one that does not exist on the actor so capture it anyway
            actorranks[target] = (actorranks[target]) ? actorranks[target] + entry.value : entry.value;
          }
        }
      }

      if (CONFIG.system.testMode) console.debug("Rankdata after polling:\n", [this, actorranks]);

      // assign the ranks to the targets in dynamic
      for (const [name, ranks] of Object.entries(actorranks)) {
        if (actordata.dynamic[name]) {
          const item = actordata.dynamic[name];
          const itemdata = item.system;
          // calculate rank bonus to assign to value and moddedvalue
          const value = actor.rankCalculator(ranks, actordata.rankMode);
          itemdata.formula = `#${ranks}`;
          itemdata.ranks = ranks;
          itemdata.value = value;
          itemdata.moddedvalue = value;
        } else {
          if (CONFIG.system.testMode)
            console.debug(`${ranks} Ranks were not assigned to : ${name} which was undefined`);
        }
      }
    }

    /**
     * Creating the sheetData object to organise data for calculation and later display
     */
    actordata.sheetData = {
      kinspecials: tempperks?.map((perk) => perk.name),
      defenceinfo: {},
    };

    /**
     * Process Primary-Attributes
     */
    const pridata = (actordata.sheetData.statinfo = {});
    {
      // Primary Attribute modifiers first
      for (const item of primods) {
        const itemdata = item.system;
        if (itemdata.inEffect) {
          for (const entry of itemdata.entries) {
            // this entry is a primod
            if (entry.category == "primary") {
              // process primods formulae before the mods are applied
              actor.processModifierFormula(entry, itemdata);
              const cases = entry.targets.split(",").map(word => word.trim().toLowerCase());
              for (const key of cases) {
                const target = actordata.dynamic[key];
                if (target?.type == "Primary-Attribute") {
                  target.system.value = target.system.moddedvalue += entry.value;
                }
              }
            }
          }
        }
      }

      // Create Stats Data
      for (const varname of system.primarysort.data) {
        const item = actordata.dynamic[varname];
        if (item) {
          pridata[varname] = {
            _id: item._id,
            title: item.system.notes,
            name: item.name,
            abbr: varname,
            base: 0,
            kin: 0,
            spec: 0,
            total: item.system.moddedvalue,
          };
        }
      }

      //Populate base, kin and spec mods for Primary Attributes
      for (const item of primods) {
        const itemdata = item.system;
        if (itemdata.inEffect) {
          for (const entry of itemdata.entries) {
            if (entry.value == 0) continue;
            switch (item.name.split(" ")[0]) { // the first word of the item name
              case "Kin:": {
                if (entry.targets.includes("BEA"))
                  pridata.bea.kin = entry.value;
                if (entry.targets.includes("BRN"))
                  pridata.brn.kin = entry.value;
                if (entry.targets.includes("FOR"))
                  pridata.for.kin = entry.value;
                if (entry.targets.includes("SWI"))
                  pridata.swi.kin = entry.value;
                if (entry.targets.includes("WIT"))
                  pridata.wit.kin = entry.value;
                if (entry.targets.includes("WSD"))
                  pridata.wsd.kin = entry.value;
                break;
              }
              case "Base":
              case "Character": {
                if (entry.targets.includes("BEA"))
                  pridata.bea.base = entry.value;
                if (entry.targets.includes("BRN"))
                  pridata.brn.base = entry.value;
                if (entry.targets.includes("FOR"))
                  pridata.for.base = entry.value;
                if (entry.targets.includes("SWI"))
                  pridata.swi.base = entry.value;
                if (entry.targets.includes("WIT"))
                  pridata.wit.base = entry.value;
                if (entry.targets.includes("WSD"))
                  pridata.wsd.base = entry.value;
                break;
              }
              default: {
                if (entry.targets.includes("BEA"))
                  pridata.bea.spec += entry.value;
                if (entry.targets.includes("BRN"))
                  pridata.brn.spec += entry.value;
                if (entry.targets.includes("FOR"))
                  pridata.for.spec += entry.value;
                if (entry.targets.includes("SWI"))
                  pridata.swi.spec += entry.value;
                if (entry.targets.includes("WIT"))
                  pridata.wit.spec += entry.value;
                if (entry.targets.includes("WSD"))
                  pridata.wsd.spec += entry.value;
              }
            }
          }
        }
      }
    }
    /**
     * Process Saving Rolls
     */
    const savedata = (actordata.sheetData.saveinfo = {});
    {
      for (const item of defencemods) {
        const itemdata = item.system;
        if (!itemdata.inEffect) continue;
        for (const entry of itemdata.entries) {
          // this entry is a defence modifier
          if (entry.category == "defence") {
            actor.processModifierFormula(entry, itemdata);
            if (Number.isNumeric(entry.formula)) {
              entry.value = Number(entry.formula);
            } else {
              if (entry.formula == "") continue;
              const formData = this._replaceData(entry.formula);
              try {
                entry.value = Math.round(eval(formData.value.replace(CONFIG.system.dataRgx, "")));
                entry.moddedformula = "" + entry.value; // store the result as a String
              } catch (err) {
                // store the formula ready to be rolled
                entry.moddedformula = formData.value;
                entry.value = 0; // eliminate any old values
                console.warn("Modifier formula evaluation error:\n", [this.name, item.name, entry.moddedformula,]);
              }
              if (!itemdata.tempName.includes(formData.label))
                itemdata.tempName += formData.label;
            }
            if (entry.targets.includes("Wil")) {
              const target = "willpower_saving_roll";
              if (actordata.dynamic[target]) {
                actordata.dynamic[target].system.moddedvalue = Number(actordata.dynamic[target].system.moddedvalue) + entry.value;
              }
            }
            if (entry.targets.includes("Tou")) {
              const target = "toughness_saving_roll";
              if (actordata.dynamic[target]) {
                actordata.dynamic[target].system.moddedvalue = Number(actordata.dynamic[target].system.moddedvalue) + entry.value;
              }
            }
          }
        }
      }

      // Create Save Roll data
      for (const varname of system.savesort) {
        const entry = actordata.dynamic[varname];
        if (entry) {
          savedata[varname] = {
            _id: entry._id,
            title: entry.system.notes,
            fullname: entry.name,
            name: entry.name.split(" ")[0],
            kin: 0,
            spec: 0,
            level: actordata.dynamic.level.system.moddedvalue || 5,
            total: entry.system.moddedvalue,
          };
          savedata[varname].statname = entry.name.startsWith("T")
            ? "for"
            : "wsd";
          savedata[varname].stat = pridata[savedata[varname].statname]?.total;
        }
      }

      //Populate base, kin and spec mods for Save Rolls
      for (const item of defencemods) {
        const itemdata = item.system;
        if (itemdata.inEffect) {
          for (const entry of itemdata.entries) {
            if (entry.category == "defence") {
              switch (item.name.split(" ")[0]) { // the first word of the item name
                case "Kin:": {
                  if (entry.targets.includes("Will") && savedata["willpower_saving_roll"])
                    savedata["willpower_saving_roll"].kin = entry.value;
                  if (entry.targets.includes("Tough") && savedata["toughness_saving_roll"])
                    savedata["toughness_saving_roll"].kin = entry.value;
                  break;
                }
                case "Level":
                case "Fortitude":
                case "Wisdom": {
                  // these are handled directly in savedata initialisation
                  break;
                }
                default:
                  if (entry.targets.includes("Will") && savedata["willpower_saving_roll"])
                    savedata["willpower_saving_roll"].spec += entry.value;
                  if (entry.targets.includes("Tough") && savedata["toughness_saving_roll"])
                    savedata["toughness_saving_roll"].spec += entry.value;
                  break;
              }
            }
          }
        }
      }
    }

    /**
     * Process Magic Points from Vocation
     */
    {
      const vocation = actordata.dynamic.vocation;
      const level = actordata.dynamic.level;
      if (vocation && level) {
        const vocationdata = vocation.system;
        const leveldata = level.system;
        for (const entry of vocationdata.entries) {
          if (entry.label.startsWith("MP")) {
            leveldata.voc = Number(entry.value);
            break;
          }
        }
        const lines = vocationdata.notes.split("\n");
        for (const line of lines) {
          if (line.startsWith("Magic Stat")) {
            const parts = line.split(":");
            if (parts.length == 2) {
              // the moddedvalue of the Magic Stat / 10, rounded down and at least 0
              const stat = Math.floor(actordata.dynamic[system.slugify(parts[1])].system.moddedvalue / 10);
              leveldata.stat = Math.max(stat, 0);
            }
            break;
          }
        }
      }
    }
    /**
     * Calculate every item with a formula, one layer at a time, starting with
     * those whose references have been calculated. Once an item has been
     * processed, add it to the layer of those available as references.
     *
     * TODO: This section needs another look to see if there is a way to
     * avoid the requirement to have all reference depths the same.
     * 
     * I think I have it now. The previousLayer needs to end up being all processed items
     */
    while (nextLayer.length !== 0) {
      previousLayer = previousLayer.concat(nextLayer);
      nextLayer = [];

      for (const item of nonmods) {
        const itemdata = item.system;
        if (item.type == "Pool") {
          // new pool formula functionality

          const dynID = itemdata.abbr.toLowerCase();

          //ignore numeric formulae
          if (itemdata.hasmax && itemdata.hasmin) continue;

          if (!itemdata.hasmax) {
            // formula has not yet been calculated
            for (const target of previousLayer) {
              // if this formula refers to an item in the previous layer then process it
              if (itemdata.maxForm.includes(target)) {
                // write to Actor Item
                let formData = this._replaceData(itemdata.maxForm);
                try {
                  itemdata.max = Math.round(eval(formData.value.replace(CONFIG.system.dataRgx, "")) * 100) / 100;
                  itemdata.moddedvalue = itemdata.value = Math.min(itemdata.value, itemdata.max);
                } catch (err) {
                  itemdata.max = 0; // eliminate any old values
                  console.warn("Pool-max formula evaluation error:\n", [actor.name, item.name, itemdata.maxForm,]);
                }
                itemdata.hasmax = true;
              }
            }
          }
          if (!itemdata.hasmin) {
            // formula has not yet been calculated
            for (const target of previousLayer) {
              // if this formula refers to an item in the previous layer then process it
              if (itemdata.minForm.includes(target)) {
                // write to Actor Item
                let formData = this._replaceData(itemdata.minForm);
                try {
                  itemdata.min = Math.round(eval(formData.value.replace(CONFIG.system.dataRgx, "")) * 100) / 100;
                  itemdata.moddedvalue = itemdata.value = Math.max(itemdata.value, itemdata.min);
                } catch (err) {
                  itemdata.min = 0; // eliminate any old values
                  console.warn("Pool-min formula evaluation error:\n", [actor.name, item.name, itemdata.minForm,]);
                }
                itemdata.hasmin = true;
              }
            }
          }
          itemdata.ratio = Math.trunc(itemdata.value / itemdata.max * 100);
          if (itemdata.hasmax && itemdata.hasmin)
            nextLayer.push(dynID);
        } else {
          //ignore items with no formula or whose formula has already been processed
          if (!itemdata.formula || Number.isNumeric(itemdata.formula) || itemdata.formula.startsWith("#") || (Number(itemdata.moddedformula) == itemdata.value && itemdata.moddedformula != ""))
            continue;
          const dynID = system.slugify(item.name);
          if (previousLayer.includes(dynID)) continue;

          // the formula is a reference
          if (itemdata.formula.includes("@")) {
            const regex = /@([\w]+)/g;
            let foundAllRefs = true;
            let match;
            while ((match = regex.exec(itemdata.formula)) && foundAllRefs) {
              foundAllRefs = previousLayer.includes(match[1]);
            }
            if (foundAllRefs) {
              let formData = this._replaceData(itemdata.formula);
              try {
                itemdata.moddedvalue = itemdata.value = Math.round(eval(formData.value.replace(CONFIG.system.dataRgx, "")) * 100) / 100;
                itemdata.moddedformula = "" + itemdata.value; // store the result as a String
              } catch (err) { // TODO: this may not be reachable now that we are checking all the refs first
                // store the formula ready to be rolled
                itemdata.moddedformula = formData.value;
                itemdata.moddedvalue = itemdata.value = 0; // eliminate any old values
                console.warn("Non-Modifier formula evaluation incomplete:\n", [actor.name, item.name, itemdata.moddedformula]);
              }
              // put this item into the next layer and stop looking for matches
              nextLayer.push(dynID);
            }
          } else {
            // the formula might be a dice expression
            if (itemdata.formula.toLowerCase().includes("d")) {
              itemdata.moddedformula = itemdata.formula;
              itemdata.moddedvalue = itemdata.value = 0; // eliminate any old values
            }
          }
        }
      }
    }

    /**
     * Create the Skill and Spell Data Structure
     *
     * The "total" field is populated from moddedvalue after that has been
     * calculated in the next step and then fetched by the rollables in the
     * following step.
     */
    const spelltemp = {};
    const skilldata = (actordata.sheetData.skillinfo = {});
    const skillspelldetails = (actordata.sheetData.skillspelldetails = {});
    {
      let dyn = actordata.dynamic.armor;
      if (dyn) {
        // store the Armor skill in proper order
        const armordata = {
          _id: dyn._id,
          title: dyn.system.notes,
          name: dyn.name,
          stat: "-",
          statabbr: "nil",
          ranks: `#${dyn.system.ranks}`,
          value: dyn.system.value,
          type: "none",
          voc: 0,
          kin: 0,
          spec: 0,
          standard: true,
        };
        skilldata.Armor = {
          name: "Armor",
          devpts: 0,
          data: {
            armor: armordata,
          },
        };
        skillspelldetails.armor = armordata;
      }
      // store all the skills so they can be updated through skillspelldetails
      for (const skill of tempskills) {
        const ref = system.slugify(skill.name);
        dyn = actordata.dynamic[ref];
        skillspelldetails[ref] = {
          _id: dyn._id,
          title: dyn.system.notes,
          name: dyn.name,
          stat: 0,
          statabbr: "nil",
          ranks: `#${dyn.system.ranks}`,
          value: dyn.system.value,
          type: "skill",
          voc: 0,
          kin: 0,
          spec: 0,
          standard: false,
        };
      }
      // place the standard skills into their categories and sequence
      for (const skillcategory of system.skillsort) {
        skilldata[skillcategory.name] = {
          name: skillcategory.name,
          devpts: 0,
          data: {},
        };
        for (const entry of skillcategory.data) {
          if (entry) {
            skilldata[skillcategory.name].data[entry] = skillspelldetails[entry];
            // Check this because NPCs are missing some of the standard ones.
            if (skillspelldetails[entry])
              skillspelldetails[entry].standard = true;
          }
        }
      }
      dyn = actordata.dynamic.body;
      if (dyn) {
        // store the Body skill in proper order
        const bodydata = {
          _id: dyn._id,
          title: dyn.system.notes,
          name: dyn.name,
          stat: 0,
          statabbr: "for",
          ranks: `#${dyn.system.ranks}`,
          value: dyn.system.value,
          type: "none",
          voc: 0,
          kin: 0,
          spec: 0,
          standard: true,
        };
        skilldata.Body = {
          name: "Body",
          devpts: 0,
          data: {
            body: bodydata,
          },
        };
        skillspelldetails.body = bodydata;
      }
      skilldata.Spells = {
        name: "Spell Lores",
        devpts: 0,
        data: {},
      };
      // store all the spells so they can be updated through spelltemp
      for (const spell of tempspells) {
        const ref = system.slugify(spell.name);
        dyn = actordata.dynamic[ref];
        const spelldata = {
          _id: dyn._id,
          title: dyn.system.notes,
          name: dyn.name,
          stat: 0,
          statabbr: "nil",
          ranks: `#${dyn.system.ranks}`,
          value: dyn.system.value,
          type: "spell",
          voc: 0,
          kin: 0,
          spec: 0,
          standard: true,
        };
        skillspelldetails[ref] = spelltemp[ref] = skilldata.Spells.data[ref] = spelldata;
      }
    }

    /**
     * Add the specialty skills to their proper categories.
     *
     * The category must be at the beginning of any line in the notes.
     */
    for (let skill of Object.entries(skillspelldetails)) {
      if (skill[1].standard) continue;
      const regex = /^(Roguery|Lore|Adventuring|Combat|Spells)/gm;
      const category = regex.exec(skill[1].title) || ["Armor"];
      skilldata[category[0]].data[skill[0]] = skill[1];
    }

    // this will store all valid modifier entries for later processing efficiency
    const activeModEntries = [];
    /**
     * Process all the modifiers after the items they use as references have
     * been calculated and the data structure for the skill and spell breakdown
     * has been created.
     *
     * This section now fills in some of the pieces of that skill and spell
     * data structure.
     */
    for (const item of mods) {
      const itemdata = item.system;
      if (!itemdata.inEffect) continue;
      for (const entry of itemdata.entries) {
        if (Number.isNumeric(entry.formula)) {
          entry.value = Number(entry.formula);
        } else {
          if (entry.formula == "") continue;
          let formData = this._replaceData(entry.formula);
          try {
            entry.value = Math.round(eval(formData.value.replace(CONFIG.system.dataRgx, "")));
            entry.moddedformula = "" + entry.value; // store the result as a String
          } catch (err) {
            // store the formula ready to be rolled
            entry.moddedformula = formData.value;
            entry.value = 0; // eliminate any old values
            console.warn("Modifier formula evaluation error:\n", [this.name, item.name, entry.moddedformula,]);
          }
          if (!itemdata.tempName.includes(formData.label))
            itemdata.tempName += formData.label;
        }
        // Determine if this entry applies to any part of a skill or spell structure
        switch (entry.category) {
          case "defence": // TSR, WSR, MRR and criticals/fumbles
          case "primary": {
            // Stat values
            // handled upstream now
            break;
          }
          case "attack": {
            // very few of these are useful
            switch (item.name.split(" ")[0]) { // the first word of the item name
              case "Parry":
              case "Enemy": {
                // Missile and Melee mods
                break;
              }
              case "Vocation:": {
                break;
              }
              default:
                if (CONFIG.system.testMode)
                  console.debug(`Attack modifier of: ${entry.value} in ${item.name} for ${entry.targets}.`);
            }
            break;
          }
          case "reaction": {
            // Armor, Body, Level, Melee DB and Missile DB
            switch (item.name.split(" ")[0]) { // the first word of the item name
              case "Vocation:": {
                if (entry.targets.includes("Body"))
                  skillspelldetails.body.voc = entry.value;
                if (entry.targets.includes("Armor"))
                  skillspelldetails.armor.voc = entry.value; // Just in case one shows up in the future
                break;
              }
              case "Parry":
              case "Swiftness": {
                // Missile and Melee mods
                break;
              }
              case "Fortitude": {
                if (entry.targets.includes("Body"))
                  skillspelldetails.body.stat = entry.value;
                break;
              }
              default:
                let found = false;
                if (entry.targets.includes("Body")) {
                  found = true;
                  skillspelldetails.body.kin += entry.value;
                }
                if (entry.targets.includes("Armor")) {
                  found = true;
                  skillspelldetails.armor.kin += entry.value; // Just in case one shows up in the future
                }
                if (CONFIG.system.testMode && !found)
                  console.debug(`Reaction modifier of: ${entry.value} in ${item.name} for ${entry.targets}.`);
            }
            break;
          }
          case "spell": {
            switch (item.name.split(" ")[0]) { // the first word of the item name
              case "Bearing":
              case "Brawn":
              case "Swiftness":
              case "Fortitude":
              case "Wits":
              case "Wisdom": {
                const targets = entry.targets.split(",").map((word) => word.trim());
                for (const target of targets) {
                  for (const skill of Object.values(spelltemp)) {
                    if (skill.name.startsWith(target)) {
                      skill.stat = entry.value;
                      skill.statabbr = entry.formula.slice(1);
                    }
                  }
                }
                break;
              }
              case "Vocation:": {
                if (entry.value == 0) continue;
                for (const lore of Object.values(spelltemp)) {
                  lore.voc = entry.value;
                }
                break;
              }
              default: {
                if (entry.value == 0) continue;
                const name = item.name.split("(")[0].trim();
                if (actordata.sheetData.kinspecials.find((a) => a.includes(name))) {
                  // this is a kin special ability
                  const targets = entry.targets.split(",").map((word) => word.trim());
                  for (const target of targets) {
                    for (const lore of Object.values(spelltemp)) {
                      if (lore.name.startsWith(target)) {
                        lore.kin += entry.value;
                      }
                    }
                  }
                } else {
                  const targets = entry.targets.split(",").map((word) => word.trim());
                  if (targets[0].trim()) {
                    for (const target of targets) {
                      for (const lore of Object.values(spelltemp)) {
                        if (lore.name.startsWith(target)) {
                          lore.kin += entry.value;
                        }
                      }
                    }
                  } else {
                    if (item.name == "Armor Penalty") {
                      for (const lore of Object.values(spelltemp)) {
                        lore.kin += entry.value;
                      }
                    }
                  }
                }
              }
            }
            break;
          }
          case "skill": {
            switch (item.name.split(" ")[0]) { // the first word of the item name
              case "Bearing":
              case "Brawn":
              case "Swiftness":
              case "Fortitude":
              case "Wits":
              case "Wisdom": {
                const targets = entry.targets.split(",").map((word) => word.trim());
                for (const target of targets) {
                  for (const skill of Object.values(skillspelldetails)) {
                    if (skill.name.startsWith(target)) {
                      skill.stat = entry.value;
                      skill.statabbr = entry.formula.slice(1);
                    }
                  }
                }
                break;
              }
              case "Vocation:": {
                if (entry.value == 0) continue;
                const targets = entry.targets.split(",").map((word) => word.trim());
                for (const target of targets) {
                  for (const skill of Object.values(skillspelldetails)) {
                    if (skill.name.startsWith(target)) {
                      skill.voc = entry.value;
                    }
                  }
                }
                break;
              }
              default: {
                if (entry.value == 0) continue;
                const name = item.name.split("(")[0].trim();
                if (actordata.sheetData.kinspecials.find((a) => a.includes(name))) {
                  // this is a kin special ability
                  const targets = entry.targets.split(",").map((word) => word.trim());
                  for (const target of targets) {
                    for (const skill of Object.values(skillspelldetails)) {
                      if (skill.name.startsWith(target)) {
                        skill.kin += entry.value;
                      }
                    }
                  }
                } else {
                  const targets = entry.targets.split(",").map((word) => word.trim());
                  if (targets[0].trim()) {
                    for (const target of targets) {
                      for (const skill of Object.values(skillspelldetails)) {
                        if (skill.name.startsWith(target)) {
                          skill.kin += entry.value;
                        }
                      }
                    }
                  } else {
                    for (const skill of Object.values(skillspelldetails)) {
                      if (["Body", "Armor"].includes(skill.name)) continue;
                      skill.spec += entry.value;
                    }
                  }
                }
              }
            }
            break;
          }
          default: {
            if (CONFIG.system.testMode)
              console.debug(`Unhandled modifier of: ${entry.value} in ${item.name} for ${entry.targets}.`);
          }
        }
        activeModEntries.push(entry);
      }
    }

    /**
     * Fetch the modifiers for each rollable item and calculate the
     * moddedvalue.
     */
    for (const item of rollables) {
      const itemdata = item.system;
      itemdata.moddedvalue = itemdata.value;
      // if there is no modified formula, make it the value
      if (itemdata.moddedformula == undefined)
        itemdata.moddedformula = "" + itemdata.value;
      let itemID = system.slugify(item.name);
      switch (item.type) {
        case "Melee-Attack":
        case "Ranged-Attack": {
          itemdata.moddedvalue += this.fetchDisplayModifiers(item.name, "attack", activeModEntries);
          break;
        }
        case "Defence": {
          itemdata.moddedvalue += this.fetchDisplayModifiers(item.name, "defence", activeModEntries);
          break;
        }
        case "Rollable": {
          switch (itemdata.category) {
            case "check": {
              itemdata.moddedvalue += this.fetchDisplayModifiers(item.name, "reaction", activeModEntries);
              if (itemID == "body" || itemID == "armor")
                skillspelldetails[itemID].total = itemdata.moddedvalue;
              break;
            }
            case "technique":
            case "skill": {
              itemdata.moddedvalue += this.fetchDisplayModifiers(item.name, "skill", activeModEntries);
              skillspelldetails[itemID].total = itemdata.moddedvalue;
              break;
            }
            case "rms":
            case "spell": {
              itemdata.moddedvalue += this.fetchDisplayModifiers(item.name, "spell", activeModEntries);
              skillspelldetails[itemID].total = itemdata.moddedvalue;
              break;
            }
          }
          break;
        }
      }
    }

    // set the basic defence data from data.dynamic values
    actordata.defence = {
      armourType: actordata.dynamic.armor_type?.system.formula || "NA",
      meleeDBItem: actordata.dynamic.melee_db,
      missileDBItem: actordata.dynamic.missile_db,
      parry: actordata.dynamic.parry,
      maxswi: actordata.dynamic.swi?.system.moddedvalue || 0,
      split: actordata.defence.split || 0,
      shieldposition: actordata.defence.shieldposition || "none",
      meshield: 0,
      mishield: 0,
    };

    // processing Action modifiers with APX Combat rates
    for (const item of reactionmods) {
      const itemdata = item.system;
      for (const entry of itemdata.entries) {
        if (Number.isNumeric(entry.formula)) {
          entry.value = Number(entry.formula);
        } else {
          if (entry.formula == "") continue;
          let formData = this._replaceData(entry.formula);
          try {
            entry.value = eval(formData.value.replace(CONFIG.system.dataRgx, ""));
            entry.moddedformula = "" + entry.value; // store the result as a String
          } catch (err) {
            // store the formula ready to be rolled
            entry.moddedformula = formData.value;
            entry.value = 0; // eliminate any old values
            console.warn("Modifier formula evaluation error:\n", [this.name, item.name, entry.moddedformula,]);
          }
          if (!itemdata.tempName.includes(formData.label))
            itemdata.tempName += formData.label;
        }
      }

      // Armour and Shields (must have formatted data in the notes)
      if (itemdata.notes.startsWith("Fare")) {
        // this is defensive equipment
        const defdata = (actordata.sheetData.defenceinfo[system.slugify(item.name)] = {
          name: item.name,
          _id: item._id,
          inEffect: itemdata.inEffect,
          notes: itemdata.notes,
          type: "-",
          protects: "-",
          qualities: "-",
          maxswi: "-",
          movepen: "-",
          cmbpen: "-",
          perpen: "-",
          melee: "-",
          missile: "-",
        });
        const details = itemdata.notes.split(/\r?\n/).map((word) => word.trim());
        for (let row of details) {
          // split each row by : to separate the title and data
          const info = row.split(":");
          // the title
          switch (info[0].trim()) {
            case "Type": { // set the armour type based on the first letter of the Type entry
              if (info[1].trim() != "-") {
                defdata.type = `${info[1].trim()[0]}A`;
                if (itemdata.inEffect)
                  actordata.defence.armourType = defdata.type;
              } else {
                defdata.type = "-";
              }
              break;
            }
            case "Protects": {
              defdata.protects = info[1].trim();
              break;
            }
            case "Qualities": {
              defdata.qualities = info[1].trim();
              break;
            }
            case "Max SWI": { // set the maximum swiftness in the actors defence object if necessary
              defdata.maxswi = info[1].trim();
              if (Number(defdata.maxswi)) {
                actordata.defence.maxswi = Math.min(actordata.defence.maxswi, Number(defdata.maxswi));
              }
              break;
            }
          }
        }
        for (const entry of itemdata.entries) {
          switch (entry.category) {
            case "skill": {
              if (entry.targets.startsWith("Per")) {
                // perception penalty
                defdata.perpen = entry.value == 0 ? "-" : entry.value;
              }
              break;
            }
            case "primary": {
              if (entry.targets.startsWith("CMB")) {
                // combat penalty
                defdata.cmbpen = entry.value == 0 ? "-" : entry.value;
              } else if (entry.targets.startsWith("Arm")) {
                // action penalty
                defdata.movepen = entry.value == 0 ? "-" : entry.value;
              }
              break;
            }
            case "reaction": {
              if (entry.targets.includes("Melee")) {
                defdata.melee = entry.value == 0 ? "-" : entry.value;
                if (defdata.protects.includes("Shield") && itemdata.inEffect)
                  actordata.defence.meshield += entry.value;
              }
              if (entry.targets.includes("Missile")) {
                defdata.missile = entry.value == 0 ? "-" : entry.value;
                if (defdata.protects.includes("Shield") && itemdata.inEffect)
                  actordata.defence.mishield += entry.value;
              }
              break;
            }
          }
        }
      }
    }

    // final defence calculations after armour and shields have been processed
    {
      if (actordata.defence.shieldposition == "none" && actordata.defence.meshield > 0) {
        actordata.defence.shieldposition = "side";
      } else if (actordata.defence.meshield == 0) {
        actordata.defence.shieldposition = "none";
      }
      let medb = actordata.defence.meleeDBItem?.system.moddedvalue || 0;
      let midb = actordata.defence.missileDBItem?.system.moddedvalue || 0;
      const pdb = actordata.defence.parry?.system.value || 0;
      actordata.defence.split = Math.min(pdb, actordata.defence.split);
      switch (actordata.defence.shieldposition) {
        case "front": {
          actordata.defence.meleeDB = medb;
          actordata.defence.missileDB = midb;
          actordata.defence.split = 0;
          actordata.defence.base = medb - actordata.defence.meshield - pdb;
          actordata.defence.surprise = actordata.defence.base - actordata.defence.maxswi;
          break;
        }
        case "side": {
          actordata.defence.meleeDB = medb - pdb;
          actordata.defence.missileDB = midb - pdb;
          actordata.defence.righthand = medb - actordata.defence.meshield;
          actordata.defence.split = 0;
          actordata.defence.base = medb - actordata.defence.meshield - pdb;
          actordata.defence.surprise = actordata.defence.base - actordata.defence.maxswi;
          break;
        }
        case "none":
        default: {
          actordata.defence.meleeDB = medb;
          actordata.defence.missileDB = midb;
          actordata.defence.righthand = medb - actordata.defence.split;
          actordata.defence.lefthand = medb + actordata.defence.split - pdb;
          actordata.defence.base = medb - pdb;
          actordata.defence.surprise = actordata.defence.base - actordata.defence.maxswi;
          break;
        }
      }
    }

    // this is the end of prepareDerivedData
  }

  processModifierFormula(entry, itemdata) {
    if (!Number.isNumeric(entry.formula) && entry.formula != "") {
      const formData = this._replaceData(entry.formula);
      try {
        entry.value = Math.round(eval(formData.value.replace(CONFIG.system.dataRgx, "")));
        entry.moddedformula = "" + entry.value; // store the result as a String
      } catch (err) {
        // store the formula ready to be rolled
        entry.moddedformula = formData.value;
        entry.value = 0; // eliminate any old values
        console.warn("Modifier formula evaluation error:\n", [this.name, itemdata.tempName, entry.moddedformula,]);
      }
      if (!itemdata.tempName.includes(formData.label)) itemdata.tempName += formData.label;
    }
  }

  getNamedItem(name) {
    let parts = name.split(".");
    if (parts.length != 2) return undefined;
    return this.system[parts[0]][parts[1]];
  }

  rankCalculator(ranks, progression = "0:5:2:1:1") {
    const tiers = progression.split(":");
    const base = Number(tiers[0]);
    const t0 = Number(tiers[1]);
    const t10 = Number(tiers[2]);
    const t20 = Number(tiers[3]);
    const t30 = Number(tiers[4]);

    if (ranks > 30) {
      return 10 * (t0 + t10 + t20) + (ranks - 30) * t30;
    } else if (ranks > 20) {
      return 10 * (t0 + t10) + (ranks - 20) * t20;
    } else if (ranks > 10) {
      return 10 * t0 + (ranks - 10) * t10;
    } else if (ranks > 0) {
      return ranks * t0;
    } else {
      return base;
    }
  }

  /**
   * Replace data references in the formula of the syntax `@attr[.fieldname =.moddedvalue]` with the corresponding key from
   * the provided `data` object.
   * @param {String} formula    The original formula within which to replace
   * @private
   */
  _replaceData(formula) {
    const dataRgx = /[@]([\w.]+)/gi;
    const dynamic = this.system.dynamic;
    const tracked = this.system.tracked;
    let tempName = "";
    const findTerms = (match, term) => {
      const fields = term.split(".");
      const attribute = fields[0];
      // default to the field "moddedvalue" if none is specified
      const field = fields[1] || "moddedvalue";
      if (dynamic[attribute]) {
        const value = dynamic[attribute].system[field];
        const label = dynamic[attribute].system.label;
        tempName += (label) ? ` (${label})` : "";
        return (value) ? String(value).trim() : "0";
      } else if (tracked[attribute]) {
        const value = tracked[attribute].system[field];
        return (value) ? String(value).trim() : "0";
      } else {
        return "0";
      }
    };
    const replyData = formula.replace(dataRgx, findTerms).replace(/(min)|(max)|(floor)|(ceil)|(round)|(abs)|(pow)/g, "Math.$&");
    return { value: replyData, label: tempName };
  }

  async setConditions(newValue, attrName) {
    if (CONFIG.system.testMode)
      console.debug("entering setConditions()\n", [newValue, attrName]);

    const attr = attrName.split(".")[2];
    const item = this.system.tracked[attr];
    const itemdata = item.system;
    let attrValue = itemdata.value;
    let attrMax = itemdata.max;
    let attrState = itemdata.state;
    let attrMin = itemdata.min;

    // Assign the variables
    if (attrName.includes(".max")) {
      attrMax = Math.round(eval(this._replaceData(newValue).value.replace(CONFIG.system.dataRgx, "")));
    } else if (attrName.includes(".min")) {
      attrMin = Math.round(eval(this._replaceData(newValue).value.replace(CONFIG.system.dataRgx, "")));
    } else {
      attrValue = newValue;
    }
    const ratio = attrValue / attrMax;

    switch (attr) {
      case "end": {
        // Homebrew
        if (attrValue < 1) attrState = "[EXHSTD]";
        else if (ratio < 0.25) attrState = "[BUSHED]";
        else if (ratio < 0.5) attrState = "[TIRED]";
        else if (ratio < 0.75) attrState = "[WINDED]";
        else attrState = "[FIT]";
        break;
      }
      case "hp": {
        if (this.system.useFAHR) {
          // House rules
          switch (Math.trunc(ratio * 8)) {
            case 1: {
              attrState = "[1/8 BRU]";
              break;
            }
            case 2: {
              attrState = "[1/4 BRU]";
              break;
            }
            case 3: {
              attrState = "[3/8 BRU]";
              break;
            }
            case 4: {
              attrState = "[1/2]";
              break;
            }
            case 5: {
              attrState = "[5/8]";
              break;
            }
            case 6: {
              attrState = "[3/4]";
              break;
            }
            case 7: {
              attrState = "[7/8]";
              break;
            }
            case 8: {
              attrState = "[FIT]";
              break;
            }
            default: {
              // bad shape
              if (ratio <= -1) {
                attrState = "[DEAD]";
              } else if (ratio <= -0.5) {
                attrState = "[DYING]";
              } else if (ratio <= 0) {
                attrState = "[INC]";
              } else {
                attrState = "[< 1/8 BRU]";
              }
            }
          }
        } else {
          // RAW
          if (attrValue < -49) attrState = "[DYING]";
          else if (attrValue < 1) attrState = "[INC]";
          else if (ratio < 0.5) attrState = "[BRU]";
          else attrState = "[FIT]";
        }
        break;
      }
      default: { // assume that the state is measured in eighths
        switch (Math.trunc(ratio * 8)) {
          case 1: {
            attrState = '[1/8]';
            break;
          }
          case 2: {
            attrState = '[1/4]';
            break;
          }
          case 3: {
            attrState = '[3/8]';
            break;
          }
          case 4: {
            attrState = '[1/2]';
            break;
          }
          case 5: {
            attrState = '[5/8]';
            break;
          }
          case 6: {
            attrState = '[3/4]';
            break;
          }
          case 7: {
            attrState = '[7/8]';
            break;
          }
          case 8: {
            attrState = '[Full]';
            break;
          }
          default: { // dead
            if (ratio <= 0) { // empty
              attrState = '[Empty]';
            } else {
              attrState = '[< 1/8]';
            }
          }
        }
      }
    }
    itemdata.min = attrMin;
    itemdata.value = attrValue;
    itemdata.max = attrMax;
    itemdata.state = attrState;

    return await item.update({ system: itemdata });
  }

  /**
   * Handle how changes to a Token attribute bar are applied to the Actor.
   * Logic for pools to be edited by plus-minus and text input (on Actor and Item) is also redirected here.
   * @param {string} attribute    The attribute path
   * @param {number} value        The target attribute value
   * @param {boolean} isDelta     Whether the number represents a relative change (true) or an absolute change (false)
   * @param {boolean} isBar       Whether the new value is part of an attribute bar, or just a direct value
   * @return {Promise}
   */
  async modifyTokenAttribute(attribute, value, isDelta = false, isBar = true) {
    if (CONFIG.system.testMode) console.debug("entering modifyTokenAttribute()\n", [attribute, value, isDelta, isBar,]);

    if (isBar && !attribute.endsWith(".system"))
      attribute += ".system";
    // fetch the pool if the attribute changing is 'value', or the attribute itelf if not
    const current = foundry.utils.getProperty(this.system, attribute);
    // isBar is true for the value and must be clamped
    // isBar is false for the min or max
    value = isBar
      ? Math.clamp(current.min, isDelta ? Number(current.value) + Number(value) : Number(value), current.max)
      : isDelta ? Number(current) + Number(value) : value;

    // redirect updates to setConditions
    return await this.setConditions(value, `system.${attribute}`);
  }

  /**
   * Fetches the total modifier value for a rollable item
   */
  fetchDisplayModifiers(name, type, activeModEntries) {
    let mods = 0;
    const modEntries = activeModEntries.filter(function (ame) {
      if (ame.category == type) return true;
      if (type == "attack") {
        return false; // temporary abort
        return ame.category == "skill";
        //const skillref = name.split(":")[0].toLowerCase();
      }
    });
    for (const entry of modEntries) {
      // what is the target of this modifier?
      let hasRelevantTarget = entry.targets.trim();
      // does this modifier have a target matching the item being rolled?
      if (hasRelevantTarget != "") {
        hasRelevantTarget = false;
        // get the array of targets to which it applies
        const cases = entry.targets.split(",").map((word) => word.trim());
        for (const target of cases) {
          // test the target against the beginning of dataset.name for a match
          if (name.startsWith(target)) {
            hasRelevantTarget = true;
            continue;
          }
        }
      } else {
        // a general modifier
        hasRelevantTarget = true;
      }
      mods += hasRelevantTarget ? entry.value : 0;
    }
    return mods;
  }

  /**
   * Resets all temporary Variables and Modifiers
   */
  resetModVars(temporary = true) {
    const items = this.items.filter(function (item) {
      if (temporary) {
        return item.system.temporary;
      } else {
        return item.system.once;
      }
    });
    let updates = [];

    for (const item of items) {
      switch (item.type) {
        case "Modifier": {
          updates.push({ _id: item.id, ["system.inEffect"]: false, });
          break;
        }
        case "Variable": {
          updates.push({
            _id: item.id,
            ["system.value"]: item.system.entries[0].value,
            ["system.formula"]: item.system.entries[0].formula,
            ["system.label"]: item.system.entries[0].label,
          });
          break;
        }
      }
    }
    this.updateEmbeddedDocuments("Item", updates);
  }

  /**
   * Apply the amount of bleeding as damage and send a message to the chat.
   */
  async applyBleeding() {
    const bleed = this.system.dynamic.woundsbleed.system.moddedvalue;
    if (bleed && bleed != 0) {
      // apply damage so it will update status and bar
      await this.modifyTokenAttribute("tracked.hp", -bleed, true);
      ChatMessage.create({
        speaker: { actor: this.id },
        content: `Has taken ${bleed} bleeding damage.`,
      });
    } else return;
  }

  /**
   * A method to dispatch non-event-driven rolls.
   */
  async roll(rolldata) {
    game.settings.set("vsd", "currentActor", rolldata.actor.id);

    if (rolldata.crittable) {
      await game.settings.set("vsd", "currentCrit", rolldata.crittable.split(" ")[1]);
    }
    if (rolldata.sectable) {
      await game.settings.set("vsd", "secondCrit", rolldata.sectable.split(" ")[1] || "none");
    }

    let flavour = game.i18n.format(`local.phrases.${rolldata.type}`, { name: rolldata.name, });
    let unmodified = rolldata.unmodified || 0;
    let openEndedRange = Number(rolldata.oerange) || 5;
    let rollValue = rolldata.roll;
    let rollType = "oe";
    let critRoll = 0; // for possible critical roll
    let item = await rolldata.actor.items.getName(rolldata.name);
    if (!item) {
      item = (await rolldata.actor.items.get(rolldata.id)) || "";
    }
    const openEndedChange = await rolldata.actor.getNamedItem("dynamic.openendedchange");
    if (openEndedChange) openEndedRange = openEndedChange.system.value;

    switch (rolldata.type) {
      case "tochat": { // send the notes to the chat and return
        const isplaintext = rolldata.roll.replace(/<[^>]*>?/gm, '') == rolldata.roll;
        ChatMessage.create({
          speaker: ChatMessage.getSpeaker({ actor: rolldata.actor }),
          flavor: `<b>${rolldata.name}</b><hr>`,
          content: isplaintext ? rolldata.roll.replace(/(?:\r\n|\r|\n)/g, '<br>') : rolldata.roll,
        });
        return;
      }
    }

    // get the modifiers
    let modList = rolldata.actor.sheet.fetchRelevantModifiers(rolldata.actor, { type: rolldata.type, modtype: rolldata.modtype, name: rolldata.name }); //FIXME fetchDisplayModifiers arguments
    // process the modifiers
    let modformula = "";
    flavour += rolldata.type != "modlist"
      ? ` [<b>${rollValue}</b>]`
      : `<p class="chatmod">[<b>${rollValue}</b>]: ${rolldata.name}<br>`;
    let hasMods = modList.length != 0;
    if (hasMods) {
      var sign;
      flavour += rolldata.type != "modlist" ? `<p class="chatmod">` : "";
      for (const mod of modList) {
        sign = typeof mod.modifier === "string" ? "" : mod.modifier > -1 ? "+" : "";
        modformula += `${sign}${mod.modifier}`;
        flavour += ` ${sign}${mod.modifier} : ${mod.description} <br>`;
      }
      flavour += `</p>`;
    }
    // add the item-id to the flavour
    flavour += `<span data-item-id="${item.id}"></span>`;

    // reaction is actually ???
    let formula = rolldata.type == "reaction" || rolldata.type == "modlist"
      ? rollValue
      : "1d100 + " + rollValue;

    // process the original roll
    let roll = await new Roll(formula + modformula).evaluate();
    let firstRoll = roll.terms[0].total;

    switch (rolldata.type) {
      case "dodge": {
        // Standard D100 used for straight table rolls (probably crit or failure)
        // The attacktable will be defined in the item.system.notes field

        // display the d100 roll
        flavour += `<p>${game.i18n.localize(`local.rolls.d100roll`)}: [<b>${firstRoll}</b>] - `;
        flavour += `<a class="open-journal" data-table="${rolldata.attacktable}">${game.i18n.localize(`local.rolls.table`)}</a></p>`;

        this.showJournal(rolldata.attacktable);
        break;
      }
      case "reaction": {
        // For Melee or Missile Defensive Bonus "rolls"
        // the calculations are made in prepchardata so keep this here for output to chat only
        break;
      }
      case "block": {
        // Toughness or Willpower Save Roll, open-ended (no crit)
        rolldata.attacktable = `${game.i18n.localize(`local.tables.fear`)}`;

        // display the d100 roll
        flavour += `<p>${game.i18n.localize(`local.rolls.d100roll`)}: [<b>${firstRoll}</b>] - `;
        flavour += `<a class="open-journal" data-table="${rolldata.attacktable}">${game.i18n.localize(`local.rolls.saves.fear`)}</a></p>`;

        const openEnded = await this.checkOpenEnded(roll, openEndedRange);
        if (openEnded) {
          roll = openEnded.roll;
          flavour += `<p class=${openEnded.explodeUp ? "critsuccess" : "critfail"}>${rollType.toUpperCase()} ${game.i18n.localize(`local.rolls.roll`)}: [<b>${roll.dice[1].total}</b>]</p>`;;
        }

        if (roll.total < 0) {
          flavour += `<p class="critfail">[<b>${game.i18n.localize(`local.rolls.failure`)}</b>]</p>`;
        } else {
          flavour += `<p class="critsuccess">[<b>${game.i18n.localize(`local.rolls.success`)}</b>]</p>`;
        }
        break;
      }
      case "parry": {
        //Active Defence Roll, open-ended (no crit)

        // display the d100 roll
        flavour += `<p>${game.i18n.localize(`local.rolls.d100roll`)}: [<b>${firstRoll}</b>]</p>`;

        const openEnded = await this.checkOpenEnded(roll, openEndedRange);
        if (openEnded) {
          roll = openEnded.roll;
          flavour += `<p class=${openEnded.explodeUp ? "critsuccess" : "critfail"}>${rollType.toUpperCase()} ${game.i18n.localize(`local.rolls.roll`)}: [<b>${roll.dice[1].total}</b>]</p>`;;
        }
        break;
      }
      case "check":
      case "skill": {
        // A skill roll, open-ended (no crit)

        // display the d100 roll
        flavour += `<p>${game.i18n.localize(`local.rolls.d100roll`)}: [<b>${firstRoll}</b>] - `;
        flavour += `<a class="open-journal" data-table="${rolldata.journal}">${game.i18n.localize(`local.rolls.skill.skill`)}</a>, `;
        flavour += `<a class="open-journal" data-table="${rolldata.attacktable}">${game.i18n.localize(`local.rolls.skill.art`)}</a></p>`;

        const openEnded = await this.checkOpenEnded(roll, openEndedRange);
        if (openEnded) {
          roll = openEnded.roll;
          flavour += `<p class=${openEnded.explodeUp ? "critsuccess" : "critfail"}>${rollType.toUpperCase()} ${game.i18n.localize(`local.rolls.roll`)}: [<b>${roll.dice[1].total}</b>]</p>`;;
        }

        if (roll.total < 5) {
          flavour += `<p class="critfail">[<b>${game.i18n.localize(`local.rolls.critfail`)}</b>]</p>`;
        } else if (roll.total < 75) {
          flavour += `<p class="critfail">[<b>${game.i18n.localize(`local.rolls.failure`)}</b>]</p>`;
        } else if (roll.total < 100) {
          flavour += `<p class="critsuccess">[<b>${game.i18n.localize(`local.rolls.partial`)}</b>]</p>`;
        } else if (roll.total < 175) {
          flavour += `<p class="critsuccess">[<b>${game.i18n.localize(`local.rolls.success`)}</b>]</p>`;
        } else {
          flavour += `<p class="critsuccess">[<b>${game.i18n.localize(`local.rolls.outstanding`)}</b>]</p>`;
        }
        break;
      }
      case "spell": {
        // A spell roll, open-ended (no crit)

        if (firstRoll % 11 == 0) {
          // Magical Resonance has occurred notify the Caster
          flavour += `<p class="critfail">${game.i18n.localize(`local.rolls.resonance`)} <i class="fas fa-scroll rollmacro" data-category="dodge" data-target="Resonance"></i></p>`;
        }

        // display the d100 roll
        flavour += `<p>${game.i18n.localize(`local.rolls.d100roll`)}: [<b>${firstRoll}</b>] - `;
        flavour += `<a class="open-journal" data-table="${rolldata.journal}">${game.i18n.localize(`local.rolls.spell.lore`)}</a>, `;
        flavour += `<a class="open-journal" data-table="${rolldata.attacktable}">${game.i18n.localize(`local.rolls.spell.sct`)}</a></p>`;

        const openEnded = await this.checkOpenEnded(roll, openEndedRange);
        if (openEnded) {
          roll = openEnded.roll;
          flavour += `<p class=${openEnded.explodeUp ? "critsuccess" : "critfail"}>${rollType.toUpperCase()} ${game.i18n.localize(`local.rolls.roll`)}: [<b>${roll.dice[1].total}</b>]</p>`;;
        }

        if (roll.total < 26) {
          flavour += `<p class="critfail">[<b>${game.i18n.localize(`local.rolls.failure`)}</b>] <i class="fas fa-scroll rollmacro" data-category="dodge" data-target="Failure"></i></p>`;
        } else if (roll.total < 51) {
          flavour += `<p class="critsuccess">[<b>${game.i18n.localize(`local.rolls.partial`)}</b>]</p>`;
        } else if (roll.total < 151) {
          flavour += `<p class="critsuccess">[<b>${game.i18n.localize(`local.rolls.success`)}</b>]</p>`;
        } else {
          flavour += `<p class="critsuccess">[<b>${game.i18n.localize(`local.rolls.outstanding`)}</b>]</p>`;
        }

        this.showJournal(rolldata.attacktable);
        break;
      }
      case "attack": {
        // An attack roll, open-ended (crit)
        // prepare the crit roll for attacks only
        critRoll = await new Roll("1d100").evaluate();
        if (firstRoll <= unmodified) {
          // fumble has occurred
          // render roll and critRoll with fumble message then return
          flavour += `<p class="critfail">${game.i18n.localize(`local.rolls.d100roll`)}: [<b>${firstRoll} - ${game.i18n.localize(`local.rolls.critfail`)}</b>]`;
          switch (rolldata.name.split(":")[0]) {
            case "Blunt":
            case "Blades":
            case "Brawl":
            case "Polearms":
              flavour += ` <i class="fas fa-scroll rollmacro" data-category="dodge" data-target="Fumble (Me"></i></p>`;
              break;
            case "Ranged":
              flavour += ` <i class="fas fa-scroll rollmacro" data-category="dodge" data-target="Fumble"></i></p>`;
              break;
            default: // a spell attack
              flavour += ` <i class="fas fa-scroll rollmacro" data-category="dodge" data-target="Failure"></i></p>`;
              break;
          }
          if (rolldata.actor.system.autoCrit) {
            flavour += `<p>${game.i18n.localize(`local.rolls.attack.d100critroll`)}: [<b>${critRoll.total}</b>]</p>`;
          }
          roll.toMessage({
            speaker: ChatMessage.getSpeaker({ actor: rolldata.actor }),
            flavor: flavour,
          });
          rolldata.actor.update({ ["data.gmod.value"]: 0 });
          rolldata.actor.resetModVars(false);
          return;
        } else if (unmodified == 10 && firstRoll % 11 == 0) {
          // only spell attacks have a clumsy range of 10
          // Magical Resonance has occurred on this spell attack. Notify the Caster
          flavour += `<p class="critfail">${game.i18n.localize(`local.rolls.resonance`)} <i class="fas fa-scroll rollmacro" data-category="dodge" data-target="Resonance"></i></p>`;
        }

        // display the d100 roll
        flavour += `<p>${game.i18n.localize(`local.rolls.d100roll`)}: [<b>${firstRoll}</b>] - `;
        flavour += `<a class="open-journal" data-table="${rolldata.attacktable}">${game.i18n.localize(`local.rolls.attack.attack`)}</a></p>`;

        const openEnded = await this.checkOpenEnded(roll, openEndedRange);
        if (openEnded) {
          roll = openEnded.roll;
          flavour += `<p class=${openEnded.explodeUp ? "critsuccess" : "critfail"}>${rollType.toUpperCase()} ${game.i18n.localize(`local.rolls.roll`)}: [<b>${roll.dice[1].total}</b>]</p>`;;
        }

        // display the automated crit roll if desired
        if (rolldata.actor.system.autoCrit) {
          flavour += `<p>${game.i18n.localize(`local.rolls.attack.d100critroll`)}: [<b>${critRoll.total}</b>] - `;
          flavour += `<a class="open-journal" data-table="${rolldata.crittable}">${game.i18n.localize(`local.rolls.attack.critical`)}</a></p>`;
        }
        this.showJournal(rolldata.attacktable);
        if (roll.total > rolldata.maxresult) {
          flavour += `<p class="critfail">${game.i18n.localize(`local.rolls.attack.maxresult`)}: [<b>${rolldata.maxresult}</b>]</p>`;
        }
        break;
      }
      case "modlist": {
        // all the work has been done above. Maybe move it in here to tidy up?
        flavour += `<hr><p>${roll.result} = <b>${roll.total}</b></p>`;
        new MyDialog({
          title: rolldata.actor.name,
          content: flavour,
          buttons: {
            close: {
              icon: "<i class='fas fa-check'></i>",
              label: "Close",
            },
          },
          default: "close",
        }).render(true);
        return;
      }
      default: {
        // unsupported roll types
        ui.notifications.info(`The ${rolldata.type} roll is not yet supported.`);
        return;
      }
    }

    // prepare the flavor in advance based on which type of die is in use.
    roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: rolldata.actor }),
      flavor: flavour,
    });
    rolldata.actor.update({ ["system.gmod.value"]: 0 });
    rolldata.actor.resetModVars(false);
    return;
  }

  showJournal(journalPage) {
    if (game.settings.get("vsd", "preventTablePopUp")) return;
    system.showJournal(journalPage);
  }

  async checkOpenEnded(roll, openEndedRange) {
    const result = {};
    const firstRoll = roll.terms[0].total;
    const topEnd = 100 - openEndedRange;
    // does it explode
    if (firstRoll <= openEndedRange) {// explodes downward
      result.explodeUp = false;
    } else if (firstRoll > topEnd) {// explodes upward
      result.explodeUp = true;
    } else {
      return null;
    }
    result.roll = roll.clone();
    result.roll.terms[0] = new Die({ number: 1, faces: 100, results: [{ result: firstRoll, active: true }] });
    result.roll.terms.push(new OperatorTerm({ operator: (result.explodeUp) ? '+' : '-' }));
    result.roll.terms.push(new Die({ number: 1, faces: 100, modifiers: ['x>' + topEnd] }));
    await result.roll.evaluate();
    result.roll._formula = result.roll.formula;
    return result;
  }

  /**
   * Pass a filtering object to this method in the form:
   * {
   *  type: "",
   *  category: "",
   *  group: "",
   *  target: "",
   *  position: {
   *   width: 300,
   *   top: 0,
   *   left: 0
   *  }
   * }
   * where the values shown are the defaults and may be omitted
   * if not required.
   *
   * Each field is a comma-separated list of the things you want
   * to include in the result. It matches against the text you
   * enter, so a category of "s" will match skill, spell and rms.
   *
   * type: may be any of {Primary, Melee, Ranged,
   * Attack, Rollable, Defence}
   *
   * category: applies only to type:
   *     Rollable: {check, skill, spell, technique, rms} and
   *     Defence: {dodge, parry, block}
   * and may be used without specifying the type.
   *
   * group: is a user-defined field for use in filtering
   * this result.
   *
   * target: Any case-sensitive portion of the item name.
   */
  rollables(macroData) {
    macroData.position = macroData.position || { width: 300, top: 0, left: 0 };
    macroData.type = macroData.type || "";
    macroData.category = macroData.category || "";
    macroData.group = macroData.group || "";
    macroData.target = macroData.target || "";
    macroData.flavour = macroData.flavour || "";

    const rollables = this.items
      .filter(function (item) {
        if ("ContainerTraitPoolModifierVariableAbilityEquipment".includes(item.type)) return null;
        if (macroData.target != "") {
          const cases = macroData.target.split(",").map((word) => word.trim());
          if (!cases.some((target) => item.name.includes(target))) return null;
        }
        if (macroData.group != "") {
          const cases = macroData.group.split(",").map((word) => word.trim());
          if (!cases.some((target) => item.system.group.includes(target))) return null;
        }
        if (macroData.category != "") {
          const cases = macroData.category.split(",").map((word) => word.trim());
          if (!cases.some((target) => item.system.category?.includes(target))) return null;
        } else {
          const cases = macroData.type.split(",").map((word) => word.trim());
          if (!cases.some((target) => item.type.includes(target))) return null;
        }
        return item;
      })
      .sort((a, b) => {
        if (a.name < b.name) return -1;
        if (a.name > b.name) return 1;
        return 0;
      });

    switch (rollables.length) {
      case 0:
        switch (macroData.type) {
          case "postDefences":
            this.actor.postDefences();
            break;
          default:
            ui.notifications.error("Your rollmacro call produced no results");
        }
        break;
      case 1: // go straight to the roll dialog with modifiers
        this.modifierdialog(rollables[0]._id, macroData);
        break;
      default: // provide the choice of results
        this.rollabledialog(rollables, macroData);
        break;
    }
  }

  async toggleStatusFromFolderItem(itemdata) {
    // the status has already been toggled
    const modref = CONFIG.system.slugify(itemdata.name);
    let existing = this.system.modifiers?.[modref] || null;
    if (existing == null) {
      await this.createEmbeddedDocuments("Item", [itemdata], { renderSheet: false, });
      existing = this.system.modifiers?.[modref];
    }
    const toggledOn = this.statuses.has(modref);
    if (toggledOn) { // if necessary, update/add the modifier
      if (!CONFIG.system.entriesAreEqual(itemdata.system.entries, existing.system.entries)) {
        await this.deleteEmbeddedDocuments("Item", [existing._id]);
        await this.createEmbeddedDocuments("Item", [itemdata], { renderSheet: false, });
        existing = this.system.modifiers?.[modref];
      }
    }
    existing.update({ system: { inEffect: toggledOn, alwaysOn: false } });
  }

  postDefences() {
    const defences = this.getRollData().defence;

    console.debug(`Defences for ${this.name}\n`, defences);

    let message = `<table class="critical-result">\n`;

    switch (defences.shieldposition) {
      case "side": {
        message += `<tr><td>Shield Position:</td><td>Shield Side</td></tr>\n`;
        message += `<tr><td>Armor Type:</td><td>${defences.armourType}</td></tr>\n`;
        message += `<tr><td><span class="defencevalue" data-type="db" data-db="${defences.base}">Base DB:</span></td><td>${defences.base}</td></tr>\n`;
        message += `<tr><td><span class="defencevalue" data-type="db" data-db="${defences.surprise}">Surprised DB:</span></td><td>${defences.surprise}</td></tr>\n`;
        if (defences.base != defences.righthand)
          message += `<tr><td><span class="defencevalue" data-type="db" data-db="${defences.righthand}">Right Hand Parry:</span></td><td>${defences.righthand}</td></tr>\n`;
        message += `<tr><td><span class="defencevalue" data-type="db" data-db="${defences.missileDB}">Missile DB Side:</span></td><td>${defences.missileDB}</td></tr>\n`;
        message += `<tr><td><span class="defencevalue" data-type="db" data-db="${defences.meleeDB}">Melee DB Side:</span></td><td>${defences.meleeDB}</td></tr>\n`;
        break;
      }
      case "front": {
        message += `<tr><td>Shield Position:</td><td>Shield Front</td></tr>\n`;
        message += `<tr><td>Armor Type:</td><td>${defences.armourType}</td></tr>\n`;
        message += `<tr><td><span class="defencevalue" data-type="db" data-db="${defences.base}">Base DB:</span></td><td>${defences.base}</td></tr>\n`;
        message += `<tr><td><span class="defencevalue" data-type="db" data-db="${defences.surprise}">Surprised DB:</span></td><td>${defences.surprise}</td></tr>\n`;
        message += `<tr><td><span class="defencevalue" data-type="db" data-db="${defences.missileDB}">Missile DB Front:</span></td><td>${defences.missileDB}</td></tr>\n`;
        message += `<tr><td><span class="defencevalue" data-type="db" data-db="${defences.meleeDB}">Melee DB Front:</span></td><td>${defences.meleeDB}</td></tr>\n`;
        break;
      }
      default: {
        //none, no shield
        if (defences.base) {
          message += `<tr><td>Shield Position:</td><td>No Shield</td></tr>\n`;
          message += `<tr><td>Armor Type:</td><td>${defences.armourType}</td></tr>\n`;
          message += `<tr><td><span class="defencevalue" data-type="db" data-db="${defences.base}">Base DB:</span></td><td>${defences.base}</td></tr>\n`;
          message += `<tr><td><span class="defencevalue" data-type="db" data-db="${defences.surprise}">Surprised DB:</span></td><td>${defences.surprise}</td></tr>\n`;
          if (defences.base != defences.righthand)
            message += `<tr><td><span class="defencevalue" data-type="db" data-db="${defences.righthand}">Right Hand Parry:</span></td><td>${defences.righthand}</td></tr>\n`;
          if (defences.base != defences.lefthand)
            message += `<tr><td><span class="defencevalue" data-type="db" data-db="${defences.lefthand}">Right Hand Parry:</span></td><td>${defences.lefthand}</td></tr>\n`;
        } else {
          message += `<tr><td>Shield Position:</td><td>Unknown</td></tr>\n`;
          message += `<tr><td>Armor Type:</td><td>${defences.armourType}</td></tr>\n`;
          message += `<tr><td><span class="defencevalue" data-type="db" data-db="${defences.meleeDBItem.system.moddedvalue}">Melee DB:</span></td><td>${defences.meleeDBItem.system.moddedvalue}</td></tr>\n`;
          message += `<tr><td><span class="defencevalue" data-type="db" data-db="${defences.missileDBItem.system.moddedvalue}">Missile DB:</span></td><td>${defences.missileDBItem.system.moddedvalue}</td></tr>\n`;
          break;
        }
      }
    }
    message += `</table>`;

    ChatMessage.create({
      speaker: { actor: this.id },
      content: message,
    });
  }

  async rollabledialog(rollableData, macroData) {
    const actor = this;
    const template = "systems/vsd/templates/rollmacro/rollables.hbs";
    const html = await renderTemplate(template, { rollableData });

    new MyDialog({
      title: `Rollables: ${actor.name}`,
      content: html,
      buttons: {},
      options: {
        actor: actor,
        macroData: macroData
      }
    }, {
      width: macroData.position.width || 300,
      top: macroData.position.top || 0,
      left: macroData.position.left || 0
    }).render(true);
  }

  // a test method for executing token actions. SysDev part 8 covers a better way to do this.
  async modifierdialog(rollableId, macroData) {
    const rollableData = this.items.get(rollableId);
    const actor = this;
    const name = rollableData.name;
    const type = rollableData.type;
    const tempcats = {};
    const category = type == "Primary-Attribute"
      ? "skill"
      : type == "Melee-Attack" || type == "Ranged-Attack"
        ? "attack"
        : type == "Defence"
          ? "defence"
          : rollableData.system.category || null;

    const modifiers = [];
    for (const mod of this.itemTypes.Modifier) {
      for (const entry of mod.system.entries) {
        if (tempcats[entry.category]) {
          tempcats[entry.category]++
        } else {
          tempcats[entry.category] = 1
        }
        if (category != entry.category) continue;
        if (entry.formula == "") continue;

        let hasRelevantTarget = entry.targets.trim();
        // does this modifier have targets?
        if (hasRelevantTarget != "") {
          hasRelevantTarget = false;
          // get the array of targets to which it applies
          const cases = entry.targets.split(",").map(word => word.trim());
          for (const target of cases) {
            // test the target against the beginning of name for a match
            if (name.startsWith(target)) {
              hasRelevantTarget = true;
              continue;
            }
          }
        } else {
          // a general modifier
          hasRelevantTarget = true;
        }
        if (hasRelevantTarget) {
          // does the modifier have a reference?
          if (entry.formula.includes("@")) {
            // is the reference to a Variable or Pool?
            const regex = /[@]([\w.]+)/gi;
            const reference = regex.exec(entry.formula)[1];
            const varpool = actor.system.tracked[reference] || actor.system.dynamic[reference];
            if (varpool) {
              if (!modifiers.includes(varpool)) {
                switch (varpool.type) {
                  case "Primary-Attribute": {
                    switch (reference) {
                      case "edb":
                      case "parry":
                      case "sst": {
                        modifiers.push(varpool);
                        break;
                      }
                    }
                    break;
                  }
                  default: {
                    modifiers.push(varpool);
                  }
                }
              }
            }
          }
          modifiers.push(mod);
        }
      }
    }
    console.log([name, type, category, tempcats]);
    const uniquemods = [...new Set(modifiers)];

    // Is there at least one target selected so we can fetch it's defence data?
    const hasTarget = game.user.targets.size > 0 && (type == "Melee-Attack" || type == "Ranged-Attack");
    const target = game.user.targets.first()?.name || "No Target";
    let defence = null;
    if (hasTarget) {
      defence = game.user.targets.first().actor.system.defence;
    }

    const template = "systems/vsd/templates/rollmacro/modifiers.hbs";
    const html = await renderTemplate(template, {
      actor,
      rollableData,
      uniquemods,
      hasTarget,
      defence,
      target
    });

    new MyDialog({
      title: `Rollable: ${actor.name}`,
      content: html,
      buttons: {
        back: {
          label: "Back",
          callback: (html) => {
            this.rollables(macroData);
          }
        }
      },
      options: {
        actor: actor,
        macroData: macroData,
      }
    }, {
      width: macroData.position.width || 300,
      top: macroData.position.top || 0,
      left: macroData.position.left || 0,
    }).render(true);
  }
}
