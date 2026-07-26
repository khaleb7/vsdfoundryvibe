/**
 * 1. Change the configuration elements in main(actors) and save the macro.
 * 2. Run the macro.
 * 3. Select the target actors folder.
 */
async function getActors() {
  console.log("Starting to fetch Actors in Macro");
  const folders = game.collections.get("Folder").filter(c => { return c.type == "Actor" && c.contents.length > 0 });
  const buttons = {
    All: {
      label: "All",
      callback: () => {
        applyChanges = true;
        label = "All"
      }
    }
  };
  for (const button of folders) {
    buttons[button.name] = {
      label: button.name,
      callback: () => {
        applyChanges = true;
        label = button.name
      }
    }
  }
  let applyChanges = false;
  new Dialog({
    title: `Select the target Actors folder`,
    buttons: buttons,
    close: async html => {
      if (applyChanges) {
        const actors = folders.find(folder => folder.name == label)?.contents || game.collections.get("Actor").contents;
        main(actors);
      }
    }
  },
    {
      classes: ["mydialog"],
      width: 175,
      top: 0,
      left: 0
    }).render(true);
}

async function main(actors) {
  const actorImage = "icons/svg/mystery-man.svg";
  const actorLink = false;

  console.log("Folder Contents: ", actors);

  actors.forEach(async function (actor) {
    await actor.update({
      img: actorImage,
      prototypeToken: {
        actorLink: actorLink,
        appendNumber: true,
        bar1: { attribute: "tracked.hp.system", },
        bar2: { attribute: "tracked.mp.system", },
        displayBars: 40,
        displayName: 50,
        disposition: -1,
        texture: {
          src: actorImage
        }
      }
    });
    console.log("Actor", actor.name);
  });
}

getActors();
