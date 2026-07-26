/**
 * 1. Select the target actors folder.
 * 2. Select the target items folder.
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
                getItems(actors);
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

async function getItems(actors) {

    if (actors.length == 0) {
        ui.notifications.error("Please select a folder with actors");
        return;
    }
    const itemFolders = game.collections.get("Folder").filter(c => { return c.type == "Item" });
    const buttons = {};
    for (const button of itemFolders) {
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
        title: `Select the folder with the Items to Copy/Update`,
        buttons: buttons,
        close: async html => {
            if (applyChanges) {
                const items = itemFolders.find(folder => folder.name == label).contents;
                main(items, actors);
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

async function main(items, actors) {
    actors.forEach(async function (actor) {
        const olditems = [];
        items.forEach(function (baditem) {
            // if there is an item of this name and type, delete it
            const existing = actor.items.filter(item => item.name == baditem.name);
            while (existing[0]) {
                const current = existing.pop();
                if (current.type == baditem.type)
                    olditems.push(current.id)
            }
        });
        await actor.deleteEmbeddedDocuments('Item', olditems);
        console.log(`Deleted ${olditems.length} items on ${actor.name}.`);
    });
    ui.notifications.info(`Deletions completed successfully.`);

}
getActors();