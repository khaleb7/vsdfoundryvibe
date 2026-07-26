const { ArrayField, BooleanField, HTMLField, NumberField, ObjectField, SchemaField, StringField } = foundry.data.fields;

/** Converted from template.json for Foundry V13/V14 TypeDataModels. */

export class CharacterVsDDataModel extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      posture: new SchemaField({
        value: new StringField({ required: true, blank: true, initial: "Standing" })
      }),
      gmod: new SchemaField({
        value: new NumberField({ required: true, integer: true, initial: 0 })
      }),
      bs: new SchemaField({
        value: new NumberField({ required: true, integer: true, initial: 0 })
      }),
      languages: new StringField({ required: true, blank: true, initial: "" }),
      bm: new SchemaField({
        step: new NumberField({ required: true, integer: true, initial: 0 }),
        quarter: new NumberField({ required: true, integer: true, initial: 0 }),
        half: new NumberField({ required: true, integer: true, initial: 0 }),
        move: new NumberField({ required: true, integer: true, initial: 0 }),
        sprint: new NumberField({ required: true, integer: true, initial: 0 })
      }),
      defence: new SchemaField({
        armourType: new StringField({ required: true, blank: true, initial: "NA" }),
        shieldposition: new StringField({ required: true, blank: true, initial: "none" }),
        missileDB: new NumberField({ required: true, integer: true, initial: 0 }),
        meleeDB: new NumberField({ required: true, integer: true, initial: 0 })
      }),
      allitems: new SchemaField({
        Container: new BooleanField({ initial: false }),
        Rollable: new BooleanField({ initial: false }),
        Trait: new BooleanField({ initial: false }),
        "Melee-Attack": new BooleanField({ initial: false }),
        "Ranged-Attack": new BooleanField({ initial: false }),
        Defence: new BooleanField({ initial: false }),
        Pool: new BooleanField({ initial: false }),
        Modifier: new BooleanField({ initial: false }),
        Variable: new BooleanField({ initial: false }),
        "Primary-Attribute": new BooleanField({ initial: false }),
        "Hit-Location": new BooleanField({ initial: false }),
        Equipment: new BooleanField({ initial: false })
      }),
      sections: new SchemaField({
        defences: new StringField({ required: true, blank: true, initial: "block" }),
        attacks: new StringField({ required: true, blank: true, initial: "block" }),
        specialrolls: new StringField({ required: true, blank: true, initial: "block" }),
        header: new StringField({ required: true, blank: true, initial: "block" }),
        hitlocations: new StringField({ required: true, blank: true, initial: "block" }),
        skills: new StringField({ required: true, blank: true, initial: "block" }),
        spells: new StringField({ required: true, blank: true, initial: "block" }),
        savesdefences: new StringField({ required: true, blank: true, initial: "block" }),
        traits: new StringField({ required: true, blank: true, initial: "block" }),
        melee: new StringField({ required: true, blank: true, initial: "block" }),
        pools: new StringField({ required: true, blank: true, initial: "block" }),
        modifiers: new StringField({ required: true, blank: true, initial: "block" }),
        variables: new StringField({ required: true, blank: true, initial: "block" }),
        containers: new StringField({ required: true, blank: true, initial: "block" }),
        disadvantages: new StringField({ required: true, blank: true, initial: "block" }),
        stats: new StringField({ required: true, blank: true, initial: "block" }),
        notes: new StringField({ required: true, blank: true, initial: "block" }),
        spelllores: new StringField({ required: true, blank: true, initial: "block" })
      }),
      adminMode: new BooleanField({ initial: true }),
      biography: new HTMLField({ required: true, blank: true, initial: "" }),
      notes: new HTMLField({ required: true, blank: true, initial: "" }),
      // Runtime bags rebuilt in prepareBaseData / prepareDerivedData
      dynamic: new ObjectField({ initial: () => ({}) }),
      tracked: new ObjectField({ initial: () => ({}) }),
      modifiers: new ObjectField({ initial: () => ({}) }),
      sheetData: new ObjectField({ initial: () => ({}) }),
      itemscript: new StringField({ required: true, blank: true, initial: "" }),
      useFAHR: new BooleanField({ initial: false }),
      rankMode: new StringField({ required: true, blank: true, initial: "" }),
    };
  }
}

