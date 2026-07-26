export const system = {
  dataRgx: /[^-(){}\d<>/=*+., DdflorceiMmaxthbsunvpwkxX]/g,
  slugify: (text) => {
    return text
      .toString() // Cast to string
      .toLowerCase() // Convert the string to lowercase letters
      .normalize("NFD") // The normalize() method returns the Unicode Normalization Form of a given string.
      .trim() // Remove whitespace from both sides of a string
      .replace(/[\s-]+/g, "_") // Replace spaces with underscore
      .replace(/[^\w]+/g, "") // Remove all non-word chars
      .replace(/\_\_+/g, "_"); // Replace multiple underscores with a single one
  },
  entriesAreEqual: (first, second) => {
    if (first.length != second.length) return false;
    for (let i = 0; i < first.length; i++) {
      if (first[i].formula != second[i].formula) return false;
      if (first[i].category != second[i].category) return false;
      if (first[i].targets != second[i].targets) return false;
    }
    return true;
  },
  showJournal: (journalName) => {
    const journalref = system.journalref[system.slugify(journalName)];
    if (journalref) {
      // V13+: prefer fromUuid + render; Journal._showEntry is legacy
      if (typeof fromUuid === "function") {
        fromUuid(journalref.uuid).then((doc) => doc?.sheet?.render(true));
      } else if (Journal?._showEntry) {
        Journal._showEntry(journalref.uuid);
      }
    } else {
      if (journalName)
        ui.notifications.error(
          `There is no matching Journal Entry for ${journalName} in the Compendia.`
        );
    }
  },
  closeJournal: (journalName) => {
    const journalref = system.journalref[system.slugify(journalName)];
    if (journalref.parent) {
      journalref.parent.sheet.close();
    } else {
      journalref.sheet.close();
    }
  },
  combat: [
    { action: "Select", initiative: 90 },
    { action: "Move", initiative: 61 },
    { action: "Cast Prepared Spell", initiative: 51 },
    { action: "Cast Instantaneous Spell", initiative: 51 },
    { action: "Aimed Ranged Attack", initiative: 41 },
    { action: "Throw Ready Weapon", initiative: 41 },
    { action: "Longest Melee Plus", initiative: 36 },
    { action: "Longest Melee", initiative: 35 },
    { action: "Long Melee", initiative: 34 },
    { action: "Short Melee", initiative: 33 },
    { action: "Hand Melee", initiative: 32 },
    { action: "Unaimed Ranged Attack", initiative: 21 },
    { action: "Cast Unprepared Spell", initiative: 11 },
    { action: "Other Action", initiative: 1 },
    { action: "Wait - Ready", initiative: 0 }
  ],
  // skills tab
  oddskills: ["body", "armor"],
  skillsort: [
    { name: "Combat", data: ["blunt", "blades", "ranged", "polearms", "brawl"] },
    { name: "Adventuring", data: ["athletics", "ride", "hunting", "nature", "wandering"] },
    { name: "Roguery", data: ["acrobatics", "stealth", "locks_traps", "perception", "deceive"] },
    { name: "Lore", data: ["arcana", "charisma", "cultures", "healer", "songs_tales"] }
  ],
  skillvariables: ["difficulty", "helpers", "drive_point_bonus"],

  // spells tab
  spellvariables: ["spell_range", "attack_spell_range", "prepaim_time", "prepaim_time_obs", "edb", "mp", "ah1", "ah3", "ah5", "ra5", "tokens"],
  specialrolls: ["spell_failure", "magic_resonance_roll"],
  specialmods: ["critical_severity", "mrr_location", "mrr_spell_type", "weave", "overcasting", "failed_spell_type"],

  // combat tab
  defencevariables: ["move_mode", "move_rate", "armor_type", "melee_db", "missile_db"],
  savesort: ["willpower_saving_roll", "toughness_saving_roll"],

  defencemodifiers: ["attack_level", "sst", "hp", "sd", "drive", "hero"],

  attackvariables: ["missile_range", "prepaim_time", "prepaim_time_obs", "edb", "parry", "drive_point_bonus", "tokens"],

  specialcombatrolls: ["fumble_meleethrown", "fumble_missile"],
  specialcombatmods: ["fumble_mod", "critical_severity"],

  // main tab
  primarysort: {
    name: "Stats",
    data: ["brn", "swi", "for", "wit", "wsd", "bea"]
  },
  advancementPools: ["drive", "hero", "xp"],

  // stat block import lists of items to remove from the template
  npcremove: [
    "bea", "brn", "for", "swi", "wsd", "wit",
    "blunt", "blades", "polearms", "ranged", "brawl",
    "magic_resonance_roll", "spell_failure", "armor", "body",
    "blades_dagger_pierce", "brawl_dagger_pierce", "brawl_grappling_grapple", "brawl_kick_impact", "brawl_punch_impact",
    "drive", "xp", "hero", "mp", "wl",
    "armor_type", "attack_spell_range", "helpers", "mrr_location", "mrr_spell_type", "move_mode", "ranks_level_1",
    "spell_range", "weave", "critical_grapple", "critical_impact", "critical_pierce", "critical_cut"
  ],
  npcremovemods: [
    "attack_spell_range", "spell_range", "target_is_static", "failed_spell_type",
    "mrr_location_mod", "mrr_spell_type_mod", "weave_mod",
    "bearing_bonus", "brawn_bonus", "swiftness_bonus", "fortitude_bonus", "wisdom_bonus", "wits_bonus",
    "character_attribute_creation", "drive_bonus", "helpers"
  ],
  postures: {
    standing: "local.postures.standing",
    crouching: "local.postures.crouching",
    kneeling: "local.postures.kneeling",
    crawling: "local.postures.crawling",
    sitting: "local.postures.sitting",
    pronef: "local.postures.pronef",
    proneb: "local.postures.proneb"
  }
};

