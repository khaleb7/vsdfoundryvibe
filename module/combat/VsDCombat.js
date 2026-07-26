import { system } from "../config.js";

const CombatTracker = foundry.applications?.sidebar?.tabs?.CombatTracker ?? globalThis.CombatTracker;
const CombatantConfig = foundry.applications?.sheets?.CombatantConfig
  ?? foundry.appv1?.sheets?.CombatantConfig
  ?? globalThis.CombatantConfig;

export class VsDCombat extends Combat {
  constructor(data, context) {
    super(data, context);
    this.actions = system.combat || [];
  }

  async nextTurn() {
    if (this.turn != 0) {
      await this.update({ turn: 0 });
    }
    if (this.combatant.initiative == null) return;
    await this.combatant.actor.setFlag("vsd", "action", "Completed");
    await this.combatant.update({
      ["flags.vsd.action"]: this.actions[0].action,
      initiative: null
    });
    if (this.turns[0].initiative == null) this.nextRound();
  }

  async nextRound() {
    if (!this.isOwner) {
      ui.notifications.warn("Players may not advance the round, please tell your GM to do so.");
      return;
    }
    await this.resetAll();
    for (const c of this.combatants) {
      c.actor?.resetModVars?.(true);
      c.actor?.applyBleeding?.();
      await c.update({
        ["flags.vsd.ready"]: false,
        ["flags.vsd.action"]: this.actions[0].action,
        initiative: null
      });
    }
    return super.nextRound();
  }
}

/**
 * ApplicationV2 combat tracker with VsD action declaration UI.
 */
export class VsDCombatTracker extends CombatTracker {
  static {
    const base = CombatTracker.PARTS ?? {};
    this.PARTS = {
      header: foundry.utils.deepClone(base.header ?? { template: "templates/sidebar/tabs/combat/header.hbs" }),
      tracker: {
        template: "systems/vsd/templates/combat/parts/tracker.hbs",
        scrollable: [""]
      },
      footer: foundry.utils.deepClone(base.footer ?? { template: "templates/sidebar/tabs/combat/footer.hbs" })
    };
  }

  /** Enrich turn data with VsD action / ready flags. */
  async _prepareTrackerContext(context, options) {
    if (typeof super._prepareTrackerContext === "function") {
      await super._prepareTrackerContext(context, options);
    }
    context.actions = this.viewed?.actions ?? system.combat ?? [];
    if (!context.turns?.length) return;
    for (let i = 0; i < context.turns.length; i++) {
      const turn = context.turns[i];
      const combatant = this.viewed.combatants.get(turn.id);
      if (!combatant) continue;
      turn.action = combatant.getFlag("vsd", "action");
      turn.ready = combatant.getFlag("vsd", "ready");
      turn.active = i === 0;
      turn.css = [turn.css, turn.defeated ? "defeated" : null, turn.active ? "active" : null].filterJoin(" ");
    }
  }

  /** @override */
  async _onRender(context, options) {
    await super._onRender(context, options);
    const root = this.element;
    root.querySelectorAll(".declaredaction").forEach(el => {
      el.addEventListener("change", this._onActionsChanged.bind(this));
    });
    root.querySelectorAll(".interrupt").forEach(el => {
      el.addEventListener("click", this._onInterrupt.bind(this));
    });
    root.querySelectorAll(".name").forEach(el => {
      el.addEventListener("click", this._onToggleReady.bind(this));
    });
  }

  async _onToggleReady(event) {
    const li = event.currentTarget.closest(".combatant");
    const c = this.viewed.combatants.get(li.dataset.combatantId);
    if (!c?.isOwner) return;
    await c.setFlag("vsd", "ready", !c.getFlag("vsd", "ready"));
  }

  async _onActionsChanged(event) {
    const option = event.currentTarget.selectedOptions[0];
    const li = event.currentTarget.closest(".combatant");
    const c = this.viewed.combatants.get(li.dataset.combatantId);
    if (!c?.isOwner) return;
    await c.update({
      ["flags.vsd.action"]: option.text,
      initiative: Number(option.value)
    });
    await c.actor?.setFlag("vsd", "action", option.text);
  }

  async _onInterrupt(event) {
    const li = event.currentTarget.closest(".combatant");
    const c = this.viewed.combatants.get(li.dataset.combatantId);
    if (!c?.isOwner) return;
    return c.update({
      initiative: (this.viewed.turns[0]?.initiative ?? 0) + 1
    });
  }
}

export class VsDCombatantConfig extends CombatantConfig {
  static PARTS = {
    body: {
      template: "systems/vsd/templates/combat/vsdcombatant-config.hbs"
    }
  };

  /** AppV1 fallback */
  get template() {
    return "systems/vsd/templates/combat/vsdcombatant-config.hbs";
  }
}

export class VsDCombatant extends Combatant {
  _onCreate(data, options, userId) {
    super._onCreate(data, options, userId);
    if (this.isOwner) {
      this.setFlag("vsd", "action", "Select");
    }
  }
}
