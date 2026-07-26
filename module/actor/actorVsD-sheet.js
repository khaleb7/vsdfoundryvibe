import { BaseActorSheet } from "./baseActor-sheet.js";
import { xmlToJson, parseXML, json2xml, xml2json } from "../utility.js";

/**
 * Extend the basic ActorSheet with some very simple modifications
 * @extends {BaseActorSheet}
 */
export class ActorVsDClassicSheet extends BaseActorSheet {

  /** @override */
  async _onRender(context, options) {
    await super._onRender(context, options);
    if (!this.isEditable) return;
    const html = $(this.element);
    html.find('.importERA').click(this._onImportERAData.bind(this));
  }

  /**
   * An XML data importer needs:
   * - to read the XML file from the itemscript field
   * - an xml to json converter
   * - a json reader to convert to GRPGA Items
   */
  async _onImportERAData(event) {
    event.preventDefault();
    let temp = this.actor.system.itemscript.replace(/\t/g, " - ");
    temp = temp.replace(/&#13;&#10;/g, "\n");
    temp = temp.replace(/Ball and Chain/g, "Ball &amp; Chain");
    temp = temp.replace(/Songs and Tales/g, "Songs &amp; Tales");
    temp = temp.replace(/Locks and Traps/g, "Locks &amp; Traps");
    temp = temp.replace(/Sounds and Lights/g, "Sounds &amp; Lights");
    temp = temp.replace(/Nature's Path/g, "Natures Path");
    temp = temp.replace(/ \(Common\)/g, "");
    if (temp[0] == "\"") { // remove the wrapping doublequotes
      temp = temp.substr(1, temp.length - 2);
    }
    const p = parseXML(temp);
    const x = xml2json(p, "\t");
    const eradata = JSON.parse(x);
    console.debug("Imported JSON character data\n", [eradata]);

    const packitems = await game.packs.get("vsd.vsd-items").getDocuments();
    const itemsref = {
      container: {},
      rollable: {},
      trait: {},
      melee_attack: {},
      ranged_attack: {},
      defence: {},
      pool: {},
      modifier: {},
      variable: {},
      primary_attribute: {},
      hit_location: {},
      equipment: {}
    };
    packitems.forEach((pi) => {
      itemsref[CONFIG.system.slugify(pi.type)][CONFIG.system.slugify(pi.name)] = pi;
    });
    console.debug("Compendium Items Reference\n", [itemsref]);
    { // Kin, Culture, Vocation
      const kin = itemsref.container[CONFIG.system.slugify(`Kin: ${eradata.character.race}`)];
      const culture = itemsref.variable[CONFIG.system.slugify(`Ranks: Culture (${eradata.character.culture})`)];
      const vocation = itemsref.container[CONFIG.system.slugify(`Vocation: ${eradata.character.profession}`)];
      const dropped = await this.actor.createEmbeddedDocuments('Item', [kin, culture, vocation], { renderSheet: false });
      for (const drop of dropped) {
        if (drop.type === "Container") {
          await this._deployItems(drop);
        }
      }
    }
    { // Stats - Modifier
      const values = {};
      const bonuses = [];
      for (const value of eradata.character.stats.stat) {
        values[value.shortName] = value.potential;
        if (value.specialBonus !== "0") {
          bonuses.push({ formula: value.specialBonus, category: "primary", targets: value.shortName });
        }
      }
      {
        const item = this.actor.system.modifiers.base_stat_values;
        const entries = item.system.entries;
        for (const entry of entries) {
          entry.formula = values[entry.targets];
        }
        await item.update({ 'system.entries': entries });
      }
      {
        const item = {
          name: "Special Bonus",
          type: "Modifier",
          system: {
            alwaysOn: true,
            entries: []
          }
        };
        for (const entry of bonuses) {
          item.system.entries.push(entry);
        }
        await this.actor.createEmbeddedDocuments('Item', [item], { renderSheet: false });
      }
    }
    { // Ranks for each level
      { // level only - Ranks: Level 1 - Variable
        const values = {};
        values["Level"] = eradata.character.level;
        const item = this.actor.system.dynamic.ranks_level_1;
        const entries = item.system.entries;
        for (const entry of entries) {
          entry.formula = values[entry.label] || "0";
        }
        await item.update({ 'system.entries': entries });
      }
      { // build each level Variable from scratch
        const levelups = (Array.isArray(eradata.character.developmentHistory.levelUp)) ? eradata.character.developmentHistory.levelUp : [eradata.character.developmentHistory.levelUp];
        const skillranks = {};
        for (const levelup of levelups) {
          const item = {
            name: "Ranks: NewLevel " + levelup.newLevel,
            type: "Variable",
            system: {
              entries: []
            }
          }
          for (const entry of levelup.skillDevelopments.skillDevelopment) {
            item.system.entries.push({ formula: entry.numberOfRanks, label: entry.skillName });
            const slug = CONFIG.system.slugify(entry.skillName);
            skillranks[slug] = true;
          }
          await this.actor.createEmbeddedDocuments('Item', [item], { renderSheet: false });
        }
        { // add the missing skills from the compendium
          const newskills = [];
          for (const skill of Object.keys(skillranks)) {
            if (this.actor.system.dynamic[skill] === undefined) newskills.push(itemsref.rollable[skill]);
          }
          await this.actor.createEmbeddedDocuments('Item', newskills, { renderSheet: false });
        }
      }
    }
    { // skills cleanup
      const dynamic = this.actor.system.dynamic;
      const item = {
        name: "Ranks: Extra Skills",
        type: "Variable",
        system: {
          entries: []
        }
      }
      const items = [item];
      const entries = item.system.entries;
      for (const skill of eradata.character.skills.skill) {
        if (skill.skillName.includes("(")) {
          const names = skill.skillName.split(" (");
          if ("BladesBluntBrawlPolearmsRanged".includes(names[0])) {
            const slug = CONFIG.system.slugify(names[1]);
            const weapon = itemsref.container[slug];
            if (weapon) {
              const dropped = await this.actor.createEmbeddedDocuments('Item', [weapon], { renderSheet: false });
              await this._deployItems(dropped[0]);
            } else {
              // something went wrong, publish it
            }
          }
        } else {
          const slug = CONFIG.system.slugify(skill.skillName);
          const importranks = Number(skill.ranks);
          const skillranks = dynamic[slug]?.system.ranks || false;
          if (skillranks) {
            if ((importranks - skillranks) > 0) {
              entries.push({ formula: "" + (importranks - skillranks), label: skill.skillName });
            }
          } else {
            if (importranks > 0) {
              entries.push({ formula: "" + importranks, label: skill.skillName });
              items.push(itemsref.rollable[slug]);
            }
          }
        }
      }
      await this.actor.createEmbeddedDocuments('Item', items, { renderSheet: false });
    }
    { // Wealth Level - Variable
      const item = this.actor.system.dynamic.wealth_level;
      await item.setValue(item.system.entries[eradata.character.playerKeptRecords.playerKeptRecord[2].value].label);
    }
    { // Sizes - Variable
      const item = this.actor.system.dynamic.sizes;
      await item.setValue(eradata.character.abilities.sizeCategory);
    }
    { // Drive - Primary-Attribute
      const item = this.actor.system.dynamic.drive;
      await item.update({ 'system.attr': eradata.character.playerKeptRecords.playerKeptRecord[0].value });
    }
    { // Heroic Path - Primary-Attribute
      const item = this.actor.system.dynamic.hero;
      await item.update({ 'system.attr': eradata.character.playerKeptRecords.playerKeptRecord[1].value });
    }
    { // inventory - Equipment
      const items = [];
      for (const item of eradata.character.inventory.item) {
        const armour = itemsref.modifier[CONFIG.system.slugify(item.name)] || false;
        if (armour) {
          await this.actor.createEmbeddedDocuments('Item', [armour], { renderSheet: false });
        }
        const eqpt = {
          name: item.name,
          type: "Equipment",
          system: {
            cost: "0",
            quantity: item.carriedItems.carriedItem.quantity,
            availability: "Culture",
            description: item.effect,
            notes: item.carriedItems.carriedItem.location
          }
        }
        items.push(eqpt);
      }
      await this.actor.createEmbeddedDocuments('Item', items, { renderSheet: false });
    }

    // last-minute direct updates to the actor
    await this.actor.update({
      'system.bm.sprint': eradata,
      'system.notes': eradata.character.notes["#cdata"],
      'name': eradata.character.name,
      'system.itemscript': ""
    });
  };

}