CONFIG.ChatMessage.template = "systems/vsd/templates/chat/chat-message.hbs";

CONFIG.postures = [
  "systems/vsd/icons/postures/standing.png",
  "systems/vsd/icons/postures/sitting.png",
  "systems/vsd/icons/postures/crouching.png",
  "systems/vsd/icons/postures/crawling.png",
  "systems/vsd/icons/postures/kneeling.png",
  "systems/vsd/icons/postures/lyingback.png",
  "systems/vsd/icons/postures/lyingprone.png",
  "systems/vsd/icons/postures/sittingchair.png"
];

CONFIG.sizemods = [
  "systems/vsd/icons/sizemods/smneg1.png",
  "systems/vsd/icons/sizemods/smneg2.png",
  "systems/vsd/icons/sizemods/smneg3.png",
  "systems/vsd/icons/sizemods/smneg4.png",
  "systems/vsd/icons/sizemods/smpos1.png",
  "systems/vsd/icons/sizemods/smpos2.png",
  "systems/vsd/icons/sizemods/smpos3.png",
  "systems/vsd/icons/sizemods/smpos4.png"
];

CONFIG.crippled = [
  "systems/vsd/icons/crippled/crippledleftarm.png",
  "systems/vsd/icons/crippled/crippledlefthand.png",
  "systems/vsd/icons/crippled/crippledleftleg.png",
  "systems/vsd/icons/crippled/crippledleftfoot.png",
  "systems/vsd/icons/crippled/crippledrightarm.png",
  "systems/vsd/icons/crippled/crippledrighthand.png",
  "systems/vsd/icons/crippled/crippledrightleg.png",
  "systems/vsd/icons/crippled/crippledrightfoot.png",
];

CONFIG.controlIcons.defeated = "systems/vsd/icons/defeated.png";

