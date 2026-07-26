/**
 * Each field is a comma-separated list of the things you want
 * to include in the result. It matches against the text you
 * enter, so a category of "s" will match skill, spell and rms.
 *
 * type: may be any of {Primary, Melee, Ranged, 
 * Attack, Rollable, Defence}
 *
 * category: applies only to:
 * Rollable: {check, skill, spell, technique, rms} and
 * Defence: {dodge, parry, block}
 * and may be used without specifying the type.
 *
 * group: is a user-defined field for use in filtering
 * this result.
 *
 * Target: Any case-sensitive portion of the item name.
*/

let data = {
    position: {
        width: 300,
        top: 100,
        left: 100
    },
    type: "Modifier",
    category: "",
    group: "Action",
    target: "",
};

if (canvas.tokens.controlled.length != 1)
    return ui.notifications.error("Please select a single token first");

const actor = canvas.tokens.controlled[0].actor;

const rollables = actor.data.items
    .filter(function (item) {
        if (data.target != "") {
            const cases = data.target.split(",").map((word) => word.trim());
            if (!cases.some((target) => item.name.includes(target))) return null;
        }
        if (data.group != "") {
            const cases = data.group.split(",").map((word) => word.trim());
            if (!cases.some((target) => item.data.data.group.includes(target)))
                return null;
        }
        if (data.category != "") {
            const cases = data.category
                .split(",")
                .map((word) => word.trim());
            if (
                !cases.some((target) => item.data.data.category?.includes(target))
            )
                return null;
        } else {
            const cases = data.type.split(",").map((word) => word.trim());
            if (!cases.some((target) => item.data.type.includes(target)))
                return null;
        }
        return item;
    })
    .map((item) => item.data);

switch (rollables.length) {
    case 0:
        ui.notifications.error("Your rollmacro call produced no results");
        break;
    default: // provide the choice of results
        console.log(`Items to delete?\n`, rollables);
        break;
}
let content = `<p>You have chosen to delete these items from ${actor.name}:<p><ul>`;
const itemIDs = [];
for (const item of rollables) {
    content += `<li>${item.type}, named: ${item.name}</li>`;
    itemIDs.push(item._id);
}
content += "</ul>";

let d = new Dialog({
    title: "Delete Token Items",
    content: content,
    buttons: {
        one: {
            icon: '<i class="fas fa-check"></i>',
            label: "Delete",
            callback: () => {
                actor.deleteEmbeddedDocuments("Item", itemIDs);
            }
        },
        two: {
            icon: '<i class="fas fa-times"></i>',
            label: "Cancel",
            callback: () => console.debug("Chose Two")
        }
    },
    default: "two",
    render: html => console.debug("Register interactivity in the rendered dialog"),
    close: html => console.debug("This always is logged no matter which option is chosen")
});
d.render(true);