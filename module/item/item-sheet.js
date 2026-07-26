import { system } from "../config.js";

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ItemSheetV2 } = foundry.applications.sheets;

/**
 * Extend the basic ItemSheet with some very simple modifications
 * @extends {ItemSheetV2}
 */
export class BaseItemSheet extends HandlebarsApplicationMixin(ItemSheetV2) {

  static DEFAULT_OPTIONS = {
    classes: ["vsd", "sheet", "item"],
    tag: "form",
    position: { width: 450, height: 450 },
    form: { submitOnChange: true, closeOnSubmit: false },
    window: { resizable: true }
  };

  static PARTS = {
    body: {
      template: "systems/vsd/templates/item/rollable-sheet.hbs"
    }
  };

  /** @override */
  get title() {
    return `${this.document.name} [${this.document.type}]`;
  }

  /** @override */
  _configureRenderOptions(options) {
    super._configureRenderOptions(options);
    options.parts = {
      body: {
        template: `systems/vsd/templates/item/${this.document.type.toLowerCase()}-sheet.hbs`
      }
    };
  }

  /* -------------------------------------------- */

  /** @override */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const item = this.item;
    context.item = item;
    context.system = item.system;
    context.config = CONFIG.system;
    return context;
  }

  /** @override */
  async _onRender(context, options) {
    await super._onRender(context, options);
    const html = $(this.element);

    // Everything below here is only needed if the sheet is editable
    if (!this.isEditable) return;

    // Roll handlers, click handlers, etc. would go here.
    html.find('.entry-create').click(this._onEntryCreate.bind(this));
    html.find('.entry-delete').click(this._onEntryDelete.bind(this));
    html.find('.entry-clone').click(this._onEntryClone.bind(this));

    // Roll handlers, click handlers, etc. would go here.
    const handler = (ev) => this._onDragStart(ev);
    html.find(".draggable").each((i, li) => {
      li.setAttribute("draggable", true);
      li.addEventListener("dragstart", handler, true);
    });
  }

  /**
   * Handle the Entry Create click Event
   * @param {Event} event   The originating click event
   * @private
   */
  _onEntryCreate(event) {
    const itemdata = this.item.system;
    const entries = itemdata.entries;
    entries.push({ value: 0, formula: "", category: "", targets: "" });
    this.item.update({ 'system': itemdata });
  }

  /**
   * Handle the Entry Delete click Event
   * @param {Event} event   The originating click event
   * @private
   */
  _onEntryDelete(event) {
    const index = event.currentTarget.closest(".item").dataset.id;
    const itemdata = this.item.system;
    itemdata.entries.splice(index, 1);
    this.item.update({ 'system': itemdata });
  }

  /**
   * Handle the Entry Clone click Event
   * @param {Event} event   The originating click event
   * @private
   */
  _onEntryClone(event) {
    const index = event.currentTarget.closest(".item").dataset.id;
    const itemdata = this.item.system;
    const entries = itemdata.entries;
    entries.push(entries[index]);
    this.item.update({ 'system': itemdata });
  }
}

export class PoolItemSheet extends BaseItemSheet {

  /** @override */
  async _onRender(context, options) {
    await super._onRender(context, options);

    // Everything below here is only needed if the sheet is editable
    if (!this.isEditable) return;

    const html = $(this.element);
    // Roll handlers, click handlers, etc. would go here.
    html.find('.pool').change(this._onInputChange.bind(this));
  }

  /**
   * Handle the Item Input Change Event
   * @param {Event} event   The originating click event
   * @private
   */
  _onInputChange(event) { // only for pools as they must update tokens
    if (CONFIG.system.testMode) console.debug("entering _onInputChange()\n", event);

    if (this.actor) {
      const itemID = system.slugify(this.item.system.abbr);
      const target = event.currentTarget;
      // get the name of the changed element
      const dataname = target.name.split(".")[1];
      // get the new value
      const value = target.value;
      // is this the value attribute, isBar is true
      const isBar = (dataname == "value");

      // make the changes to tokens, actors and the item
      this.actor.modifyTokenAttribute(`tracked.${itemID}${isBar ? '' : `.${dataname}`}`, value, false, isBar);
    }
  }
}

