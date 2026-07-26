import json
from pathlib import Path

tpl = json.loads(Path("template.json").read_text(encoding="utf-8"))


def js_key(k):
    k = str(k)
    return k if k.isidentifier() else json.dumps(k)


def field_for(v, indent=4):
    sp = " " * indent
    if isinstance(v, bool):
        return f"new BooleanField({{ initial: {str(v).lower()} }})"
    if isinstance(v, int) and not isinstance(v, bool):
        return f"new NumberField({{ required: true, integer: true, initial: {v} }})"
    if isinstance(v, float):
        return f"new NumberField({{ required: true, initial: {v} }})"
    if isinstance(v, str):
        esc = json.dumps(v)
        return f"new StringField({{ required: true, blank: true, initial: {esc} }})"
    if isinstance(v, list):
        if not v:
            return "new ArrayField(new ObjectField())"
        if isinstance(v[0], dict):
            keys = {}
            for el in v:
                keys.update(el)
            lines = [f"{sp}  {js_key(k)}: {field_for(val, indent + 2)}" for k, val in keys.items()]
            inner = ",\n".join(lines)
            return f"new ArrayField(new SchemaField({{\n{inner}\n{sp}}}))"
        return "new ArrayField(new ObjectField())"
    if isinstance(v, dict):
        if not v:
            return "new ObjectField({ initial: () => ({}) })"
        lines = [f"{sp}  {js_key(k)}: {field_for(val, indent + 2)}" for k, val in v.items()]
        inner = ",\n".join(lines)
        return f"new SchemaField({{\n{inner}\n{sp}}})"
    return "new ObjectField()"


def item_class_name(t):
    return "".join(p.capitalize() for p in t.replace("-", " ").split()) + "DataModel"


out = []
out.append(
    "const { ArrayField, BooleanField, HTMLField, NumberField, ObjectField, SchemaField, StringField } = foundry.data.fields;"
)
out.append("")
out.append("/** Converted from template.json for Foundry V13/V14 TypeDataModels. */")
out.append("")

for t, schema in tpl["Actor"].items():
    if t == "types":
        continue
    out.append(f"export class {t.replace('-', '')}DataModel extends foundry.abstract.TypeDataModel {{")
    out.append("  static defineSchema() {")
    out.append("    return {")
    for k, v in schema.items():
        # tracked is a runtime bag of Pool Item refs; keep as ObjectField only
        if k == "tracked":
            continue
        if k in ("biography", "notes"):
            out.append(f'      {k}: new HTMLField({{ required: true, blank: true, initial: "" }}),')
            continue
        out.append(f"      {js_key(k)}: {field_for(v, 6)},")
    out.append("      // Runtime bags rebuilt in prepareBaseData / prepareDerivedData")
    out.append("      dynamic: new ObjectField({ initial: () => ({}) }),")
    out.append("      tracked: new ObjectField({ initial: () => ({}) }),")
    out.append("      modifiers: new ObjectField({ initial: () => ({}) }),")
    out.append("      sheetData: new ObjectField({ initial: () => ({}) }),")
    out.append('      itemscript: new StringField({ required: true, blank: true, initial: "" }),')
    out.append("      useFAHR: new BooleanField({ initial: false }),")
    out.append('      rankMode: new StringField({ required: true, blank: true, initial: "" }),')
    out.append("    };")
    out.append("  }")
    out.append("}")
    out.append("")

for t, schema in tpl["Item"].items():
    if t == "types":
        continue
    classname = item_class_name(t)
    out.append(f"export class {classname} extends foundry.abstract.TypeDataModel {{")
    out.append("  static defineSchema() {")
    out.append("    return {")
    for k, v in schema.items():
        out.append(f"      {js_key(k)}: {field_for(v, 6)},")
    out.append("    };")
    out.append("  }")
    out.append("}")
    out.append("")

out.append("export const ACTOR_DATA_MODELS = {")
for t in tpl["Actor"]["types"]:
    out.append(f'  "{t}": {t.replace("-", "")}DataModel,')
out.append("};")
out.append("")
out.append("export const ITEM_DATA_MODELS = {")
for t in tpl["Item"]["types"]:
    out.append(f'  "{t}": {item_class_name(t)},')
out.append("};")
out.append("")

Path("module/data").mkdir(exist_ok=True)
Path("module/data/models.js").write_text("\n".join(out), encoding="utf-8")
print("Wrote module/data/models.js", len(out), "lines")
