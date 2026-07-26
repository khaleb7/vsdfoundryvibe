# V13/V14 Breakage Inventory (status after 14.0.0)

## Done
1. `system.json` — `maximum: 12` removed; `minimum` 13, `verified` 14
2. `template.json` / `System#template` — removed; `documentTypes` + TypeDataModels in `module/data/models.js`
3. ActorSheet / ItemSheet — migrated to ApplicationV2 (`ActorSheetV2` / `ItemSheetV2`)
4. CombatTracker — ApplicationV2 `PARTS` in `module/combat/VsDCombat.js`
5. Scene controls — V13+ keyed object API (`controls.tokens.tools`)
6. Sheet registration — `foundry.documents.collections` + AppV2 classes
7. Status effect fields — `name` / `img` (not `label` / `icon`)
8. Token action toggles — `Token#toggleEffect` replaced with ActiveEffect / `toggleStatusEffect`
9. Chat hooks — `renderChatMessage` → `renderChatMessageHTML`
10. Pack paths — all six packs use LevelDB folder paths (no stale `.db` entries)
11. Manifest URLs — `khaleb7/vsdfoundryvibe` GitHub Release assets

## Residual / non-blocking
5. `MyDialog` still extends AppV1 `Dialog` (dual element handling in place; DialogV2 later)
9. ContextMenu + jQuery `html.find` still used in sheet `_onRender` (works while jQuery is present)
10. `loadTemplates` — prefer `foundry.applications.handlebars.loadTemplates` over time
- `TokenEffects.patchCore()` remains commented out; core + CONFIG status effects preferred
- Macros still use AppV1 Dialog patterns

## Manual smoke checklist (Foundry 14)
- [ ] Install via manifest URL; all six packs open
- [ ] Open CharacterVsD actor sheet and item sheets
- [ ] Combat tracker action declaration UI
- [ ] Toggle Action modifier with a controlled token (status icon sync)
- [ ] Chat crit/damage/defence drag targets