export class ModifierItemSheet extends BaseItemSheet {

  static DEFAULT_OPTIONS = {
    classes: ["vsd", "sheet", "item", "modifier"],
    tag: "form",
    position: { width: 600, height: 400 },
    form: { submitOnChange: true, closeOnSubmit: false },
    window: { resizable: true }
  };

  /** @override */
  async _onRender(context, options) {
    await super._onRender(context, options);
    if (!this.isEditable) return;
    const html = $(this.element);
    html.find(".modentry").each((i, el) => {
      el.addEventListener("dragover", (ev) => ev.preventDefault());
      el.addEventListener("drop", this._onDrop.bind(this));
    });
  }

  async _onDragStart(event) {
    const dataset = event.currentTarget.dataset;

    // Create drag data
    let dragData = {
      itemId: dataset.itemId,
      index: dataset.index,
      type: "modentry",
      value: dataset.value,
      category: dataset.category,
      formula: dataset.formula,
      targets: dataset.targets
    }

    if (!dragData) return;

    // Set data transfer
    await event.dataTransfer.setData("text/plain", JSON.stringify(dragData));
  }

  async _onDrop(event) {
    // Try to extract the data
    let transferData;
    try {
      transferData = JSON.parse(event.dataTransfer.getData("text/plain"));
    } catch (err) {
      return false;
    }
    if (CONFIG.system.testMode) console.debug(`processing ${transferData.type}\n`, transferData);

    const targetindex = Number(event.currentTarget.dataset.id);
    const sourceindex = Number(transferData.index);
    const sourceItemId = transferData.itemId;
    let formula;
    let targets;
    let value;
    let category;
    switch (transferData.type) {
      case "varentry": {
        value = transferData.value;
        formula = transferData.formula;
        category = "attack";
        targets = transferData.label;
        break;
      }
      case "modentry": {
        value = transferData.value;
        formula = transferData.formula;
        category = transferData.category;
        targets = transferData.targets;
        break;
      }
    }
    const entry = {
      value: value,
      formula: formula,
      category: category,
      targets: targets
    };
    const itemdata = this.item.system;
    const entries = itemdata.entries;
    let newsource = sourceindex;

    if (this.item.id != sourceItemId) {
      // inserting an entry
      entries.push(entry);
      newsource = entries.length - 1;
    }
    // re-ordering entries
    if (newsource > targetindex) {
      // moving up
      for (let i = newsource - 1; i != targetindex; i--) {
        [entries[i], entries[newsource]] = [entries[newsource], entries[i]];
        newsource--;
      }
    } else {
      // moving down
      for (let i = newsource + 1; i != targetindex; i++) {
        [entries[i], entries[newsource]] = [entries[newsource], entries[i]];
        newsource++;
      }
    }

    let data = {
      chartype: itemdata.chartype,
      inEffect: itemdata.inEffect,
      notes: itemdata.notes,
      entries: entries
    }
    this.item.update({ 'system': data });
  }
}

export class VariableItemSheet extends BaseItemSheet {

  static DEFAULT_OPTIONS = {
    classes: ["vsd", "sheet", "item", "variable"],
    tag: "form",
    position: { width: 300, height: 400 },
    form: { submitOnChange: true, closeOnSubmit: false },
    window: { resizable: true }
  };

  /** @override */
  async _onRender(context, options) {
    await super._onRender(context, options);
    if (!this.isEditable) return;
    const html = $(this.element);
    html.find(".varentry").each((i, el) => {
      el.addEventListener("dragover", (ev) => ev.preventDefault());
      el.addEventListener("drop", this._onDrop.bind(this));
    });
  }

  async _onDragStart(event) {
    const dataset = event.currentTarget.dataset;

    // Create drag data
    let dragData = {
      itemId: dataset.itemId,
      index: dataset.index,
      type: "varentry",
      value: dataset.value,
      formula: dataset.formula,
      label: dataset.label
    }

    if (!dragData) return;

    // Set data transfer
    await event.dataTransfer.setData("text/plain", JSON.stringify(dragData));
  }

