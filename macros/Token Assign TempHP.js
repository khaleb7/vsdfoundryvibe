/**
 * You must be using a pool with abbreviation 'TempHP' for this to work.
 */

new Dialog({
  title: `Assign Temporary HP to Selected Tokens`,
  content: `
      <form>
          <div style="display: flex; width: 100%; margin-bottom: 10px">
              <label for="temphp" style="white-space: nowrap; margin-right: 10px; padding-top:4px">Temp HP (0 for reset):</label>
              <input type="number" id="temphp" name="temphp" min="0" max="100" autofocus />
          </div>
      </form>
  `,
  buttons: {
    yes: {
      icon: "<i class='fas fa-check'></i>",
      label: `Apply!`,
      callback: async (html) => {
        let temphp = html.find('#temphp').val();
        console.log(temphp);
        if (!temphp) {
          return ui.notifications.info("Please enter number between 0 and 100.");
        }
        if (canvas.tokens.controlled.length == 0) {
          return ui.notifications.error("Please select at least one token first");
        }
        for (const token of canvas.tokens.controlled) {
          const actor = token.document.actor;
          const item = actor.system.tracked.temphp;
          const assignment = Number(temphp);
          if (!item) {
            ui.notifications.error(`${token.name} does not have Temp HP.`);
            continue;
          }
          const itemdata = item.system;
          if (assignment == 0) {
            itemdata.maxForm = "0";
            itemdata.value = 0;
          } else {
            itemdata.maxForm = "" + (itemdata.max + assignment);
            itemdata.value += assignment;
          }
          actor.updateEmbeddedDocuments("Item", [{ _id: item._id, "system": itemdata }]);
        }
      }
    },
    no: {
      icon: "<i class='fas fa-times'></i>",
      label: `Cancel`
    },
  },
  default: "yes",
  render: html => html.find('#temphp').focus()
}).render(true);