CONFIG.statusEffectsVsD = [
  { img: 'systems/vsd/icons/conditions/bruised.svg', id: 'bruised', name: 'local.conditions.bruised' },
  { img: 'systems/vsd/icons/conditions/weary.svg', id: 'weary', name: 'local.conditions.weary' },
  { img: 'systems/vsd/icons/conditions/incapacitated.svg', id: 'incapacitated', name: 'local.conditions.incapacitated' },
  { img: 'systems/vsd/icons/conditions/dying.svg', id: 'dying', name: 'local.conditions.dying' },

  { img: 'systems/vsd/icons/conditions/bleeding.svg', id: 'bleeding', name: 'local.conditions.bleeding' },
  { img: 'systems/vsd/icons/conditions/blinded.svg', id: 'blind', name: 'local.conditions.blind' },
  { img: 'systems/vsd/icons/conditions/deafened.svg', id: 'deaf', name: 'local.conditions.deaf' },
  { img: 'systems/vsd/icons/conditions/silenced.svg', id: 'mute', name: 'local.conditions.mute' },

  { img: 'systems/vsd/icons/conditions/burning.svg', id: 'burning', name: 'local.conditions.burning' },
  { img: 'systems/vsd/icons/conditions/diseased.svg', id: 'diseased', name: 'local.conditions.diseased' },
  { img: 'systems/vsd/icons/conditions/freezing.svg', id: 'freezing', name: 'local.conditions.freezing' },
  { img: 'systems/vsd/icons/conditions/poisoned.svg', id: 'poisoned', name: 'local.conditions.poisoned' },

  { img: 'systems/vsd/icons/conditions/healing.svg', id: 'healing', name: 'local.conditions.healing' },
  { img: 'systems/vsd/icons/conditions/engaged.svg', id: 'engaged', name: 'local.conditions.engaged' },
  { img: 'systems/vsd/icons/conditions/shield.svg', id: 'shielded', name: 'local.conditions.shielded' },
  { img: 'systems/vsd/icons/conditions/stealthy.svg', id: 'stealthy', name: 'local.conditions.stealthy' },

  { img: 'systems/vsd/icons/postures/prone.svg', id: 'prone', name: 'local.postures.prone' },
  { img: 'systems/vsd/icons/postures/flying.svg', id: 'flying', name: 'local.postures.flying' },
  { img: 'systems/vsd/icons/postures/swimming.svg', id: 'swimming', name: 'local.postures.swimming' },
  { img: CONFIG.controlIcons.defeated, id: 'dead', name: 'local.conditions.defeated' },

  { img: 'systems/vsd/icons/conditions/held.svg', id: 'held', name: 'local.conditions.held' },
  { img: 'systems/vsd/icons/conditions/stunned.svg', id: 'stunned', name: 'local.conditions.stunned' },
  { img: 'systems/vsd/icons/conditions/surprised.svg', id: 'surprised', name: 'local.conditions.surprised' },
  { img: 'systems/vsd/icons/conditions/frightened.svg', id: 'frightened', name: 'local.conditions.frightened' },

  { img: 'systems/vsd/icons/conditions/concentrating-1.svg', id: 'concentrating1', name: 'local.conditions.concentrating' },
  { img: 'systems/vsd/icons/conditions/concentrating-2.svg', id: 'concentrating2', name: 'local.conditions.concentrating' },
  { img: 'systems/vsd/icons/conditions/concentrating-3.svg', id: 'concentrating3', name: 'local.conditions.concentrating' },
  { img: 'systems/vsd/icons/conditions/concentrating-4.svg', id: 'concentrating4', name: 'local.conditions.concentrating' },

  { img: 'systems/vsd/icons/conditions/aiming-1.svg', id: 'aiming1', name: 'local.conditions.aiming' },
  { img: 'systems/vsd/icons/conditions/aiming-2.svg', id: 'aiming2', name: 'local.conditions.aiming' },
  { img: 'systems/vsd/icons/conditions/aiming-3.svg', id: 'aiming3', name: 'local.conditions.aiming' },
  { img: 'systems/vsd/icons/conditions/aiming-4.svg', id: 'aiming4', name: 'local.conditions.aiming' },

  { img: 'systems/vsd/icons/conditions/loading-1.svg', id: 'loading1', name: 'local.conditions.loading' },
  { img: 'systems/vsd/icons/conditions/loading-2.svg', id: 'loading2', name: 'local.conditions.loading' },
  { img: 'systems/vsd/icons/crippled/torsoinjury.svg', id: 'crippledtorso', name: 'local.conditions.crippled' },
  { img: 'systems/vsd/icons/crippled/headinjury.svg', id: 'crippledhead', name: 'local.conditions.crippled' },

  { img: 'systems/vsd/icons/crippled/leftarminjury.svg', id: 'crippledleftarm', name: 'local.conditions.crippled' },
  { img: 'systems/vsd/icons/crippled/lefthandinjury.svg', id: 'crippledlefthand', name: 'local.conditions.crippled' },
  { img: 'systems/vsd/icons/crippled/leftleginjury.svg', id: 'crippledleftleg', name: 'local.conditions.crippled' },
  { img: 'systems/vsd/icons/crippled/leftfootinjury.svg', id: 'crippledleftfoot', name: 'local.conditions.crippled' },

  { img: 'systems/vsd/icons/crippled/rightarminjury.svg', id: 'crippledrightarm', name: 'local.conditions.crippled' },
  { img: 'systems/vsd/icons/crippled/righthandinjury.svg', id: 'crippledrighthand', name: 'local.conditions.crippled' },
  { img: 'systems/vsd/icons/crippled/rightleginjury.svg', id: 'crippledrightleg', name: 'local.conditions.crippled' },
  { img: 'systems/vsd/icons/crippled/rightfootinjury.svg', id: 'crippledrightfoot', name: 'local.conditions.crippled' },

  { img: 'systems/vsd/icons/charging.png', id: 'charging', name: 'local.conditions.charging' },
  { img: 'systems/vsd/icons/flanking.png', id: 'flanking', name: 'local.conditions.flanking' },
  { img: 'systems/vsd/icons/full_half.png', id: 'full_half', name: 'local.conditions.full_half' },
  { img: 'systems/vsd/icons/on_rear.png', id: 'on_rear', name: 'local.conditions.on_rear' },

  { img: 'systems/vsd/icons/conditions/enclight.svg', id: 'lightenc', name: 'local.conditions.encumbered' },
  { img: 'systems/vsd/icons/conditions/encnorm.svg', id: 'normenc', name: 'local.conditions.encumbered' },
  { img: 'systems/vsd/icons/conditions/encheavy.svg', id: 'heavyenc', name: 'local.conditions.encumbered' },
  { img: 'systems/vsd/icons/conditions/encover.svg', id: 'overenc', name: 'local.conditions.encumbered' }
];

CONFIG.tokenEffects = {
  effectSize: {
    xxxlarge: 1,
    xxlarge: 1.5,
    xlarge: 2,
    large: 3,
    medium: 4,
    small: 5
  },
  effectSizeChoices: {
    small: "Small (Default) - 5x5",
    medium: "Medium - 4x4",
    large: "Large - 3x3",
    xlarge: "XL - 2x2",
    xxlarge: "2XL - 1.5x1.5",
    xxxlarge: "3XL - 1x1"
  }
};