  async _onDrop(event) {
    // Try to extract the data
    let transferData;
    try {
      transferData = JSON.parse(event.dataTransfer.getData("text/plain"));
    } catch (err) {
      return false;
    }
    if (CONFIG.system.testMode) console.debug(`processing ${transferData.type}\n`, transferData);

    const targetindex = Number(event.currentTarget.dataset.id);
    const sourceindex = Number(transferData.index);
    const sourceItemId = transferData.itemId;
    let formula;
    let label;
    let value;
    switch (transferData.type) {
      case "varentry": {
        value = transferData.value;
        formula = transferData.formula;
        label = transferData.label;
        break;
      }
      case "modentry": {
        value = transferData.value;
        formula = transferData.formula;
        label = transferData.targets;
        break;
      }
    }
    const entry = {
      value: value,
      formula: formula,
      label: label
    };
    const itemdata = this.item.system;
    const entries = itemdata.entries;
    let newsource = sourceindex;

    if (this.item.id != sourceItemId) {
      // inserting an entry
      entries.push(entry);
      newsource = entries.length - 1;
    }
    // re-ordering entries
    if (newsource > targetindex) {
      // moving up
      for (let i = newsource - 1; i != targetindex; i--) {
        [entries[i], entries[newsource]] = [entries[newsource], entries[i]];
        newsource--;
      }
    } else {
      // moving down
      for (let i = newsource + 1; i != targetindex; i++) {
        [entries[i], entries[newsource]] = [entries[newsource], entries[i]];
        newsource++;
      }
    }

    let data = {
      chartype: itemdata.chartype,
      notes: itemdata.notes,
      entries: entries
    }
    this.item.update({ 'system': data });
  }
}

export class ContainerItemSheet extends BaseItemSheet {

  static DEFAULT_OPTIONS = {
    classes: ["vsd", "sheet", "item", "container"],
    tag: "form",
    position: { width: 600, height: 400 },
    form: { submitOnChange: true, closeOnSubmit: false },
    window: { resizable: true }
  };

  /** @override */
  async _onRender(context, options) {
    await super._onRender(context, options);

    // Everything below here is only needed if the sheet is editable
    if (!this.isEditable) return;

    const html = $(this.element);
    // Roll handlers, click handlers, etc. would go here.
    html.find('.deployItems').click(this._deployItems.bind(this));
    html.find('.removeItems').click(this._removeItems.bind(this));
    html.find(".containerentry").each((i, el) => {
      el.addEventListener("dragover", (ev) => ev.preventDefault());
      el.addEventListener("drop", this._onDrop.bind(this));
    });
  }

  /**
   * Convert this trait to a Modifier
   * @param {Event} event   The originating click event
   * @private
   */
  async _deployItems(event) {
    event.preventDefault();
    if (this.actor) {
      // unpack the container
      const created = await this.actor.createEmbeddedDocuments("Item", this.item.system.entries);
      const dropped = [];
      for (let item of created) {
        dropped.push(item.id);
      }
      this.item.update({ 'system.dropped': dropped });
    }
  }

  /**
   * Convert this trait to a Modifier
   * @param {Event} event   The originating click event
   * @private
   */
  _removeItems(event) {
    event.preventDefault();
    if (this.actor) {
      const items = [];
      if (this.item.system.dropped) {
        for (let dropped of this.item.system.dropped) {
          if (this.actor.items.get(dropped))
            items.push(dropped);
        }
      }
      this.actor.deleteEmbeddedDocuments("Item", items);
    }
  }

  async _onDragStart(event) {
    const dataset = event.currentTarget.dataset;

    const item = this.item.system.entries[dataset.id];
    const dragData = { type: "Item", item: this.item.id, data: item };
    if (!dragData) return;

    // Set data transfer
    await event.dataTransfer.setData("text/plain", JSON.stringify(dragData));
  }

  async _onDrop(event) {
    // Try to extract the data
    let transferData;
    try {
      transferData = JSON.parse(event.dataTransfer.getData("text/plain"));
      if (transferData.item == this.item.id) return false;
    } catch (err) {
      return false;
    }
    if (CONFIG.system.testMode) console.debug(`processing ${transferData.type}\n`, transferData);
    const item = await Item.implementation.fromDropData(transferData);
    const itemdata = item.toObject();
    this.item.system.entries.push(itemdata);
    this.item.update({ 'system': this.item.system });
  }
}
