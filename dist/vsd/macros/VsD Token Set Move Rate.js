const buttondata = [
  { label: "No Move" },
  { label: "Step" },
  { label: "Half Move" },
  { label: "Full Move" },
  { label: "Sprint" }
];

const buttons = {};
for (const button of buttondata) {
  buttons[button.label] = {
    label: button.label,
    callback: () => {
      label = button.label,
        d.render(true)
    }
  }
}

let d = new Dialog({
  title: `Set Move Rate`,
  buttons: buttons,
  close: async html => {
    if (label) {
      const tokens = canvas.tokens.controlled;
      for (const token of tokens) {
        const moverate = token.actor.system.dynamic?.move_rate || null;
        if (moverate != null) {
          await moverate.setValue(label);
          ChatMessage.create({
            speaker: { alias: token.name },
            content: `Move Rate has been set to ${label}.`,
          });
        }
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