export class EquipmentDataModel extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      notes: new StringField({ required: true, blank: true, initial: "" }),
      chartype: new StringField({ required: true, blank: true, initial: "" }),
      group: new StringField({ required: true, blank: true, initial: "" }),
      quantity: new NumberField({ required: true, integer: true, initial: 1 }),
      cost: new StringField({ required: true, blank: true, initial: "" }),
      weight: new NumberField({ required: true, integer: true, initial: 0 }),
      availability: new StringField({ required: true, blank: true, initial: "" }),
      description: new StringField({ required: true, blank: true, initial: "" }),
    };
  }
}

export class HitLocationDataModel extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      notes: new StringField({ required: true, blank: true, initial: "" }),
      chartype: new StringField({ required: true, blank: true, initial: "" }),
      group: new StringField({ required: true, blank: true, initial: "" }),
      damageResistance: new NumberField({ required: true, integer: true, initial: 0 }),
      damage: new NumberField({ required: true, integer: true, initial: 0 }),
      injuryType: new StringField({ required: true, blank: true, initial: "" }),
      toCripple: new StringField({ required: true, blank: true, initial: "" }),
      crippled: new BooleanField({ initial: false }),
      toHitRoll18: new StringField({ required: true, blank: true, initial: "" }),
      toHitRoll6: new StringField({ required: true, blank: true, initial: "" }),
      toHitPenalty: new NumberField({ required: true, integer: true, initial: 0 }),
    };
  }
}

export class MeleeAttackDataModel extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      notes: new StringField({ required: true, blank: true, initial: "" }),
      chartype: new StringField({ required: true, blank: true, initial: "" }),
      group: new StringField({ required: true, blank: true, initial: "" }),
      weight: new NumberField({ required: true, integer: true, initial: 100 }),
      damage: new StringField({ required: true, blank: true, initial: "Edged" }),
      damageType: new StringField({ required: true, blank: true, initial: "Cut" }),
      secondary: new StringField({ required: true, blank: true, initial: "none" }),
      armourDiv: new NumberField({ required: true, integer: true, initial: 1 }),
      minST: new StringField({ required: true, blank: true, initial: "oe" }),
      reach: new NumberField({ required: true, integer: true, initial: 5 }),
      value: new NumberField({ required: true, integer: true, initial: 0 }),
      formula: new StringField({ required: true, blank: true, initial: "" }),
    };
  }
}

export class RangedAttackDataModel extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      notes: new StringField({ required: true, blank: true, initial: "" }),
      chartype: new StringField({ required: true, blank: true, initial: "" }),
      group: new StringField({ required: true, blank: true, initial: "" }),
      damage: new StringField({ required: true, blank: true, initial: "Missile" }),
      damageType: new StringField({ required: true, blank: true, initial: "Pierce" }),
      secondary: new StringField({ required: true, blank: true, initial: "none" }),
      armourDiv: new NumberField({ required: true, integer: true, initial: 1 }),
      minST: new StringField({ required: true, blank: true, initial: "oe" }),
      accuracy: new NumberField({ required: true, integer: true, initial: 100 }),
      range: new StringField({ required: true, blank: true, initial: "10/15" }),
      rof: new NumberField({ required: true, integer: true, initial: 5 }),
      shots: new StringField({ required: true, blank: true, initial: "" }),
      bulk: new NumberField({ required: true, integer: true, initial: 0 }),
      recoil: new StringField({ required: true, blank: true, initial: "" }),
      value: new NumberField({ required: true, integer: true, initial: 0 }),
      formula: new StringField({ required: true, blank: true, initial: "" }),
    };
  }
}

export class RollableDataModel extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      notes: new StringField({ required: true, blank: true, initial: "" }),
      chartype: new StringField({ required: true, blank: true, initial: "" }),
      group: new StringField({ required: true, blank: true, initial: "" }),
      value: new NumberField({ required: true, integer: true, initial: 0 }),
      formula: new StringField({ required: true, blank: true, initial: "" }),
      category: new StringField({ required: true, blank: true, initial: "" }),
    };
  }
}

export class TraitDataModel extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      notes: new StringField({ required: true, blank: true, initial: "" }),
      chartype: new StringField({ required: true, blank: true, initial: "" }),
      group: new StringField({ required: true, blank: true, initial: "" }),
      applied: new BooleanField({ initial: false }),
      category: new StringField({ required: true, blank: true, initial: "" }),
    };
  }
}

export class PrimaryAttributeDataModel extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      notes: new StringField({ required: true, blank: true, initial: "" }),
      chartype: new StringField({ required: true, blank: true, initial: "" }),
      group: new StringField({ required: true, blank: true, initial: "" }),
      abbr: new StringField({ required: true, blank: true, initial: "" }),
      attr: new NumberField({ required: true, integer: true, initial: 0 }),
      value: new NumberField({ required: true, integer: true, initial: 0 }),
    };
  }
}

