const TokenDocument = foundry.documents.TokenDocument;
const Token = foundry.canvas.placeables.Token;
const TokenHUD = foundry.applications.hud.TokenHUD;

export class VsDTokenDocument extends TokenDocument {

  /**
   * A helper method to retrieve the underlying data behind one of the Token's attribute bars
   * @param {string} barName        The named bar to retrieve the attribute for
   * @param {string} alternative    An alternative attribute path to get instead of the default one
   * @return {object|null}          The attribute displayed on the Token bar, if any
   */
  getBarAttribute(barName, { alternative } = {}) {
    const attr = alternative || this[barName]?.attribute;
    if (!attr || !this.actor) return null;
    let data = foundry.utils.getProperty(this.actor.system, attr);
    if (data === null || data === undefined) return null;

    // Single values but we are not supporting single values
    if (Number.isNumeric(data)) {
      return {
        type: "value",
        attribute: attr,
        value: Number(data),
        editable: true,
      };
    }

    // Attribute objects
    else if ("value" in data && "max" in data) {
      return {
        type: "bar",
        attribute: attr,
        value: Number(data.value || 0),
        max: Number(data.max || 0),
        min: Number(data.min || 0),
        editable: true,
      };
    }

    // Otherwise null
    return null;
  }

  /**
   * @override
   * Retrieve an Array of attribute choices from a plain object.
   * @param {object} data  The object to explore for attributes.
   * @param {string[]} _path
   * @returns {TrackedAttributesDescription}
   * @protected
   */
  static _getTrackedAttributesFromObject(data, _path = []) {
    const attributes = { bar: [], value: [] };
    const trackeddata = data.tracked || {};
    _path = ["tracked"];
    for (let [k] of Object.entries(trackeddata)) {
      attributes.bar.push(_path.concat([k, "system"]));
    }
    return attributes;
  }
}

export class VsDToken extends Token {
  /**
   * Draw a single resource bar, given provided data
   * @param {number} number       The Bar number
   * @param {PIXI.Graphics} bar   The Bar container
   * @param {Object} data         Resource data for this bar
   * @protected
   */
  _drawBar(number, bar, data) {
    const val = Number(data.value);
    const min = Number(data.min);
    const pct = Math.clamp(val, 0, data.max) / data.max;
    const pctfull = Math.clamp(val - min, 0, data.max - min) / (data.max - min);

    let h = Math.max(canvas.dimensions.size / 12, 8);
    const w = this.w;
    const bs = Math.clamp(h / 8, 1, 2);
    if (this.document.height >= 2) h *= 1.6;

    const blk = 0x000000;
    let color;
    if (val <= 0) color = 0x600000;
    else if (number === 0) color = Color.fromRGB([1 - pct / 2, pct, 0]);
    else color = Color.fromRGB([0.5 * pct, 0.7 * pct, 0.5 + pct / 2]);

    bar.clear();
    bar.beginFill(blk, 0.5).lineStyle(bs, blk, 1.0).drawRoundedRect(0, 0, this.w, h, 3);
    bar.beginFill(color, 1.0).lineStyle(bs, blk, 1.0).drawRoundedRect(0, 0, pctfull * w, h, 2);

    let posY = number === 0 ? this.h - h : 0;
    bar.position.set(0, posY);
  }
}

export class TokenEffects {
  /**
   * Patch core methods (optional / legacy). Prefer CONFIG.statusEffects with name+img.
   */
  static patchCore() {
    Token.prototype._drawEffect = TokenEffects._drawEffect;
    if (TokenHUD?.prototype?._getStatusEffectChoices) {
      TokenHUD.prototype._getStatusEffectChoices = TokenEffects._getStatusEffectChoices;
    }
  }

  static async _drawEffect(src, i, bg, w, tint) {
    const effectSize = game.settings.get("vsd", "effectSize");
    const divisor = effectSize ? CONFIG.tokenEffects.effectSize[effectSize] : 5;
    const multiplier = 10 / divisor;
    w = (w / 2) * multiplier;

    let tex = await loadTexture(src, { fallback: "icons/svg/hazard.svg" });
    let icon = this.hud.effects.addChild(new PIXI.Sprite(tex));
    icon.width = icon.height = w;
    const nr = Math.floor(this.document.height * divisor);
    icon.x = Math.floor(i / nr) * w;
    icon.y = (i % nr) * w;
    if (tint) icon.tint = tint;
    bg.drawRoundedRect(icon.x + 1, icon.y + 1, w - 2, w - 2, 2);
  }

  /**
   * Status effect choices using V14-safe name/img fields (not label/icon).
   * TokenDocument#effects / overlayEffect were removed in V14 — use ActiveEffects only.
   */
  static _getStatusEffectChoices() {
    const token = this.object;
    const actor = token.actor || null;
    const statuses = actor
      ? actor.effects.reduce((obj, e) => {
          for (const id of e.statuses ?? []) {
            obj[id] = { id, overlay: !!e.getFlag("core", "overlay") };
          }
          const legacyId = e.getFlag("core", "statusId");
          if (legacyId) {
            obj[legacyId] = { id: legacyId, overlay: !!e.getFlag("core", "overlay") };
          }
          return obj;
        }, {})
      : {};

    return CONFIG.statusEffects.reduce((obj, e) => {
      const src = e.img ?? e.icon ?? e;
      const status = statuses[e.id] || {};
      const isActive = !!status.id;
      const isOverlay = !!status.overlay;
      obj[src] = {
        id: e.id ?? "",
        title: (e.name ?? e.label) ? game.i18n.localize(e.name ?? e.label) : null,
        src,
        isActive,
        isOverlay,
        cssClass: [isActive ? "active" : null, isOverlay ? "overlay" : null].filterJoin(" "),
      };
      return obj;
    }, {});
  }
}
