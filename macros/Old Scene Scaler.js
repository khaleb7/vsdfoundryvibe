// set the factor to the value you want
const factor = 1;
if (factor == 1) return ui.notifications.error(`A scaling of 1 is pointless.`);

const scene = game.scenes.active;
if (!scene) return ui.notifications.error(`There is no active scene.`);

let d = new Dialog({
    title: "Scale the Active Scene",
    content: `<p>You are about to scale ${scene.name} by a factor of ${factor}<p>`,
    buttons: {
        one: {
            icon: '<i class="fas fa-check"></i>',
            label: "Scale",
            callback: async () => {

                const data = {
                    grid: {
                        distance: scene.grid.distance * factor,
                        size: scene.grid.size * factor
                    },
                    width: scene.width * factor,
                    height: scene.height * factor,
                    initial: {
                        x: scene.initial.x * factor,
                        y: scene.initial.y * factor
                    }
                };
                if (factor > 1) await scene.update(data);

                for (const wall of scene.walls.values()) {
                    await wall.update({
                        c: [
                            wall.c[0] * factor,
                            wall.c[1] * factor,
                            wall.c[2] * factor,
                            wall.c[3] * factor
                        ]
                    });
                }
                ui.notifications.info(`${scene.walls.size} walls done.`);

                for (const tile of scene.tiles.values()) {
                    await tile.update({
                        x: tile.x * factor,
                        y: tile.y * factor,
                        width: tile.width * factor,
                        height: tile.height * factor
                    });
                }
                ui.notifications.info(`${scene.tiles.size} tiles done.`);

                for (const drawing of scene.drawings.values()) {
                    await drawing.update({
                        x: drawing.x * factor,
                        y: drawing.y * factor,
                        shape: {
                            width: drawing.shape.width * factor,
                            height: drawing.shape.height * factor
                        }
                    });
                }
                ui.notifications.info(`${scene.drawings.size} drawings done.`);

                for (const note of scene.notes.values()) {
                    await note.update({
                        x: note.x * factor,
                        y: note.y * factor,
                        iconSize: note.iconSize * factor
                    });
                }
                ui.notifications.info(`${scene.notes.size} notes done.`);

                for (const light of scene.lights.values()) {
                    await light.update({
                        x: light.x * factor,
                        y: light.y * factor
                    });
                }
                ui.notifications.info(`${scene.lights.size} lights done.`);

                for (const sound of scene.sounds.values()) {
                    await sound.update({
                        x: sound.x * factor,
                        y: sound.y * factor
                    });
                }
                ui.notifications.info(`${scene.sounds.size} sounds done.`);

                for (const token of scene.tokens.values()) {
                    await token.update({
                        x: token.x * factor,
                        y: token.y * factor,
                        width: token.width * factor,
                        height: token.height * factor
                    });
                }
                ui.notifications.info(`${scene.tokens.size} tokens done.`);

                if (factor < 1) await scene.update(data);

                ui.notifications.info("Finished");
            }
        },
        two: {
            icon: '<i class="fas fa-times"></i>',
            label: "Cancel",
            close: () => { }
        }
    },
    default: "two"
});
d.render(true);

