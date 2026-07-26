import { system } from "../config.js";

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ActorSheetV2 } = foundry.applications.sheets;

/**
 * Extend the basic ActorSheet with some very simple modifications
 * @extends {ActorSheetV2}
 */
export class BaseActorSheet extends HandlebarsApplicationMixin(ActorSheetV2) {

  static DEFAULT_OPTIONS = {
    classes: ["vsd", "sheet", "actor"],
    tag: "form",
    position: { width: 875, height: 800 },
    form: { submitOnChange: true, closeOnSubmit: false },
    window: { resizable: true },
    actions: {}
  };

  static PARTS = {
    body: {
      template: "systems/vsd/templates/actor/actorVsDClassic-sheet.hbs",
      scrollable: [".sheet-body"]
    }
  };

  /** Resolve item id from a ContextMenu callback element (jQuery or HTMLElement). */
  static #itemIdFromElement(element) {
    const el = element?.jquery ? element : $(element);
    return el.data("item-id") ?? element?.dataset?.itemId;
  }

  itemContextMenu = [
    {
      name: game.i18n.localize("local.sheet.clone"),
      icon: '<i class="fas fa-copy"></i>',
      callback: (element) => {
        const itemId = BaseActorSheet.#itemIdFromElement(element);
        const item = foundry.utils.duplicate(this.actor.items.get(itemId));
        delete item._id;
        delete item.sort;
        if (item.flags) delete item.flags;
        if (item.effects) delete item.effects;
        this.actor.createEmbeddedDocuments("Item", [item], {
          renderSheet: true,
        });
      },
    },
    {
      name: game.i18n.localize("local.sheet.edit"),
      icon: '<i class="fas fa-edit"></i>',
      callback: (element) => {
        const itemId = BaseActorSheet.#itemIdFromElement(element);
        const item = this.actor.items.get(itemId);
        item.sheet.render(true);
      },
    },
    {
      name: game.i18n.localize("local.sheet.delete"),
      icon: '<i class="fas fa-trash"></i>',
      callback: (element) => {
        this.deleteItem(BaseActorSheet.#itemIdFromElement(element));
      },
    },
  ];

  /** @override */
  async _prepareContext(options) {
    if (CONFIG.system.testMode)
      console.debug("entering _prepareContext() in baseActor-sheet\n", this);

    const context = await super._prepareContext(options);
    const actor = this.actor;
    context.actor = actor;
    context.items = this.actor.items.map(i => i.toObject(false));
    context.system = actor.system;
    context.config = system;
    context.items = context.items.sort((a, b) => {
      if (a.name < b.name) return -1;
      if (a.name > b.name) return 1;
      return 0;
    });
    const TextEditorImpl = foundry.applications?.ux?.TextEditor?.implementation ?? TextEditor;
    context.enrichment = {
      system: {
        biography: await TextEditorImpl.enrichHTML(actor.system.biography)
      }
    };

    // My shortcuts
    const dynamic = actor.system.dynamic;
    const tracked = actor.system.tracked;
    const displaydata = actor.system.sheetData;

    displaydata.primaryattributes = [];
    displaydata.equipment = [];
    displaydata.hitlocations = [];
    displaydata.skills = [];
    displaydata.spells = [];
    displaydata.checks = [];
    displaydata.advantages = [];
    displaydata.disadvantages = [];
    displaydata.perks = [];
    displaydata.quirks = [];
    displaydata.charactertraits = [];
    displaydata.languageitems = [];
    displaydata.experienceHooks = [];
    displaydata.attacks = [];
    displaydata.defences = [];
    displaydata.pools = [];
    displaydata.containers = [];
    displaydata.variables = [];
    displaydata.attackDamageMods = [];
    displaydata.defencemods = [];
    displaydata.reactionMods = [];
    displaydata.skillmods = [];
    displaydata.spellmods = [];
    displaydata.checkmods = [];
    displaydata.primods = [];
    displaydata.conditions = [];

    for (const item of context.items) {
      switch (item.type) {
        case "Primary-Attribute": {
          displaydata.primaryattributes.push(item);
          break;
        }
        case "Equipment": {
          displaydata.equipment.push(item);
          break;
        }
        case "Hit-Location": {
          displaydata.hitlocations.push(item);
          break;
        }
        case "Rollable": {
          switch (item.system.category) {
            case "skill":
            case "technique": {
              displaydata.skills.push(item);
              break;
            }
            case "spell":
            case "rms": {
              displaydata.spells.push(item);
              break;
            }
            case "check": {
              displaydata.checks.push(item);
              break;
            }
          }
          break;
        }
        case "Trait": {
          switch (item.system.category) {
            case "advantage": {
              displaydata.advantages.push(item);
              break;
            }
            case "disadvantage": {
              displaydata.disadvantages.push(item);
              break;
            }
            case "quirk": {
              displaydata.quirks.push(item);
              break;
            }
            case "charactertrait": {
              displaydata.charactertraits.push(item);
              break;
            }
            case "language": {
              displaydata.languageitems.push(item);
              break;
            }
            case "experience": {
              displaydata.experienceHooks.push(item);
              break;
            }
            case "perk": {
              displaydata.perks.push(item);
              break;
            }
          }
          break;
        }
        case "Ranged-Attack":
        case "Melee-Attack": {
          displaydata.attacks.push(item);
          break;
        }
        case "Defence": {
          displaydata.defences.push(item);
          break;
        }
        case "Pool": {
          displaydata.pools.push(item);
          break;
        }
        case "Container": {
          displaydata.containers.push(item);
          break;
        }
        case "Variable": {
          displaydata.variables.push(item);
          break;
        }
        case "Modifier": {
          if (item.system.attack || item.system.damage)
            displaydata.attackDamageMods.push(item);
          if (item.system.defence) displaydata.defencemods.push(item);
          if (item.system.reaction) displaydata.reactionMods.push(item);
          if (item.system.skill) displaydata.skillmods.push(item);
          if (item.system.spell) displaydata.spellmods.push(item);
          if (item.system.check) displaydata.checkmods.push(item);
          if (item.system.primary) displaydata.primods.push(item);
          if (item.system.condition) displaydata.conditions.push(item);
          break;
        }
      }
      if (item.type != "Trait") {// For non-trait items to be displayed with them
        // add the item to the trait list
        switch (item.system.group.split(" ")[0].toLowerCase()) {
          case "revelation":
          case "advantage": {
            displaydata.advantages.push(item);
            break;
          }
          case "passion":
          case "disadvantage": {
            displaydata.disadvantages.push(item);
            break;
          }
          case "kin":
          case "perk": {
            displaydata.perks.push(item);
            break;
          }
          case "background":
          case "quirk": {
            displaydata.quirks.push(item);
            break;
          }
          case "char":
          case "character": {
            displaydata.charactertraits.push(item);
            break;
          }
        }
      }
    }

    // filter items in All Items
    displaydata.allitemstemp = [];
    let filterstring = "";
    for (const filter of Object.entries(actor.system.allitems)) {
      const itemtype = {
        name: filter[0],
        filtered: filter[1],
        localname: game.i18n.localize(`local.item.${filter[0]}.itemname`)
      }
      displaydata.allitemstemp.push(itemtype);
      if (filter[1]) filterstring += filter[0];
    }
    if (filterstring == "") {
      context.filtereditems = context.items;
    } else {
      context.filtereditems = context.items.filter(function (item) {
        if (filterstring.includes(item.type)) return item;
        return null;
      });
    }

    displaydata.backgrounds = displaydata.quirks?.map(
      (quirk) => quirk.name.split(":")[0]
    );

    const emptyitem = {
      _id: "",
      system: {
        value: 0,
        moddedvalue: 0,
        max: 0,
        abbr: "",
        label: "",
        entries: []
      }
    };
    displaydata.headerinfo = {
      hitpoints: tracked.hp || emptyitem,
      magicpoints: tracked.mp || emptyitem,
      woundsbleed: dynamic.woundsbleed.system.moddedvalue,
      woundspen: dynamic.woundspen.system.moddedvalue,
      encumbrance: displaydata.variables.find((e) => e.name == "Encumbrance") || emptyitem,
      move: displaydata.variables.find((e) => e.name == "Move Rate") || emptyitem,
      movemode: displaydata.variables.find((e) => e.name == "Move Mode") || emptyitem,
      wealth: displaydata.variables.find((e) => e.name == "Wealth Level") || emptyitem,
      size: displaydata.variables.find((e) => e.name == "Sizes") || emptyitem,
      experience: tracked.xp || emptyitem,
      level: dynamic.level?.system.ranks || 0,
      defence: actor.system.defence,
    };

    const headinfo = displaydata.headerinfo;
    const skilldata = displaydata.skillinfo || {};

    // These will only work for english
    for (const item of displaydata.disadvantages) {
      if (item.name?.startsWith("All")) {
        headinfo.allegiance = item.system.notes;
      } else if (item.name?.startsWith("Mot")) {
        headinfo.motivation = item.system.notes;
      } else if (item.name?.startsWith("Nat")) {
        headinfo.nature = item.system.notes;
      }
    }

    // iterate through all the reaction modifiers
    for (const item of displaydata.reactionMods) {
      if (item.name.split(" ")[0] == "Kin:") {
        headinfo.kin = item.name.split(": ")[1].trim() || ""; // set the kin name value here
      }
    }

    // get the advancement pools
    // fetch the named variable in dynamic and use the data stored there
    displaydata.advancementPools = [];
    for (const varname of system.advancementPools) {
      if (tracked[varname]) displaydata.advancementPools.push(tracked[varname]);
    }

    displaydata.advancementVariables = [];
    displaydata.advancementGrid = {};
    displaydata.advancementGrid.Level = {};
    for (const category of Object.values(skilldata)) {
      for (const skill of Object.values(category.data)) {
        if (skill) displaydata.advancementGrid[skill.name] = {};
      }
    }
    displaydata.advancementColumns = [];
    for (const variable of displaydata.variables) {
      if (variable.name.startsWith("Ranks:")) {
        displaydata.advancementVariables.push(variable);
        const column = {
          name: variable.name.split(": ")[1].trim(),
          _id: variable._id,
          notes: variable.system.notes,
        };
        if (variable.name.startsWith("Ranks: Culture")) {
          const regex = new RegExp(/\(([\w]+)\)/);
          const result = regex.exec(variable.name);
          headinfo.culture = result ? result[1] : "";
          column.name = "Culture";
        }
        displaydata.advancementColumns.push(column);
        for (const entry of variable.system.entries) {
          if (entry.label) {
            if (!displaydata.advancementGrid[entry.label])
              displaydata.advancementGrid[entry.label] = {};
            displaydata.advancementGrid[entry.label][column.name] = entry.value;
          }
        }
      } else if (variable.name.startsWith("Vocation:")) {
        displaydata.advancementVariables.push(variable);
        headinfo.vocation = variable.name.split(": ")[1].trim() || "";
        for (const entry of variable.system.entries) {
          if (skilldata[entry.label]) {
            skilldata[entry.label].devpts = entry.value;
          }
        }
        displaydata.advancementGrid.vocation = {
          name: "Voc",
          _id: variable._id,
          notes: variable.system.notes,
        };
      } else if (variable.name.startsWith("Wealth")) {
        displaydata.advancementVariables.push(variable);
      }
    }
    for (const column of displaydata.advancementColumns) {
      for (const skill of Object.values(displaydata.advancementGrid)) {
        if (skill[column.name]) continue;
        skill[column.name] = 0;
      }
    }

    // mark all of these as standard skills
    displaydata.skillsort = [];
    for (const skillcategory of system.skillsort) {
      const category = {
        name: skillcategory.name,
      };
      const skilldata = [];
      for (const skillname of skillcategory.data) {
        const skill = dynamic[skillname];
        if (skill) {
          skill.standard = true;
          skilldata.push(skill);
        }
      }
      category.data = skilldata;
      displaydata.skillsort.push(category);
    }
    // fetch the named variable in dynamic and use the data stored there; mark Body and Armor as standard
    displaydata.oddskills = [];
    for (const varname of system.oddskills) {
      if (dynamic[varname]) {
        displaydata.oddskills.push(dynamic[varname]);
        dynamic[varname].standard = true;
      }
    }

    displaydata.skillspecials = [];
    displaydata.specialrolls = [];
    // fetch the named variable in dynamic and use the data stored there
    for (const varname of system.specialrolls) {
      if (dynamic[varname]) displaydata.specialrolls.push(dynamic[varname]);
    }
    // search dynamic for the rest of the skills (and critical rolls) and use the data stored there
    for (const item of Object.values(dynamic)) {
      if (!item.type) continue;
      if (!item.standard && item.system.category == "skill")
        displaydata.skillspecials.push(item);
      else if (item.type == "Defence" && item.name.startsWith("Critical"))
        displaydata.specialrolls.push(item);
    }

    // find the named variable id in dynamic then use the original item
    displaydata.skillvariables = [];
    for (const varname of system.skillvariables) {
      if (dynamic[varname])
        displaydata.skillvariables.push(dynamic[varname]);
      else if (tracked[varname])
        displaydata.skillvariables.push(tracked[varname]);
    }
    // find the named variable id in dynamic then use the original item
    displaydata.spellvariables = [];
    for (const varname of system.spellvariables) {
      if (dynamic[varname])
        displaydata.spellvariables.push(dynamic[varname]);
      else if (tracked[varname])
        displaydata.spellvariables.push(tracked[varname]);
    }
    // find the named variable id in dynamic then use the original item
    displaydata.specialmods = [];
    for (const varname of system.specialmods) {
      if (dynamic[varname])
        displaydata.specialmods.push(dynamic[varname]);
    }

    // find the named variable id in dynamic then use the original item
    displaydata.defencevariables = [];
    for (const varname of system.defencevariables) {
      if (dynamic[varname])
        displaydata.defencevariables.push(dynamic[varname]);
      else if (tracked[varname])
        displaydata.defencevariables.push(tracked[varname]);
    }

    // find the named variable id in dynamic then use the original item
    displaydata.defencemodifiers = [];
    for (const varname of system.defencemodifiers) {
      if (dynamic[varname])
        displaydata.defencemodifiers.push(dynamic[varname]);
      else if (tracked[varname])
        displaydata.defencemodifiers.push(tracked[varname]);
    }
    // merge two existing arrays, removing duplicates
    displaydata.defencesavemods = [...displaydata.defencemods];
    for (const mod of displaydata.reactionMods) {
      if (!displaydata.defencesavemods.includes(mod) && !mod.system.group.startsWith("Action"))
        displaydata.defencesavemods.push(mod);
    }
    // process all attacks
    displaydata.allattacks = [];
    displaydata.spellattacks = [];
    displaydata.physicalattacks = [];
    for (const item of displaydata.attacks) {
      item.attacknamecrit = item.name.split(":")[1]?.trim() || item.name;
      item.attackname = item.attacknamecrit.split("(")[0]?.trim() || item.name;
      item.critname =
        `Critical (${item.attacknamecrit.split("(")[1]?.trim()}` ||
        "Critical (Cut)";
      item.attacktable =
        item.system.damage.split("Attack")[0]?.trim() || item.system.damage;
      item.criticaltable =
        item.system.damageType.split("Critical")[0]?.trim() ||
        item.system.damageType;
      item.skillname = system.slugify(item.name.split(":")[0]) || item.name;
      const skill = displaydata.skillspelldetails[item.skillname];
      var cmbBonus = skill?.stat + skill?.kin + skill?.voc;
      cmbBonus = isNaN(cmbBonus) ? 0 : cmbBonus;
      item.cmb = item.system.value + cmbBonus;
      displaydata.allattacks.push(item);
      if (item.system.armourDiv == 10) {
        // this is a spell attack for dynamic sheet
        displaydata.spellattacks.push(item);
      } else {
        // a physical attack for dynamic sheet
        displaydata.physicalattacks.push(item);
      }
    }
    // find the named variable id in dynamic then use the original item
    displaydata.attackvariables = [];
    for (const varname of system.attackvariables) {
      if (dynamic[varname])
        displaydata.attackvariables.push(dynamic[varname]);
      else if (tracked[varname])
        displaydata.attackvariables.push(tracked[varname]);
    }
    displaydata.specialcombatrolls = [];
    // fetch the named variable in dynamic and use the data stored there
    for (const varname of system.specialcombatrolls) {
      if (dynamic[varname]) displaydata.specialcombatrolls.push(dynamic[varname]);
    }
    // search dynamic for the rest of the skills (and critical rolls) and use the data stored there
    for (const item of Object.values(dynamic)) {
      if (item.type == "Defence" && item.name.startsWith("Critical"))
        displaydata.specialcombatrolls.push(item);
    }
    // find the named variable id in dynamic then use the original item
    displaydata.specialcombatmods = [];
    for (const varname of system.specialcombatmods) {
      if (dynamic[varname])
        displaydata.specialcombatmods.push(dynamic[varname]);
    }
    // get the Primary Attributes for display
    displaydata.primarysort = {
      name: system.primarysort.name,
    };

    const dynpridata = [];
    for (const skillname of system.primarysort.data) {
      const skill = dynamic[skillname];
      if (skill) {
        dynpridata.push(skill);
      }
    }
    displaydata.primarysort.data = dynpridata;

    // fetch the named variable in dynamic and use the data stored there
    displaydata.savesort = [];
    for (const varname of system.savesort) {
      if (dynamic[varname]) displaydata.savesort.push(dynamic[varname]);
    }

    return context;
  }

  /** @override */
  async _onRender(context, options) {
    await super._onRender(context, options);
    const html = $(this.element);

    // Preserve classic V1 tab markup in the existing template
    const TabsCls = foundry.applications?.ux?.Tabs ?? Tabs;
    new TabsCls({
      navSelector: ".sheet-nav",
      contentSelector: ".sheet-body",
      initial: "skills"
    }).bind(this.element);

    if (!this.isEditable) return;

    html.find(".item-create").click(this._onItemCreate.bind(this));
    html.find(".item-export").click(this._onItemExport.bind(this));
    html.find(".importJSON").click(this._onImportJSON.bind(this));

    html.find(".iteminput").change(this._onInputChange.bind(this));
    html.find(".plus").click(this._onPlusMinus.bind(this));
    html.find(".minus").click(this._onPlusMinus.bind(this));
    html.find(".rollable").click(this._onRoll.bind(this));
    html.find(".rollmacro").click(this._rollmacro.bind(this));
    html.find(".item-edit").click(this._onItemEdit.bind(this));
    html.find(".item-delete").click(this._onItemDelete.bind(this));
    html.find(".item-toggle").click(this._onToggleItem.bind(this));
    html.find(".collapsible").click(this._onToggleCollapse.bind(this));
    html.find(".importVsD").click(this._onImportVsDData.bind(this));
    // for a checkbox representation of a pool
    html.off("click", ".click-pool").on("click", ".click-pool", async (ev) => {
      ev.preventDefault();
      const target = ev.currentTarget;
      await this.actor.modifyTokenAttribute(
        `tracked.${target.dataset.abbr.toLowerCase()}`,
        target.dataset.value,
        false,
        true
      );
    });
    // not a contextmenu but just a right-click
    html.off("contextmenu", ".click-pool").on("contextmenu", ".click-pool", async (ev) => {
      ev.preventDefault();
      const target = ev.currentTarget;
      await this.actor.modifyTokenAttribute(
        `tracked.${target.dataset.abbr.toLowerCase()}`,
        target.dataset.value - 1,
        false,
        true
      );
    });
    // for a checkbox representation of a pool
    html.off("click", ".click-value").on("click", ".click-value", async (ev) => {
      ev.preventDefault();
      const target = ev.currentTarget;
      const targetitem = target.parentElement;
      // get the item id
      const itemId = targetitem.dataset.itemId;
      // get the name of the changed element
      const dataname = targetitem.dataset.name;
      // get the new value
      const value = target.dataset.value;
      // Get the original item.
      const item = this.actor.items.get(itemId);
      // update the item with the new value for the element or the actor if it is gmod
      await item.update({ [dataname]: Number(value) });
    });
    // not a contextmenu but just a right-click
    html.off("contextmenu", ".click-value").on("contextmenu", ".click-value", async (ev) => {
      ev.preventDefault();
      const target = ev.currentTarget;
      const targetitem = target.parentElement;
      // get the item id
      const itemId = targetitem.dataset.itemId;
      // get the name of the changed element
      const dataname = targetitem.dataset.name;
      // get the new value
      const value = target.dataset.value - 1;
      // Get the original item.
      const item = this.actor.items.get(itemId);
      // update the item with the new value for the element or the actor if it is gmod
      await item.update({ [dataname]: Number(value) });
    });

    const ContextMenuCls = foundry.applications?.ux?.ContextMenu?.implementation ?? ContextMenu;
    new ContextMenuCls(html, ".item", this.itemContextMenu, { jQuery: true });

    const handler = (ev) => this._onDragStart(ev);
    html.find(".draggable").each((i, li) => {
      li.setAttribute("draggable", true);
      li.addEventListener("dragstart", handler, false);
    });

    html.off('click', '.filter').on('click', '.filter', ev => {
      const type = ev.currentTarget.dataset.type;
      const current = this.actor.system.allitems[type];
      const update = `system.allitems.${type}`;
      this.actor.update({ [update]: !current });
    });

    html.off("click", ".open-journal").on("click", ".open-journal", async (ev) => {
      system.showJournal(ev.currentTarget.dataset.table);
    });
  }

  /**
   * Each field is a comma-separated list of the things you want
   * to include in the result. It matches against the text you
   * enter, so a category of "s" will match skill, spell and rms.
   *
   * type: may be any of {Primary, Melee, Ranged,
   * Attack, Rollable, Defence}
   *
   * category: applies only to:
   * Rollable: {check, skill, spell, technique, rms} and
   * Defence: {dodge, parry, block}
   * and may be used without specifying the type.
   *
   * group: is a user-defined field for use in filtering
   * this result.
   *
   * target: Any case-sensitive portion of the item name.
   */
  _rollmacro(ev) {
    const options = {
      position: {
        width: 300,
        top: 100,
        left: 100,
      },
      type: ev.currentTarget.dataset.type || "",
      category: ev.currentTarget.dataset.category || "",
      group: ev.currentTarget.dataset.group || "",
      target: ev.currentTarget.dataset.target || "",
    };
    const tokens = game.canvas.tokens.controlled;
    if (tokens.length != 0) { // use the token's actor just in case they are not linked
      if (tokens[0].actor.id == this.actor.id) tokens[0].actor.rollables(options);
    } else {
      this.actor.rollables(options);
    }
  }

  async _onImportJSON(event) {
    event.preventDefault();
    let scriptdata = this.actor.system.itemscript || "";
    // preserve newlines, etc - use valid JSON
    scriptdata = scriptdata
      .replace(/\\n/g, "\\n")
      .replace(/\\'/g, "\\'")
      .replace(/\\"/g, '\\"')
      .replace(/\\&/g, "\\&")
      .replace(/\\r/g, "\\r")
      .replace(/\\t/g, "\\t")
      .replace(/\\b/g, "\\b")
      .replace(/\\f/g, "\\f");
    // remove non-printable and other non-valid JSON chars
    scriptdata = scriptdata.replace(/[\u0000-\u0019]+/g, "");
    const data = JSON.parse(scriptdata);
    console.log("JSON Object\n", data);
  }

  _onToggleCollapse(event) {
    event.preventDefault();
    if (CONFIG.system.testMode)
      console.debug("entering _onToggleCollapse()", [this, event]);
    // do not collapse when creating an item
    if (event.target.parentElement.className.includes("item-create")) return;
    if (event.target.parentElement.className.includes("char-name")) return;
    const section = event.currentTarget.dataset.section;
    const current = this.actor.system.sections[section];
    const update = `system.sections.${section}`;
    const data = current === "block" ? "none" : "block";
    this.actor.update({ [update]: data });
  }

  async _onPlusMinus(event) {
    event.preventDefault();

    if (CONFIG.system.testMode)
      console.debug("entering _onPlusMinus()", [this, event]);

    const field = event.currentTarget.firstElementChild;
    const fieldName = field.name;
    const change = Number(field.value);
    var value;
    var fieldValue;

    if (field.className.includes("pool")) {
      return this.actor.modifyTokenAttribute(`tracked.${fieldName.toLowerCase()}`, field.value, true, true);
    } else {
      // haven't figured out non-pools yet

      switch (fieldName) {
        case "gmod": {
          fieldValue = "system.gmod.value";
          value = change + this.actor.system.gmod.value;
          this.actor.update({ [fieldValue]: value });
          break;
        }
        default: {
          break;
        }
      }
    }
  }

  async _onToggleItem(event) {
    event.preventDefault();
    const itemId = event.currentTarget.closest(".item").dataset.itemId;
    const item = this.actor.items.get(itemId);
    let attr = "";
    let inEffect = false;
    const update = [];
    switch (item.type) {
      case "Modifier": {
        attr = "system.inEffect";
        inEffect = item.system.inEffect; // not changed yet
        update.push({ _id: itemId, [attr]: !inEffect });
        if (item.system.group.startsWith("Action")) {
          if (game.canvas.tokens.controlled.length) {
            const token = game.canvas.tokens.controlled[0];
            if (token.actor != this.actor) return; // wrong token selected
            const statusId = item.name;
            const matching = this.actor.effects.filter(
              (e) => e.getFlag("core", "statusId") == statusId || e.statuses?.has?.(statusId)
            );
            const hasEffect = matching.length > 0;
            if (hasEffect == inEffect) {
              // Token#toggleEffect removed in V14 — use ActiveEffects / toggleStatusEffect
              if (hasEffect) {
                await this.actor.deleteEmbeddedDocuments(
                  "ActiveEffect",
                  matching.map((e) => e.id)
                );
              } else {
                const registered = Array.isArray(CONFIG.statusEffects)
                  ? CONFIG.statusEffects.find((e) => e.id === statusId)
                  : (CONFIG.statusEffects?.[statusId] ||
                    Object.values(CONFIG.statusEffects ?? {}).find((e) => e?.id === statusId));
                if (registered && typeof this.actor.toggleStatusEffect === "function") {
                  await this.actor.toggleStatusEffect(statusId, { active: true });
                } else {
                  await this.actor.createEmbeddedDocuments("ActiveEffect", [
                    {
                      name: `Action: ${item.name}`,
                      img: item.img,
                      statuses: [statusId],
                      flags: { core: { statusId } },
                    },
                  ]);
                }
              }
            }
          } else return; // no token selected, do not toggle action
        }
        break;
      }
      default: {
        ui.notifications.info(`Toggling of ${item.type} is not yet supported.`);
      }
    }
    return this.actor.updateEmbeddedDocuments("Item", update);
  }

  _onItemEdit(event) {
    event.preventDefault();
    const itemId = event.currentTarget.closest(".item").dataset.itemId;
    const item = this.actor.items.get(itemId);
    item.sheet.render(true);
  }

  deleteItem(itemId) {
    const item = this.actor.items.get(itemId);
    const items = [itemId];
    if (item.type == "Container") {
      if (item.system.dropped)
        for (let dropped of item.system.dropped) {
          if (this.actor.items.get(dropped))
            items.push(dropped);
        }
    }
    this.actor.deleteEmbeddedDocuments("Item", items);
  }

  _onItemDelete(event) {
    event.preventDefault();
    const itemId = event.currentTarget.closest(".item").dataset.itemId;
    this.deleteItem(itemId);
  }

  async dropItem(item) {

    // the item has already been created on the actor sheet
    const baseitem = await this.actor.items.get(item[0].id);

    // show the item sheet
    baseitem.sheet.render(true);
    return baseitem;
  }

  async dropData(dragItem, token) {
    if (CONFIG.system.testMode)
      console.debug(`processing ${dragItem.type}\n`, dragItem);
    let data = {};
    switch (dragItem.type) {
      case "critical": {
        if (dragItem.bleed != 0 || dragItem.action != 0) {
          // there is a wound to process
          let severity = "na";
          let dlth = 0;
          if (dragItem.action > 50) {
            severity = "crippling";
            dlth = 33;
          } else if (dragItem.action > 20) {
            severity = "serious";
            dlth = 13;
          } else if (dragItem.action > 0) {
            severity = "minor";
            dlth = 3;
          }
          data = {
            name: dragItem.woundtitle,
            type: "Hit-Location",
            system: {
              chartype: "CharacterVsD",
              damageResistance: Number(dragItem.bleed) || 0,
              damage: -Number(dragItem.action) || 0,
              injuryType: severity,
              toHitPenalty: dlth,
              notes: dragItem.message,
            },
          };
          if (dragItem.bleed != 0 && token != null) await this.setStatusEffect("bleeding", token);
          const item = await this.actor.createEmbeddedDocuments("Item", [data]);
          const baseitem = await this.actor.items.get(item[0].id);
          baseitem.sheet.render(true);
        }
        if (dragItem.hits) {
          // apply damage so it will update status and bar
          await this.actor.modifyTokenAttribute("tracked.hp", -dragItem.hits, true);
        }
        let effectMsg = ".";
        if (dragItem.effect) {
          // apply an effect (TODO: make a longer list)
          if (dragItem.effect.includes("stun")) {
            if (token != null) await this.setStatusEffect("stunned", token);
            const item = await this.actor.getNamedItem("modifiers.stunned");
            effectMsg = ", and appears to have been <b>Stunned</b>.";
            await item.update({ "system.inEffect": true });
          }
          if (dragItem.effect.includes("soul-damage")) {
            const souldamage = Number(dragItem.effect.split("ul-damage[")[1].split("]")[0]);
            const item = await this.actor.getNamedItem("dynamic.sd");
            await item.update({ "system.attr": Number(item.system.attr) + souldamage });
            effectMsg = ", and appears to have suffered <b>Soul Damage</b>.";
          }
          if (dragItem.effect.includes("death")) {
            const defeatedThreshold = -50
            await this.actor.modifyTokenAttribute("tracked.hp", defeatedThreshold);
            if (token != null) {
              await this.setStatusEffect("dead", token, { overlay: true });
              await this.setStatusEffect("blind", token);
              await this.setStatusEffect("prone", token);
            }
            effectMsg = ", and <b>dies</b>."
          }
        }
        ChatMessage.create({
          speaker: { alias: token == null ? this.actor.name : token.name },
          content: `Has suffered a <b>${dragItem.woundtitle}</b> critical strike${effectMsg}`,
        });
        break;
      }
      case "damage": {
        // apply damage so it will update status and bar
        await this.actor.modifyTokenAttribute("tracked.hp", -dragItem.hits, true);
        ChatMessage.create({
          speaker: { alias: token == null ? this.actor.name : token.name },
          content: `Has taken ${dragItem.hits} damage.`,
        });
        break;
      }
      case "healing": {
        await this.actor.modifyTokenAttribute("tracked.hp", dragItem.hits, true);
        ChatMessage.create({
          speaker: { alias: token == null ? this.actor.name : token.name },
          content: `Has regained ${dragItem.hits} health.`,
        });
        break;
      }
      case "souldamage": {
        // apply damage so it will update status and bar
        const item = await this.actor.getNamedItem("dynamic.sd");
        await item.update({ "system.attr": Number(item.system.attr) + Number(dragItem.hits) });
        ChatMessage.create({
          speaker: { alias: token == null ? this.actor.name : token.name },
          content: `Has taken ${dragItem.hits} soul damage.`,
        });
        break;
      }
      case "db": {
        // apply the enemy defensive bonus so it will update status and bar
        const item = await this.actor.getNamedItem("dynamic.edb");
        await item.update({ "system.attr": Number(dragItem.db) });
        ChatMessage.create({
          speaker: { alias: token == null ? this.actor.name : token.name },
          content: `EDB has been set to ${dragItem.db}.`,
        });
        break;
      }
      case "severity": {
        // set the value of the critical severity item
        const item = await this.actor.getNamedItem("dynamic.critical_severity");
        const parts = dragItem.crit.split(" ");
        if (parts.length == 1) {
          await item.update({
            "system.label": parts[0],
            "system.formula": "+0",
            "system.value": 0,
          });
        } else {
          await item.update({
            "system.label": parts[0],
            "system.formula": parts[1],
            "system.value": Number(parts[1]),
          });
        }
        ChatMessage.create({
          speaker: { alias: token == null ? this.actor.name : token.name },
          content: `Has set Critical Severity to ${dragItem.crit}.`,
        });
        break;
      }
    }
  }

  async setStatusEffect(statusId, token, { overlay = false, active } = {}) {
    if (!token.document.hasStatusEffect(statusId)) {
      const effect = CONFIG.statusEffects.find(e => e.id === statusId);
      await token.document.actor.toggleStatusEffect(effect.id, { active, overlay });
    }
  }

  async _onDrop(event) {
    // Try to extract the data
    let dragData;
    try {
      dragData = JSON.parse(event.dataTransfer.getData('text/plain'));
    } catch (err) {
      return false;
    }
    const actor = this.actor;

    // a contained item or wound effect will not have a uuid
    const temp = dragData.uuid?.split(".") || false;

    let itemids = {};
    if (temp) {
      for (let i = 0; i < temp.length; i++) {
        itemids[temp[i]] = temp[++i];
      }
    }

    const sameActor = (actor.isToken) ? actor.uuid.includes(itemids.Token) : actor.id == itemids.Actor;

    // wait for the item to be copied to the actor
    let item = await super._onDrop(event);

    if (sameActor) return item;
    if (item) {
      // a proper item was dropped and identified so unpack it or render it
      return this.dropItem(item);
    } else {
      // a piece of non-item data was dropped
      this.dropData(dragData, null);
    }
  }

  async _onTokenDrop(dragItem, token) {
    // wait for the item to be copied to the actor
    if (dragItem.type == "Item") {
      const item = await this._onDropItem(null, dragItem);
      return this.dropItem(item);
    } else {
      this.dropData(dragItem, token);
    }
  }

  async _onInputChange(event) {
    event.preventDefault();

    if (CONFIG.system.testMode)
      console.debug("entering _onInputChange()", [this, event]);

    const target = event.currentTarget;
    // get the item id
    const itemId = target.closest(".item").dataset.itemId;
    // get the name of the changed element
    const dataname = target.dataset.name;
    // get the new value
    const value = target.type === "checkbox" ? target.checked : target.value;
    // Get the original item.
    const item = this.actor.items.get(itemId);

    if (dataname == "system.alwaysOn") {
      item.update({ "system.alwaysOn": value, "system.inEffect": true });
      return;
    }

    // redirect changes to pool values
    if (target.className.includes("pool")) {
      const isDelta = value.startsWith("+") || value.startsWith("-");
      return this.actor.modifyTokenAttribute(
        `tracked.${target.dataset.abbr.toLowerCase()}`,
        value,
        isDelta,
        true
      );
    }
    // update the item with the new value for the element or the actor if it is gmod
    item
      ? await item.update({ [dataname]: value })
      : await this.actor.update({ [dataname]: value });
  }

  _onItemCreate(event) {
    event.preventDefault();
    const dataset = event.currentTarget.dataset;
    const scriptdata = this.actor.system.itemscript || "";
    if (!dataset.type) {
      this._createItems(scriptdata);
    } else {
      this._createItem(dataset);
    }
  }

  _onItemExport() {
    const items = foundry.utils.duplicate(this.actor.items.contents);
    var exported = [];
    for (const item of items) {
      if (item.type == "Container") continue;
      delete item._id;
      delete item.flags;
      delete item.sort;
      delete item.effects;
      exported.push(item);
    }
    exported = JSON.stringify(exported);
    this.actor.update({ "system.itemscript": exported });
  }

  async _onImportVsDData(event) {
    event.preventDefault();

    // delete unecessary items from the PC Template
    // they are listed in the vsd object in config.js
    const deletions = [];
    for (const trait of this.document.itemTypes.Trait) {
      deletions.push(trait.id);
    }
    for (const extra of system.npcremove) {
      const id = this.actor.dynamic[extra]?._id;
      if (id) {
        deletions.push(id);
      } else {
        console.debug("Did not find item - ", extra);
      }
    }
    for (const extra of system.npcremovemods) {
      const id = this.actor.system.mods[extra]?._id;
      if (id) {
        deletions.push(id);
      } else {
        console.debug("Did not find item - ", extra);
      }
    }
    const deleted = await this.actor.deleteEmbeddedDocuments("Item", deletions);

    // start creating the NPC Mods item data
    let nextEntry = 0;
    const item = {
      name: "NPC Mods",
      type: "Modifier",
      system: {
        notes:
          "The modifiers from the data in the stat block for this creature.",
        chartype: "CharacterVsD",
        inEffect: true,
        alwaysOn: true,
        attack: false,
        defence: false,
        skill: false,
        spell: false,
        check: false,
        reaction: false,
        damage: false,
        primary: false,
        entries: {
          0: {
            value: 0,
            formula: "",
            category: "",
            targets: "",
          },
        },
      },
    };

    const scriptdata = this.actor.system.itemscript
      .split(/\r?\n/)
      .map((word) => word.trim());

    const biography = this.actor.system.itemscript;

    for (const entry of scriptdata) {
      const line = entry.split(":");
      switch (line[0].trim()) {
        case "Type": {
          await this.actor.update({
            ["token.name"]: line[1].trim(),
            ["token.actorLink"]: false,
            ["token.disposition"]: -1,
            ["token.displayName"]: 10,
          });
          break;
        }
        case "Name": {
          await this.actor.update({
            name: line[1].trim(),
          });
          break;
        }
        case "Level": {
          const temp = parseInt(line[1]);
          const data = {
            name: `Ranks: Level ${temp}`,
            type: "Variable",
            system: {
              notes: entry.trim(),
              chartype: "CharacterVsD",
              value: temp,
              formula: `${temp}`,
              label: "Level",
              entries: {
                0: {
                  value: 0,
                  formula: "",
                  label: "",
                },
                1: {
                  value: temp,
                  formula: `${temp}`,
                  label: "Level",
                },
              },
            },
          };
          await this.actor.createEmbeddedDocuments("Item", [data]);
          break;
        }
        case "ArmourType": {
          // Variable
          const temp = line[1].trim();
          let form = "";
          let atype = "";
          switch (temp[0]) {
            case "N":
              form = "NA";
              atype = "No Armor";
              break;
            case "L":
              form = "LA";
              atype = "Light Armor";
              break;
            case "M":
              form = "MA";
              atype = "Medium Armor";
              break;
            case "H":
              form = "HA";
              atype = "Heavy Armor";
              break;
          }
          atype += temp.length == 3 ? " with Shield" : "";
          const data = {
            name: "Armor Type",
            type: "Variable",
            system: {
              chartype: "CharacterVsD",
              value: 0,
              formula: form,
              label: atype,
              notes: entry.trim(),
              entries: {
                0: {
                  value: 0,
                  formula: "",
                  label: "",
                },
                1: {
                  value: 0,
                  formula: form,
                  label: atype,
                },
              },
            },
          };
          await this.actor.createEmbeddedDocuments("Item", [data]);
          break;
        }
        case "Defence": {
          // reaction
          const strvalue = line[1].trim();
          item.system.entries[nextEntry++] = {
            value: Number(strvalue),
            formula: strvalue,
            category: "reaction",
            targets: "Mel, Mis",
          };
          item.system.reaction = true;
          break;
        }
        case "Toughness": {
          // defence
          const strvalue =
            Number(line[1].trim()) - this.actor.dynamic.level.value;
          item.system.entries[nextEntry++] = {
            value: strvalue,
            formula: `${strvalue}`,
            category: "defence",
            targets: "Tough",
          };
          item.system.defence = true;
          break;
        }
        case "Willpower": {
          // defence
          const strvalue =
            Number(line[1].trim()) - this.actor.dynamic.level.value;
          item.system.entries[nextEntry++] = {
            value: strvalue,
            formula: `${strvalue}`,
            category: "defence",
            targets: "Will",
          };
          item.system.defence = true;
          break;
        }
        case "HitPoints": {
          // Pool
          const temp = Number(line[1]);
          const data = {
            name: "Hit Points",
            type: "Pool",
            system: {
              notes: entry.trim(),
              chartype: "CharacterVsD",
              abbr: "HP",
              name: "Hit Points",
              state: "[H]",
              min: 0,
              value: temp,
              max: temp,
            },
          };
          await this.actor.createEmbeddedDocuments("Item", [data]);
          break;
        }
        case "Attack": {
          // Melee-Attack / Ranged-Attack
          const result = line[1].split("###").map((word) => word.trim());
          const formula = result[0];
          if (formula == "0") break;
          let name = "",
            attacktype = "",
            attacksize = "";
          if (result[2]) {
            //there is a name/type in [2] and an attack size in [1]
            name = result[2];
            attacktype = result[2].split(" ")[0].trim();
            attacksize = result[1];
            switch (attacksize) {
              case "Ranged":
              case "Weapon": {
                attacktype = attacksize;
              }
            }
          } else {
            // there is a name/type in [1]
            name = result[1];
            attacktype = result[1].split(" ")[0].trim();
            attacksize = "Medium";
          }

          const data = {},
            attacktable = "",
            crittable = "",
            secondcrit = "",
            maxresult = 0;
          // determine attack and critical tables
          switch (attacktype) {
            case "Beak":
            case "Pincer": {
              attacktable = `${game.i18n.localize(`local.tables.beasta`)}`;
              crittable = `${game.i18n.localize(`local.tables.cut`)}`;
              secondcrit = `${game.i18n.localize(`local.tables.pierce`)}`;
              break;
            }
            case "Bite": {
              attacktable = `${game.i18n.localize(`local.tables.beasta`)}`;
              crittable = `${game.i18n.localize(`local.tables.cut`)}`;
              secondcrit = `${game.i18n.localize(`local.tables.impact`)}`;
              break;
            }
            case "Claw":
            case "Talon": {
              attacktable = `${game.i18n.localize(`local.tables.beasta`)}`;
              crittable = `${game.i18n.localize(`local.tables.cut`)}`;
              secondcrit = `${game.i18n.localize(`local.tables.pierce`)}`;
              break;
            }
            case "Horn":
            case "Tusk":
            case "Spike":
            case "Stinger": {
              attacktable = `${game.i18n.localize(`local.tables.beasta`)}`;
              crittable = `${game.i18n.localize(`local.tables.pierce`)}`;
              secondcrit = `${game.i18n.localize(`local.tables.none`)}`;
              break;
            }
            case "Grapple":
            case "Envelop":
            case "Swallow": {
              attacktable = `${game.i18n.localize(`local.tables.unarmed`)}`;
              crittable = `${game.i18n.localize(`local.tables.grapple`)}`;
              secondcrit = `${game.i18n.localize(`local.tables.none`)}`;
              break;
            }
            case "Bash":
            case "Ram":
            case "Unarmed": {
              attacktable = `${game.i18n.localize(`local.tables.unarmed`)}`;
              crittable = `${game.i18n.localize(`local.tables.impact`)}`;
              secondcrit = `${game.i18n.localize(`local.tables.none`)}`;
              break;
            }
            case "Stomp":
            case "Trample": {
              attacktable = `${game.i18n.localize(`local.tables.unarmed`)}`;
              crittable = `${game.i18n.localize(`local.tables.impact`)}`;
              secondcrit = `${game.i18n.localize(`local.tables.impact`)}`;
              break;
            }
            case "Ranged": {
              attacktable = `${game.i18n.localize(`local.tables.missile`)}`;
              crittable = `${game.i18n.localize(`local.tables.pierce`)}`;
              secondcrit = `${game.i18n.localize(`local.tables.none`)}`;
              break;
            }
            default: {
              // including Weapon
              attacktable = `${game.i18n.localize(`local.tables.edged`)}`;
              crittable = `${game.i18n.localize(`local.tables.cut`)}`;
              secondcrit = `${game.i18n.localize(`local.tables.none`)}`;
            }
          }
          // determine max result
          switch (attacksize) {
            case "Small": {
              switch (attacktype) {
                case "Bite":
                case "Claw":
                case "Talon":
                case "Bash":
                case "Ram":
                case "Unarmed": {
                  maxresult = 90;
                  break;
                }
                default: {
                  maxresult = 80;
                }
              }
              break;
            }
            case "Medium": {
              switch (attacktype) {
                case "Beak":
                case "Pincer":
                case "Grapple":
                case "Envelop":
                case "Swallow": {
                  maxresult = 110;
                  break;
                }
                default: {
                  maxresult = 120;
                }
              }
              break;
            }
            case "Large": {
              switch (name) {
                case "Beak":
                case "Pincer":
                case "Grapple":
                case "Envelop":
                case "Swallow": {
                  maxresult = 130;
                  break;
                }
                default: {
                  maxresult = 140;
                }
              }
              break;
            }
            case "Colossal": {
              maxresult = 175;
              break;
            }
            default: {
              // including Huge
              maxresult = 150;
            }
          }
          switch (attacktype) {
            case "Ranged": {
              data = {
                name: name,
                type: "Ranged-Attack",
                system: {
                  notes: `${entry
                    .replace(/ ###/g, "")
                    .trim()} - Secondary Crit: ${secondcrit}`,
                  chartype: "CharacterVsD",
                  formula: "0",
                  damage: attacktable,
                  damageType: crittable,
                  armourDiv: 4,
                  minST: "oe",
                  accuracy: maxresult,
                  range: "30",
                  rof: 5,
                  bulk: 0,
                },
              };
              item.system.entries[nextEntry++] = {
                value: Number(formula),
                formula: formula,
                category: "attack",
                targets: "Ranged",
              };
              item.system.attack = true;
              break;
            }
            default: {
              // all others are Melee-Attacks
              data = {
                name: name,
                type: "Melee-Attack",
                system: {
                  notes: `${entry
                    .replace(/ ###/g, "")
                    .trim()} - Secondary Crit: ${secondcrit}`,
                  chartype: "CharacterVsD",
                  formula: "0",
                  damage: attacktable,
                  damageType: crittable,
                  armourDiv: 2, // clumsy range
                  minST: "oe", // roll type
                  weight: maxresult, // max result
                  reach: 5, // oerange
                },
              };
              item.system.entries[nextEntry++] = {
                value: Number(formula),
                formula: formula,
                category: "attack",
                targets: name,
              };
              item.system.attack = true;
            }
          }
          const critdata = {
            name: `Critical (${attacktype} - Pri)`,
            type: "Defence",
            system: {
              category: "dodge",
              chartype: "CharacterVsD",
              formula: "0",
              notes: crittable,
              value: 0,
            },
          };
          await this.actor.createEmbeddedDocuments("Item", [critdata]);
          if (secondcrit != `${game.i18n.localize(`local.tables.none`)}`) {
            critdata = {
              name: `Critical (${attacktype} - Sec)`,
              type: "Defence",
              system: {
                category: "dodge",
                chartype: "CharacterVsD",
                formula: "0",
                notes: secondcrit,
                value: 0,
              },
            };
            await this.actor.createEmbeddedDocuments("Item", [critdata]);
          }
          await this.actor.createEmbeddedDocuments("Item", [data]);
          break;
        }
        case "CreatureType": {
          // maybe just a note but crit mods
          const temp = line[1].trim();
          let scale = "";
          switch (temp[0]) {
            case "N":
              scale = "Normal";
              break;
            case "H":
              scale = "Heroic";
              break;
            case "E":
              scale = "Epic";
              break;
          }
          const data = {
            name: "Creature Type",
            type: "Rollable",
            system: {
              notes: `${scale} ${temp[1] == "H" ? " Humanoid" : " Beast"}`,
              chartype: "CharacterVsD",
              formula: 0,
              category: "check",
            },
          };
          await this.actor.createEmbeddedDocuments("Item", [data]);
          break;
        }
        case "Roguery": {
          const strvalue = line[1].trim();
          item.system.entries[nextEntry++] = {
            value: Number(strvalue),
            formula: strvalue,
            category: "skill",
            targets: "Acr, Ste, Loc, Per, Dec",
          };
          item.system.skill = true;
          break;
        }
        case "Adventuring": {
          const strvalue = line[1].trim();
          item.system.entries[nextEntry++] = {
            value: Number(strvalue),
            formula: strvalue,
            category: "skill",
            targets: "Ath, Rid, Pil, Hun, Nat, Wan",
          };
          item.system.skill = true;
          break;
        }
        case "Lore": {
          const strvalue = line[1].trim();
          item.system.entries[nextEntry++] = {
            value: Number(strvalue),
            formula: strvalue,
            category: "skill",
            targets: "Arc, Cha, Cul, Hea, Son",
          };
          item.system.skill = true;
          break;
        }
        case "MoveRate": {
          // Variable
          let moves = [];
          if (line[1].includes(" or ")) {
            moves = line[1].split(" or ");
          } else {
            moves = line[1].split("/");
          }
          const nummoves = moves.length;
          let land = 0,
            air = 0,
            sea = 0;
          for (let i = 0; i < nummoves; i++) {
            const term = moves[i];
            switch (term[term.length - 1]) {
              case "L":
                land = parseInt(term);
                break;
              case "F":
                air = parseInt(term);
                break;
              case "S":
                sea = parseInt(term);
                break;
            }
          }
          const data = {
            name: "Move Mode",
            type: "Variable",
            system: {
              notes: entry.trim(),
              chartype: "CharacterVsD",
              value: land,
              formula: `${land}`,
              label: "Land Movement",
              entries: {
                0: {
                  value: null,
                  formula: "",
                  label: "",
                },
                1: {
                  value: land,
                  formula: `${land}`,
                  label: "Land Movement",
                },
                2: {
                  value: air,
                  formula: `${air}`,
                  label: "Flying Movement",
                },
                3: {
                  value: sea,
                  formula: `${sea}`,
                  label: "Swimming Movement",
                },
              },
            },
          };
          await this.actor.createEmbeddedDocuments("Item", [data]);
          break;
        }
      }
    }
    await this.actor.createEmbeddedDocuments("Item", [item]);
    await this.actor.update({ "system.biography": biography });
    await this.actor.update({ "system.itemscript": "" });
    ui.notifications.info("Stat block import complete");
  }

  async _createItems(scriptdata) {
    // preserve newlines, etc - use valid JSON
    scriptdata = scriptdata
      .replace(/\\n/g, "\\n")
      .replace(/\\'/g, "\\'")
      .replace(/\\"/g, '\\"')
      .replace(/\\&/g, "\\&")
      .replace(/\\r/g, "\\r")
      .replace(/\\t/g, "\\t")
      .replace(/\\b/g, "\\b")
      .replace(/\\f/g, "\\f");
    // remove non-printable and other non-valid JSON chars
    scriptdata = scriptdata.replace(/[\u0000-\u0019]+/g, "");
    // swap the chartype with this actors chartype
    const type = this.actor.type;
    scriptdata = scriptdata.replace(/Character\w+/g, type);
    await this.actor.createEmbeddedDocuments("Item", JSON.parse(scriptdata));
    await this.actor.update({ "system.itemscript": "" });
    ui.notifications.info("Creation of multiple items completed!");
  }

  async _createItem(dataset) {
    const source = {
      name: dataset.type,
      type: dataset.type,
      system: {
        chartype: this.actor.type,
      },
    };
    if (dataset.category) source.system.category = dataset.category;
    if (dataset.type == "Modifier") {
      source.system.attack = dataset.mod1 == "attack" || dataset.mod2 == "attack";
      source.system.defence =
        dataset.mod1 == "defence" || dataset.mod2 == "defence";
      source.system.skill = dataset.mod1 == "skill" || dataset.mod2 == "skill";
      source.system.spell = dataset.mod1 == "spell" || dataset.mod2 == "spell";
      source.system.check = dataset.mod1 == "check" || dataset.mod2 == "check";
      source.system.reaction =
        dataset.mod1 == "reaction" || dataset.mod2 == "reaction";
      source.system.damage = dataset.mod1 == "damage" || dataset.mod2 == "damage";
      source.system.primary =
        dataset.mod1 == "primary" || dataset.mod2 == "primary";
    }
    return await this.actor.createEmbeddedDocuments("Item", [source], {
      renderSheet: true,
    });
  }

  async _onRoll(event) {
    event.preventDefault();
    const dataset = event.currentTarget.dataset;
    const token = game.canvas.tokens.controlled[0] || false;
    const actor = token ? token.actor._id == this.actor._id ? token.actor : this.actor : this.actor;

    const rolldata = {
      actor: actor,
      flavour: game.i18n.format(`local.phrases.${dataset.type}`, {
        name: dataset.name,
      }),
      unmodified: Number(dataset.threat) || 0,
      oerange: Number(dataset.oerange) || 5,
      attacktable: dataset.attacktable || "",
      journal: dataset.journal || "",
      crittable: dataset.crittable || "",
      sectable: dataset.sectable || "",
      maxresult: dataset.maxresult || "",
      type: dataset.type,
      modtype: dataset.modtype,
      roll: dataset.roll,
      name: dataset.name,
      id: dataset.itemId,
    };

    actor.roll(rolldata);
  }

  /**
   * Fetches the formatted modifiers for a roll.
   */
  fetchRelevantModifiers(actor, dataset) {
    const tempMods = [];
    const actormods = actor.items.filter((i) => i.type == "Modifier");
    const type = dataset.type == "modlist" ? dataset.modtype : dataset.type;

    // preload gmod
    tempMods.push({
      modifier: Number(actor.system.gmod.value) || 0,
      description: "global modifier",
    });

    // iterate through the modifiers in effect, picking the appropriate ones for the roll
    for (const mod of actormods) {
      const moddata = mod.system;

      if (moddata.inEffect) {
        for (const entry of moddata.entries) {
          // check to see if this entry applies to this type of roll
          switch (type) {
            case "check": // for Armor and Body
              if (entry.category != "reaction") continue;
              break;
            case "technique":
              if (entry.category != "skill") continue;
              break;
            case "rms":
              if (entry.category != "spell") continue;
              break;
            case "dodge":
            case "block":
            case "parry":
              if (entry.category != "defence") continue;
              break;
            default:
              if (entry.category != type) continue;
          }
          if (Number(entry.moddedformula) == 0) continue;

          // what is the target of this modifier?
          let hasRelevantTarget = entry.targets.trim();
          // does this modifier have a target matching the item being rolled?
          if (hasRelevantTarget != "") {
            hasRelevantTarget = false;
            // get the array of targets to which it applies
            const cases = entry.targets.split(",").map((word) => word.trim());
            for (const target of cases) {
              // test the target against the beginning of dataset.name for a match
              if (dataset.name.startsWith(target)) {
                hasRelevantTarget = true;
                continue;
              }
            }
          } else {
            // a general modifier
            hasRelevantTarget = true;
          }

          if (hasRelevantTarget) {
            const clean = entry.moddedformula?.replace(
              /\(([-+][\d]+)\)/g,
              "$1"
            );
            tempMods.push({
              modifier:
                clean == undefined
                  ? entry.value
                  : clean[0] == "+" || clean[0] == "-"
                    ? clean
                    : "+" + clean,
              description: moddata.tempName,
            });
          }
        }
      }
    }

    const prepareModList = (mods) =>
      mods
        .map((mod) => ({ ...mod, modifier: mod.modifier }))
        .filter((mod) => mod.modifier !== 0);

    return prepareModList(tempMods);
  }
}
