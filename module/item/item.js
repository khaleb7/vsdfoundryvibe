/**
 * Extend the basic Item with some very simple modifications.
 * @extends {Item}
 */
export class BaseItem extends Item {
  /**
   * Augment the basic Item data model with additional dynamic data.
   */
  prepareDerivedData() {
    const itemdata = this.system;
    switch (this.type) {
      case "Variable": {
        if (!Array.isArray(itemdata.entries)) {
          itemdata.entries = Object.values(itemdata.entries);
        }
        const entries = itemdata.entries;
        let notfound = true;
        for (const entry of entries) {
          if (Number.isNumeric(entry.formula)) {
            entry.value = Number(entry.formula);
          } else {
            entry.value = 0;
          }
          if (entry.label != itemdata.label && itemdata.label != "") continue;
          notfound = false;
          itemdata.moddedformula = itemdata.formula = entry.formula;
          itemdata.value = itemdata.moddedvalue = entry.value;
        }
        if (notfound && entries.length > 0) {
          itemdata.formula = entries[0].formula;
          itemdata.label = entries[0].label;
        }
        break;
      }
      case "Modifier": {
        if (itemdata.alwaysOn) itemdata.inEffect = true;
        itemdata.attack = false;
        itemdata.damage = false;
        itemdata.defence = false;
        itemdata.reaction = false;
        itemdata.skill = false;
        itemdata.spell = false;
        itemdata.check = false;
        itemdata.primary = false;
        if (!Array.isArray(itemdata.entries)) {
          itemdata.entries = Object.values(itemdata.entries);
        }
        const entries = itemdata.entries;
        for (let i = 0; i < entries.length; i++) {
          switch (entries[i].category) {
            case "attack": itemdata.attack = true; break;
            case "damage": itemdata.damage = true; break;
            case "defence": itemdata.defence = true; break;
            case "reaction": itemdata.reaction = true; break;
            case "skill": itemdata.skill = true; break;
            case "spell": itemdata.spell = true; break;
            case "check": itemdata.check = true; break;
            case "primary": itemdata.primary = true; break;
          }
          if (Number.isNumeric(entries[i].formula)) {
            // the formula is a number
            entries[i].value = entries[i].moddedvalue = Number(entries[i].formula);
          } else if (entries[i].formula.includes("@")) {
            // the formula has a reference and will be processed in prepareDerivedData
          } else {
            // the formula should be a valid dice expression so has no value
            entries[i].value = 0;
            entries[i].moddedvalue = 0;
            entries[i].moddedformula = entries[i].formula;
          }
        }
        break;
      }
      case "Melee-Attack":
      case "Ranged-Attack":
      case "Defence":
      case "Rollable": {
        if (Number.isNumeric(itemdata.formula)) {
          // the formula is a number
          itemdata.value = itemdata.moddedvalue = Number(itemdata.formula);
        } else if (itemdata.formula.includes("#") || itemdata.formula.includes("@")) {
          // the formula has ranks or a reference and will be processed in prepareDerivedData
        } else {
          // the formula should be a valid dice expression so has no value
          itemdata.value = 0;
          itemdata.moddedvalue = 0;
          itemdata.moddedformula = itemdata.formula;
        }
        break;
      }
      case "Primary-Attribute": {
        itemdata.value = itemdata.moddedvalue = Number(itemdata.attr);
        break;
      }
      case "Pool": {
        if (Number.isNumeric(itemdata.maxForm)) {
          // the formula is a number
          itemdata.max = Number(itemdata.maxForm);
          itemdata.hasmax = true;
        } else if (itemdata.maxForm.includes("@")) {
          // the formula has a reference and will be processed in prepareDerivedData
          itemdata.hasmax = false;
        } else {
          // the formula should be a valid dice expression so has no value
          itemdata.max = 0;
          itemdata.hasmax = true;
        }
        if (Number.isNumeric(itemdata.minForm)) {
          // the formula is a number
          itemdata.min = Number(itemdata.minForm);
          itemdata.hasmin = true;
        } else if (itemdata.minForm.includes("@")) {
          // the formula has a reference and will be processed in prepareDerivedData
          itemdata.hasmin = false;
        } else {
          // the formula should be a valid dice expression so has no value
          itemdata.min = 0;
          itemdata.hasmin = true;
        }
        if (itemdata.hasmax && itemdata.value > itemdata.max) itemdata.value = itemdata.max;
        if (itemdata.hasmin && itemdata.value < itemdata.min) itemdata.value = itemdata.min;
        itemdata.moddedvalue = itemdata.value;
        itemdata.ratio = Math.trunc(itemdata.value / itemdata.max * 100);
        break;
      }
      default: {
        // do nothing yet
      }
    }
  }
  /**
   * Set the label of a variable so it will calculate the desired value.
   */
  async setValue(targetlabel) {
    const itemdata = this.system;
    switch (this.type) {
      case "Variable": {
        const entries = itemdata.entries;
        for (let i = 0; i < entries.length; i++) {
          if (targetlabel == entries[i].label.split(":")[0]) {
            await this.actor.updateEmbeddedDocuments("Item", [{ _id: this._id, system: { label: entries[i].label } }]);
            break;
          }
        }
        break;
      }
      default: {
        // do nothing yet
      }
    }
  }
}
