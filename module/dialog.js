/**
 * Dialog helper compatible with AppV1 Dialog (available through Foundry V16 deprecation window).
 * Uses a DOM-safe element accessor for V13+ where element may be HTMLElement or jQuery.
 */
export class MyDialog extends (foundry.appv1?.api?.Dialog ?? globalThis.Dialog) {

  /** @returns {HTMLElement} */
  get rootElement() {
    const el = this.element;
    if (!el) return null;
    return el.jquery ? el[0] : el;
  }

  /**
   * @override
   * Handle a keydown event while the dialog is active
   * @param {KeyboardEvent} event   The keydown event
   * @private
   */
  _onKeyDown(event) {
    const dialog = this.rootElement;
    if (!dialog) return;

    // Cycle Options
    if (event.key === "Tab" || event.key === "Enter") {
      // If we are already focused on the Dialog, let the default browser behavior take over
      if (dialog.contains(document.activeElement)) return;

      // If we aren't focused on the dialog, bring focus to one of its buttons
      event.preventDefault();
      event.stopPropagation();
      const dialogButtons = Array.from(dialog.querySelectorAll(".dialog-button"));
      const targetButton = event.shiftKey ? dialogButtons.pop() : dialogButtons.shift();
      targetButton?.focus();
    }

    // Close dialog
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      return this.close();
    }
  }
}
