#!/usr/bin/env python3
"""Extract Core Rules pages for personal-use content authoring. PDF never committed."""
from __future__ import annotations

import argparse
import json
import os
import re
from pathlib import Path

from pypdf import PdfReader

DEFAULT_PDF = r"Z:\gback\Merp to AGD\Against_the_Darkmaster_-_Core_Rules_1.5.pdf"

BESTIARY_PAGES = {
    "Boggart": range(294, 296),
    "Demon": range(295, 301),
    "Dragonspawn": range(304, 307),
    "Fomorian": range(311, 313),
    "Ghost": range(314, 317),
    "Merlock": range(324, 327),
    "Spirit": range(334, 337),
    "Undead Thralls": range(340, 342),
    "Wraith": range(350, 354),
}

KIN_PAGES = {
    "Man": range(30, 32),
    "High Man": range(31, 33),
    "Dwarf": range(32, 35),
    "Halfling": range(34, 37),
    "Half Elf": range(36, 39),
    "Silver Elf": range(38, 41),
    "Dusk Elf": range(40, 43),
    "Star Elf": range(42, 45),
    "Wildfolk": range(44, 47),
    "Orc": range(46, 49),
    "Half Orc": range(48, 51),
    "Stone Troll": range(50, 53),
    "Firbolg": range(52, 55),
}


def extract_pages(reader: PdfReader, pages) -> str:
    return "\n".join((reader.pages[i].extract_text() or "") for i in pages)


def kin_trait_lines(text: str) -> list[str]:
    m = re.search(
        r"Special Traits(.*?)(?:Suggested Cultures|Starting Wealth|Background Options|\bBRN\b)",
        text,
        re.S | re.I,
    )
    block = m.group(1) if m else text
    traits = []
    for line in block.splitlines():
        line = line.strip()
        if re.match(r"^[•\-\u2022\*]", line) or re.match(r"^[A-Z][A-Za-z'\- ]+:", line):
            traits.append(re.sub(r"^[•\-\u2022\*]\s*", "", line))
    return traits


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--pdf", default=DEFAULT_PDF)
    ap.add_argument("--out", default=str(Path(__file__).parent / "extracted"))
    args = ap.parse_args()
    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    reader = PdfReader(args.pdf)

    for name, pages in BESTIARY_PAGES.items():
        text = extract_pages(reader, pages)
        (out / f"bestiary_{name.replace(' ', '_')}.txt").write_text(text, encoding="utf-8")

    kin_traits = {}
    for name, pages in KIN_PAGES.items():
        text = extract_pages(reader, pages)
        (out / f"kin_{name.replace(' ', '_')}.txt").write_text(text, encoding="utf-8")
        kin_traits[name] = kin_trait_lines(text)

    (out / "kin_traits.json").write_text(json.dumps(kin_traits, indent=2), encoding="utf-8")
    print(f"Wrote extracts to {out}")


if __name__ == "__main__":
    main()