export class ModifierDataModel extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      notes: new StringField({ required: true, blank: true, initial: "" }),
      chartype: new StringField({ required: true, blank: true, initial: "" }),
      group: new StringField({ required: true, blank: true, initial: "" }),
      inEffect: new BooleanField({ initial: false }),
      alwaysOn: new BooleanField({ initial: false }),
      attack: new BooleanField({ initial: false }),
      defence: new BooleanField({ initial: false }),
      skill: new BooleanField({ initial: false }),
      spell: new BooleanField({ initial: false }),
      check: new BooleanField({ initial: false }),
      reaction: new BooleanField({ initial: false }),
      damage: new BooleanField({ initial: false }),
      primary: new BooleanField({ initial: false }),
      entries: new ArrayField(new SchemaField({
        value: new NumberField({ required: true, integer: true, initial: 0 }),
        formula: new StringField({ required: true, blank: true, initial: "" }),
        category: new StringField({ required: true, blank: true, initial: "" }),
        targets: new StringField({ required: true, blank: true, initial: "" })
      })),
      temporary: new BooleanField({ initial: false }),
      once: new BooleanField({ initial: false }),
      condition: new BooleanField({ initial: false }),
    };
  }
}

export class VariableDataModel extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      notes: new StringField({ required: true, blank: true, initial: "" }),
      chartype: new StringField({ required: true, blank: true, initial: "" }),
      group: new StringField({ required: true, blank: true, initial: "" }),
      value: new NumberField({ required: true, integer: true, initial: 0 }),
      formula: new StringField({ required: true, blank: true, initial: "" }),
      label: new StringField({ required: true, blank: true, initial: "" }),
      entries: new ArrayField(new SchemaField({
        value: new NumberField({ required: true, integer: true, initial: 0 }),
        formula: new StringField({ required: true, blank: true, initial: "" }),
        label: new StringField({ required: true, blank: true, initial: "" })
      })),
      temporary: new BooleanField({ initial: false }),
      once: new BooleanField({ initial: false }),
    };
  }
}

export class PoolDataModel extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      notes: new StringField({ required: true, blank: true, initial: "" }),
      chartype: new StringField({ required: true, blank: true, initial: "" }),
      group: new StringField({ required: true, blank: true, initial: "" }),
      abbr: new StringField({ required: true, blank: true, initial: "" }),
      name: new StringField({ required: true, blank: true, initial: "" }),
      state: new StringField({ required: true, blank: true, initial: "" }),
      minForm: new StringField({ required: true, blank: true, initial: "0" }),
      min: new NumberField({ required: true, integer: true, initial: 0 }),
      value: new NumberField({ required: true, integer: true, initial: 0 }),
      maxForm: new StringField({ required: true, blank: true, initial: "0" }),
      max: new NumberField({ required: true, integer: true, initial: 0 }),
    };
  }
}

export class DefenceDataModel extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      notes: new StringField({ required: true, blank: true, initial: "" }),
      chartype: new StringField({ required: true, blank: true, initial: "" }),
      group: new StringField({ required: true, blank: true, initial: "" }),
      weight: new NumberField({ required: true, integer: true, initial: 0 }),
      value: new NumberField({ required: true, integer: true, initial: 0 }),
      formula: new StringField({ required: true, blank: true, initial: "" }),
      category: new StringField({ required: true, blank: true, initial: "" }),
    };
  }
}

export class ContainerDataModel extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      notes: new StringField({ required: true, blank: true, initial: "" }),
      chartype: new StringField({ required: true, blank: true, initial: "" }),
      group: new StringField({ required: true, blank: true, initial: "" }),
      dropped: new ArrayField(new ObjectField()),
      entries: new ArrayField(new ObjectField()),
    };
  }
}

export const ACTOR_DATA_MODELS = {
  "CharacterVsD": CharacterVsDDataModel,
};

export const ITEM_DATA_MODELS = {
  "Container": ContainerDataModel,
  "Rollable": RollableDataModel,
  "Trait": TraitDataModel,
  "Melee-Attack": MeleeAttackDataModel,
  "Ranged-Attack": RangedAttackDataModel,
  "Defence": DefenceDataModel,
  "Pool": PoolDataModel,
  "Modifier": ModifierDataModel,
  "Variable": VariableDataModel,
  "Primary-Attribute": PrimaryAttributeDataModel,
  "Equipment": EquipmentDataModel,
  "Hit-Location": HitLocationDataModel,
};
