# Against the Darkmaster (Foundry V13/V14)

Community continuation of the [official Against the Darkmaster Foundry system](https://gitlab.com/jbhuddleston/vsd) (`vsd`), ported for **Foundry Virtual Tabletop V13 and V14**.

> **Not an official Open Ended Games / James Huddleston release.** Upstream development stopped at Foundry 12 (`compatibility.maximum: 12`). This fork keeps system id `vsd` so existing worlds can migrate when you replace the installed system.

## Install (GitHub / Manifest)

1. Open Foundry **Setup** → **Game Systems** → **Install System**.
2. Paste the **Manifest URL** from the latest GitHub Release:

```text
https://github.com/OWNER/vsd/releases/latest/download/system.json
```

3. Create or open a world using **Against the Darkmaster**.

### Replace an older `vsd` install

1. Back up your world(s).
2. Remove the Foundry 12 `vsd` system from `Data/systems/vsd` (or uninstall it in Setup).
3. Install this build via the manifest URL above (same system id).

### Local development install

Copy or junction this repository folder to:

```text
{userData}/Data/systems/vsd
```

The folder name **must** be `vsd` (matches `"id"` in `system.json`).

## Compatibility

| Field | Value |
|-------|--------|
| `compatibility.minimum` | 13 |
| `compatibility.verified` | 13 (smoke-test V14 before bumping `verified` to 14) |
| `maximum` | *(unset — do not lock out future cores)* |

### What changed for V13/V14

- ApplicationV2 actor/item sheets (`ActorSheetV2` / `ItemSheetV2`)
- `template.json` → `documentTypes` + TypeDataModels (`module/data/models.js`)
- Combat tracker AppV2 PARTS + VsD action UI
- Scene controls object API (`controls.tokens.tools…`)
- Status effects use `name` / `img` (V14-safe)
- CSS `@layer vsd` / Theme V2 helpers

See [V13-V14-INVENTORY.md](V13-V14-INVENTORY.md) for the static breakage checklist.

## Packaging a release

```powershell
.\tools\package-release.ps1
```

Produces `dist/vsd.zip` and a release-ready `dist/system.json` with matching download URLs (edit `OWNER/REPO` in the script or `system.json` first).

## License & attribution

- Code: [Apache License 2.0](LICENSE) (upstream)
- Original system © James Huddleston
- Against the Darkmaster © Open Ended Games — buy the rules at [vsdarkmaster.com](https://www.vsdarkmaster.com/)
- Do **not** redistribute Core Rules PDFs or OCR dumps with this package

## Upstream

- Archived source: https://gitlab.com/jbhuddleston/vsd
- Game site: https://www.vsdarkmaster.com/
- Support the original author: https://ko-fi.com/jbhuddleston
