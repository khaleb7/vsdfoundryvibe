# V13/V14 Breakage Inventory (static analysis of vsd 12.290)

## Blocking
1. system.json compatibility.maximum = 12 — blocks install on 13/14
2. template.json / System#template — removed in V14; need documentTypes + TypeDataModels
3. ActorSheet / ItemSheet (AppV1) — V13 removed default sheet fallbacks; CSS Layers break AppV1 styling
4. CombatTracker AppV1 subclass — V13 CombatTracker is ApplicationV2 (PARTS)

## High risk
5. MyDialog extends Dialog (AppV1) — this.element assumed jQuery (element[0])
6. TokenEffects uses e.label, e.icon, doc.effects, overlayEffect — removed/changed V14
7. getSceneControlButtons: controls[0].tools.push — V13 controls are keyed objects
8. Sheet registration: Actors.registerSheet / ActorSheet globals may need foundry.documents.collections + appv1/appv2 paths
9. ContextMenu + jQuery html.find throughout sheets
10. loadTemplates / Handlebars helpers — still OK but prefer foundry.applications.handlebars.loadTemplates

## Already OK / low risk
- statusEffectsVsD already uses name + img
- Open-ended oe modifier uses foundry.dice.terms.DiceTerm
- Math.clamp already used in token.js
- No {{#select}} / colorPicker in templates
