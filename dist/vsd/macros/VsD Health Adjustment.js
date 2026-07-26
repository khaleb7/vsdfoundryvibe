// Open a dialog to roll a selected type of Health Adjustment

let applyChanges = false;
new Dialog({
    title: `Health Adjustment Rolls`,
    content: `
<form>
    <div class="form-group">
        <label>Rollable Expression:</label>
        <input type="text" id="roll-expr" name="roll-expr" value="1d10">
    </div>
    <div class="form-group">
        <label>Adjustment Type:</label>
        <select id="adj-type" name="adj-type">
            <option value="damage">Damage</option>
            <option value="healing">Healing</option>
            <option value="soul-damage">Soul Damage</option>
        </select>
    </div>
</form>
    `,
    buttons: {
        yes: {
            icon: "<i class='fas fa-check'></i>",
            label: `Roll`,
            callback: () => applyChanges = true
        },
        no: {
            icon: "<i class='fas fa-times'></i>",
            label: `Cancel`
        },
    },
    default: "yes",
    close: async html => {
        if (applyChanges) {
            const expr = html.find('[name="roll-expr"]')[0].value || "1d10";
            if (expr == "") return;
            const roll = await new Roll(expr).evaluate();
            const type = html.find('[name="adj-type"]')[0].value || "none";
            let message = `<p>Drag <b>${type}</b> onto a token or sheet.</p>`;
            switch (type) {
                case "damage":
                    message += `<p class="damageresult" style="font-size:larger;" data-type="damage" data-hits="${roll.total}"><b>${roll.total}</b> hits</p>`;
                    break;
                case "healing":
                    message += `<p class="damageresult" style="color:#4f4;font-size:larger;" data-type="healing" data-hits="${roll.total}"><b>${roll.total}</b> hits</p>`;
                    break;
                case "soul-damage":
                    message += `<p class="damageresult" style="color:#f44;font-size:larger;" data-type="souldamage" data-hits="${roll.total}"><b>${roll.total}</b> hits</p>`;
                    break;
                default:
                    break;
            }
            // Update Token
            console.debug(`Generating ${roll.total} points of ${type}.`);
            roll.toMessage({
                flavor: message,
                flags: { hideMessageContent: true }
            });
        }
    }
}).render(true);