import { BaseActorSheet } from "./baseActor-sheet.js";

/** Always-on Manual items used as the form-sheet source of truth. */
export const MANUAL_ITEM_DEFS = {
  baseStats: {
    name: "Base Stat Values",
    type: "Modifier",
    system: {
      chartype: "CharacterVsD",
      group: "manual",
      inEffect: true,
      alwaysOn: true,
      primary: true,
      entries: [
        { value: 0, formula: "0", category: "primary", targets: "BRN" },
        { value: 0, formula: "0", category: "primary", targets: "SWI" },
        { value: 0, formula: "0", category: "primary", targets: "FOR" },
        { value: 0, formula: "0", category: "primary", targets: "WIT" },
        { value: 0, formula: "0", category: "primary", targets: "WSD" },
        { value: 0, formula: "0", category: "primary", targets: "BEA" }
      ]
    }
  },
  kinManual: {
    name: "Kin: Manual",
    type: "Modifier",
    system: {
      chartype: "CharacterVsD",
      group: "manual",
      inEffect: true,
      alwaysOn: true,
      primary: true,
      defence: true,
      entries: [
        { value: 0, formula: "0", category: "primary", targets: "BRN" },
        { value: 0, formula: "0", category: "primary", targets: "SWI" },
        { value: 0, formula: "0", category: "primary", targets: "FOR" },
        { value: 0, formula: "0", category: "primary", targets: "WIT" },
        { value: 0, formula: "0", category: "primary", targets: "WSD" },
        { value: 0, formula: "0", category: "primary", targets: "BEA" },
        { value: 0, formula: "0", category: "defence", targets: "Toughness" },
        { value: 0, formula: "0", category: "defence", targets: "Willpower" }
      ]
    }
  },
  specialBonus: {
    name: "Special Bonus",
    type: "Modifier",
    system: {
      chartype: "CharacterVsD",
      group: "manual",
      inEffect: true,
      alwaysOn: true,
      primary: true,
      defence: true,
      entries: [
        { value: 0, formula: "0", category: "primary", targets: "BRN" },
        { value: 0, formula: "0", category: "primary", targets: "SWI" },
        { value: 0, formula: "0", category: "primary", targets: "FOR" },
        { value: 0, formula: "0", category: "primary", targets: "WIT" },
        { value: 0, formula: "0", category: "primary", targets: "WSD" },
        { value: 0, formula: "0", category: "primary", targets: "BEA" },
        { value: 0, formula: "0", category: "defence", targets: "Toughness" },
        { value: 0, formula: "0", category: "defence", targets: "Willpower" }
      ]
    }
  },
  ranksManual: {
    name: "Ranks: Manual",
    type: "Variable",
    system: {
      chartype: "CharacterVsD",
      group: "manual",
      entries: []
    }
  },
  vocationManual: {
    name: "Vocation: Manual",
    type: "Modifier",
    system: {
      chartype: "CharacterVsD",
      group: "manual",
      inEffect: true,
      alwaysOn: true,
      skill: true,
      spell: true,
      reaction: true,
      entries: []
    }
  },
  formSkillKin: {
    name: "Form Skill Kin",
    type: "Modifier",
    system: {
      chartype: "CharacterVsD",
      group: "manual",
      inEffect: true,
      alwaysOn: true,
      skill: true,
      spell: true,
      reaction: true,
      entries: []
    }
  },
  formSkillSpec: {
    name: "Form Skill Spec",
    type: "Modifier",
    system: {
      chartype: "CharacterVsD",
      group: "manual",
      inEffect: true,
      alwaysOn: true,
      skill: true,
      spell: true,
      reaction: true,
      entries: []
    }
  },
  formSkillItem: {
    name: "Form Skill Item",
    type: "Modifier",
    system: {
      chartype: "CharacterVsD",
      group: "manual",
      inEffect: true,
      alwaysOn: true,
      skill: true,
      spell: true,
      reaction: true,
      entries: []
    }
  },
  formSaveLevel: {
    name: "Form Save Level",
    type: "Modifier",
    system: {
      chartype: "CharacterVsD",
      group: "manual",
      inEffect: true,
      alwaysOn: true,
      defence: true,
      entries: [
        { value: 0, formula: "0", category: "defence", targets: "Toughness" },
        { value: 0, formula: "0", category: "defence", targets: "Willpower" }
      ]
    }
  }
};

/**
 * PDF-style form-fillable character sheet for Against the Darkmaster PCs.
 * Manual column edits write into dedicated always-on Modifier/Variable items.
 * @extends {BaseActorSheet}
 */
export class ActorVsDFormSheet extends BaseActorSheet {

  static DEFAULT_OPTIONS = {
    classes: ["vsd", "sheet", "actor", "vsd-form-sheet"],
    tag: "form",
    position: { width: 980, height: 900 },
    form: { submitOnChange: true, closeOnSubmit: false },
    window: { resizable: true },
    actions: {}
  };

  static PARTS = {
    body: {
      template: "systems/vsd/templates/actor/actorVsDForm-sheet.hbs",
      scrollable: [".sheet-body"]
    }
  };

  /** @override */
  async _onRender(context, options) {
    await super._onRender(context, options);
    if (!this.isEditable) return;
    if (!this._manualEnsured) {
      this._manualEnsured = true;
      await this.ensureManualItems();
    }
    const html = $(this.element);
    html.off("change", ".form-col-input").on("change", ".form-col-input", this._onManualColChange.bind(this));
  }

