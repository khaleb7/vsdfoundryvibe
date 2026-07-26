const buttondata = [
  { label: "Hand Minus", length: 0.5 },
  { label: "Hand", length: 0.75 },
  { label: "Short", length: 1.0 },
  { label: "Medium", length: 1.5 },
  { label: "Long", length: 1.75 },
  { label: "Longest", length: 2.25 },
  { label: "Longest Plus", length: 2.75 },
  { label: "Highlight", length: 0 }
];

const buttons = {};
for (const button of buttondata) {
  buttons[button.label] = {
    label: button.label,
    callback: () => {
      label = button.label;
      length = button.length;
      d.render(true);
    }
  }
}

let d = new Dialog({
  title: `Set Wpn Len`,
  buttons: buttons,
  close: async html => {
    if (label) {
      const tokens = canvas.tokens.controlled;
      for (const token of tokens) {
        const wpnlen = length == 0 ? token.light.bright : length;
        token.document.update({
          active: true,
          lockRotation: false,
          light: {
            alpha: 0.5,
            angle: 120,
            attenuation: 0,
            bright: wpnlen,
            color: "#b12b2b",
            coloration: 1,
            contrast: 0,
            dim: null,
            luminosity: 0,
            saturation: length == 0 ? 1 : -1,
            shadows: 0
          }
        });

        ChatMessage.create({
          speaker: { alias: token.name },
          content: `Weapon length is now: <b>${label}</b>.`,
        });
      }
      label = "";
    }
  }
},
  {
    width: 200,
    classes: ["mydialog"],
    top: 0,
    left: 0
  });
d.render(true);
