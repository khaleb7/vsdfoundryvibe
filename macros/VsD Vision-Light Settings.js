// Open a dialog for quickly changing token vision parameters of the controlled tokens.

if (canvas.tokens.controlled.length === 0)
    return ui.notifications.error("Please select a token first");

let applyChanges = false;
new Dialog({
    title: `Lighting Configuration`,
    content: `
<form>
    <div class="form-group">
        <label>Light Conditions:</label>
        <select id="light-conditions" name="light-conditions">
            <option value="nochange">No Change</option>
            <option value="dark">Darkness</option>
            <option value="star">Starlight</option>
            <option value="moon">Moonlight</option>
            <option value="dim3">Dim Light (3 m)</option>
            <option value="dim6">Dim Light (6 m)</option>
            <option value="dim9">Dim Light (9 m)</option>
            <option value="dim12">Dim Light (12 m)</option>
            <option value="bright6">Bright Light (6 m)</option>
            <option value="bright12">Bright Light (12 m)</option>
            <option value="bright18">Bright Light (18 m)</option>
            <option value="bright24">Bright Light (24 m)</option>
        </select>
    </div>
    <div class="form-group">
        <label>Light Source:</label>
        <select id="light-source" name="light-source">
            <option value="nochange">No Change</option>
            <option value="none">None</option>
            <option value="hooded-dim">Lantern (Hooded - Dim)</option>
            <option value="candle">Candle</option>
            <option value="light">Light (Cantrip)</option>
            <option value="torch">Torch</option>
            <option value="lamp">Lamp</option>
            <option value="hooded-bright">Lantern (Hooded - Bright)</option>
            <option value="bullseye">Lantern (Bullseye)</option>
        </select>
    </div>
</form>
    `,
    buttons: {
        yes: {
            icon: "<i class='fas fa-check'></i>",
            label: `Apply Changes`,
            callback: () => applyChanges = true
        },
        no: {
            icon: "<i class='fas fa-times'></i>",
            label: `Cancel Changes`
        },
    },
    default: "yes",
    close: html => {
        if (applyChanges) {
            for (const token of canvas.tokens.controlled) {
                const visionType = token.document.actor?.system.dynamic.visionType || "normal";
                const lightConditions = html.find('[name="light-conditions"]')[0].value || "none";
                const lightSource = html.find('[name="light-source"]')[0].value || "none";
                const updata = {
                    sightrange: 0,
                    dimlight: 0,
                    brightlight: 0,
                    lightangle: 360,
                    lockrotation: token.document.lockRotation
                }
                // Get Vision Type Values
                switch (visionType) {
                    case "normal":
                        switch (lightConditions) {
                            case "dark": {
                                updata.sightrange = 1;
                                break;
                            }
                            case "star":
                            case "moon":
                            case "dim3": {
                                updata.sightrange = 3;
                                break;
                            }
                            case "dim6": {
                                updata.sightrange = 6;
                                break;
                            }
                            case "dim9": {
                                updata.sightrange = 9;
                                break;
                            }
                            case "dim12": {
                                updata.sightrange = 12;
                                break;
                            }
                            case "bright6": {
                                updata.sightrange = 12;
                                break;
                            }
                            case "bright12": {
                                updata.sightrange = 24;
                                break;
                            }
                            case "bright18": {
                                updata.sightrange = 36;
                                break;
                            }
                            case "bright24": {
                                updata.sightrange = 48;
                                break;
                            }
                            default: {
                                updata.sightrange = token.document.sight.range;
                            }
                        }
                        break;
                    case "Star Sight":
                    case "Keen Senses":
                        switch (lightConditions) {
                            case "dark": {
                                updata.sightrange = 1;
                                break;
                            }
                            case "dim3":
                            case "dim6":
                            case "dim9":
                            case "dim12": {
                                updata.sightrange = 30;
                                break;
                            }
                            case "star":
                            case "moon":
                            case "bright6":
                            case "bright12":
                            case "bright18":
                            case "bright24": {
                                updata.sightrange = 240;
                                break;
                            }
                            default: {
                                updata.sightrange = token.document.sight.range;
                            }
                        }
                        break;
                    case "Dark Sight":
                        switch (lightConditions) {
                            case "dark": {
                                updata.sightrange = 3;
                                break;
                            }
                            case "star":
                            case "moon":
                            case "dim3":
                            case "dim6":
                            case "dim9":
                            case "dim12": {
                                updata.sightrange = 30;
                                break;
                            }
                            case "bright6": {
                                updata.sightrange = 24;
                                break;
                            }
                            case "bright12": {
                                updata.sightrange = 48;
                                break;
                            }
                            case "bright18": {
                                updata.sightrange = 72;
                                break;
                            }
                            case "bright24": {
                                updata.sightrange = 96;
                                break;
                            }
                            default: {
                                updata.sightrange = token.document.sight.range;
                            }
                        }
                        break;
                    case "Night Sight":
                        switch (lightConditions) {
                            case "dark": {
                                updata.sightrange = 3;
                                break;
                            }
                            case "dim3":
                            case "dim6":
                            case "dim9":
                            case "dim12": {
                                updata.sightrange = 30;
                                break;
                            }
                            case "star":
                            case "moon":
                            case "bright6":
                            case "bright12":
                            case "bright18":
                            case "bright24": {
                                updata.sightrange = 240;
                                break;
                            }
                            default: {
                                updata.sightrange = token.document.sight.range;
                            }
                        }
                        break;
                    case "Darkvision":
                        updata.sightrange = 240;
                        break;
                }
                // Get Light Source Values
                switch (lightSource) {
                    case "none":
                        updata.dimlight = 0;
                        updata.brightlight = 0;
                        break;
                    case "hooded-dim":
                        updata.dimlight = 1.5;
                        updata.brightlight = 0;
                        break;
                    case "candle":
                        updata.dimlight = 3;
                        updata.brightlight = 1.5;
                        break;
                    case "light":
                        updata.dimlight = 6;
                        updata.brightlight = 3;
                        break;
                    case "torch":
                        updata.dimlight = 12;
                        updata.brightlight = 6;
                        break;
                    case "lamp":
                        updata.dimlight = 13.5;
                        updata.brightlight = 4.5;
                        break;
                    case "hooded-bright":
                        updata.dimlight = 18;
                        updata.brightlight = 9;
                        break;
                    case "bullseye":
                        updata.dimlight = 36;
                        updata.brightlight = 18;
                        updata.lockrotation = false;
                        updata.lightangle = 52.5;
                        break;
                    case "nochange":
                    default:
                        updata.dimlight = token.document.light.dim;
                        updata.brightlight = token.document.light.bright;
                        updata.lightangle = token.document.light.angle;
                        updata.lockrotation = token.document.lockRotation;
                }
                // Update Token
                console.debug(`Updating Light settings for ${token.document.name} with ${visionType} vision:\n`, updata);
                token.document.update({
                    lockRotation: updata.lockrotation,
                    sight: {
                        enabled: true,
                        range: updata.sightrange
                    },
                    light: {
                        alpha: 0.3,
                        color: "#808040",
                        dim: updata.dimlight,
                        bright: updata.brightlight,
                        angle: updata.lightangle
                    }
                });
            }
        }
    }
}).render(true);