  /**
   * Ensure Manual write-through items exist on the actor.
   * @returns {Promise<object>} map of slugified name → Item
   */
  async ensureManualItems() {
    const actor = this.actor;
    const byName = {};
    for (const item of actor.items) {
      byName[item.name] = item;
    }
    const toCreate = [];
    for (const def of Object.values(MANUAL_ITEM_DEFS)) {
      if (!byName[def.name]) {
        toCreate.push(foundry.utils.duplicate(def));
      }
    }
    if (toCreate.length) {
      const created = await actor.createEmbeddedDocuments("Item", toCreate, { renderSheet: false });
      for (const item of created) {
        byName[item.name] = item;
      }
    }
    return byName;
  }

  /**
   * Find or append an entry on a Modifier/Variable and set its formula.
   */
  static setEntryValue(entries, matchFn, patch) {
    const list = foundry.utils.duplicate(entries || []);
    let entry = list.find(matchFn);
    if (!entry) {
      entry = {
        value: 0,
        formula: "0",
        category: patch.category || "",
        targets: patch.targets || "",
        label: patch.label || ""
      };
      list.push(entry);
    }
    if (patch.category != null) entry.category = patch.category;
    if (patch.targets != null) entry.targets = patch.targets;
    if (patch.label != null) entry.label = patch.label;
    entry.formula = String(patch.formula);
    entry.value = Number(patch.formula) || 0;
    return list;
  }

  async _onManualColChange(event) {
    event.preventDefault();
    event.stopPropagation();
    const el = event.currentTarget;
    const manual = el.dataset.manual;
    const raw = el.value === "" ? "0" : el.value;
    const num = Number(raw);
    const formula = Number.isFinite(num) ? String(num) : "0";

    const items = await this.ensureManualItems();

    switch (manual) {
      case "stat-base": {
        const item = items["Base Stat Values"];
        const abbr = (el.dataset.abbr || "").toUpperCase();
        const entries = ActorVsDFormSheet.setEntryValue(
          item.system.entries,
          (e) => e.category === "primary" && e.targets?.includes(abbr),
          { formula, category: "primary", targets: abbr }
        );
        await item.update({ "system.entries": entries });
        break;
      }
      case "stat-kin": {
        const item = items["Kin: Manual"];
        const abbr = (el.dataset.abbr || "").toUpperCase();
        const entries = ActorVsDFormSheet.setEntryValue(
          item.system.entries,
          (e) => e.category === "primary" && e.targets?.includes(abbr),
          { formula, category: "primary", targets: abbr }
        );
        await item.update({ "system.entries": entries });
        break;
      }
      case "stat-spec": {
        const item = items["Special Bonus"];
        const abbr = (el.dataset.abbr || "").toUpperCase();
        const entries = ActorVsDFormSheet.setEntryValue(
          item.system.entries,
          (e) => e.category === "primary" && e.targets?.includes(abbr),
          { formula, category: "primary", targets: abbr }
        );
        await item.update({ "system.entries": entries });
        break;
      }
      case "save-kin":
      case "save-spec":
      case "save-lvl": {
        const saveName = el.dataset.save || "";
        const target = saveName.startsWith("T") ? "Toughness" : "Willpower";
        const item = manual === "save-kin"
          ? items["Kin: Manual"]
          : manual === "save-spec"
            ? items["Special Bonus"]
            : items["Form Save Level"];
        const entries = ActorVsDFormSheet.setEntryValue(
          item.system.entries,
          (e) => e.category === "defence" && (e.targets?.includes(target) || e.targets?.includes(target.slice(0, 4))),
          { formula, category: "defence", targets: target }
        );
        await item.update({
          "system.entries": entries,
          "system.defence": true,
          "system.inEffect": true,
          "system.alwaysOn": true
        });
        break;
      }
      case "skill-ranks": {
        const skill = el.dataset.skill || "";
        const item = items["Ranks: Manual"];
        const entries = ActorVsDFormSheet.setEntryValue(
          item.system.entries,
          (e) => e.label === skill,
          { formula, label: skill }
        );
        await item.update({ "system.entries": entries });
        break;
      }
      case "skill-voc":
      case "skill-kin":
      case "skill-spec":
      case "skill-item": {
        const skill = el.dataset.skill || "";
        const isSpell = el.dataset.skilltype === "spell";
        const isReaction = skill === "Body" || skill === "Armor";
        const category = isReaction ? "reaction" : (isSpell ? "spell" : "skill");
        const item = manual === "skill-voc"
          ? items["Vocation: Manual"]
          : manual === "skill-kin"
            ? items["Form Skill Kin"]
            : manual === "skill-spec"
              ? items["Form Skill Spec"]
              : items["Form Skill Item"];
        const entries = ActorVsDFormSheet.setEntryValue(
          item.system.entries,
          (e) => e.targets === skill || e.targets?.split(",").map((t) => t.trim()).includes(skill),
          { formula, category, targets: skill }
        );
        const update = {
          "system.entries": entries,
          "system.inEffect": true,
          "system.alwaysOn": true
        };
        if (isReaction) update["system.reaction"] = true;
        else if (isSpell) update["system.spell"] = true;
        else update["system.skill"] = true;
        await item.update(update);
        break;
      }
      case "mp-max": {
        const mp = this.actor.system.tracked?.mp;
        if (mp) {
          await mp.update({
            "system.maxForm": formula,
            "system.max": Number(formula) || 0
          });
        }
        break;
      }
      default:
        console.warn("Unhandled form-col-input", manual);
    }
  }
}
