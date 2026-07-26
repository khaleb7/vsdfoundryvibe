if (canvas.tokens.controlled.length == 0)
  return ui.notifications.error("Please select at least a single token first");

for (const token of canvas.tokens.controlled) {
  const wpnbonus = token.actor.system.dynamic.wpn?.system.value / 5 || 0;
  const swibonus = token.actor.system.dynamic.swi?.system.value / 5 || 0;
  const wsdbonus = token.actor.system.dynamic.wsd?.system.value / 5 || 0;
  const formula = `2d10 + ${wpnbonus} + ${swibonus} + ${wsdbonus}`;
  const roll = await new Roll(formula).evaluate();
  ChatMessage.create({
    //speaker: { alias: token.name },
    speaker: ChatMessage.getSpeaker({token:token}),
    content: `Rolled initiative: ${roll.result} = ${roll.total}.`,
  });
  token.actor.update({ ["system.bs.value"]: roll.total });
}