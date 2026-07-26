import { BaseActorSheet } from "./baseActor-sheet.js";

/**
 * PDF-style form-fillable character sheet for Against the Darkmaster PCs.
 * Reuses BaseActorSheet context, item inputs, and rollmacro plumbing.
 * @extends {BaseActorSheet}
 */
export class ActorVsDFormSheet extends BaseActorSheet {

  static DEFAULT_OPTIONS = {
    classes: ["vsd", "sheet", "actor", "vsd-form-sheet"],
    tag: "form",
    position: { width: 980, height: 900 },
    form: { submitOnChange: true, closeOnSubmit: false },
    window: { resizable: true },
    actions: {}
  };

  static PARTS = {
    body: {
      template: "systems/vsd/templates/actor/actorVsDForm-sheet.hbs",
      scrollable: [".sheet-body"]
    }
  };
}
