/**
 * Select the target journals folder to be joined into a single Journal of that name.
 */
async function getJournals() {
  const folders = game.collections.get("Folder").filter(c => { return c.type == "JournalEntry" });
  const buttons = {};
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
    title: `Select the target Journals folder`,
    buttons: buttons,
    close: async html => {
      if (applyChanges) {
        const journalfolder = folders.find(folder => folder.name == label);
        mergeJournalFolderIntoSingleJournal(journalfolder);
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
/**
 * Merge all of the Journal pages in a single folder into a new Journal with the same name as the original folder.
 * @param {Folder} folder source folder to merge
 */
async function mergeJournalFolderIntoSingleJournal(folder) {
  const newJournal = await JournalEntry.create({ name: folder.name, folder: folder.folder });
  const pages = [];
  const oldjournals = folder.contents.sort((a, b) => {
    if (a.name < b.name) return -1;
    if (a.name > b.name) return 1;
    return 0;
  });
  for (const journal of oldjournals) {
    for (const page of journal.pages.contents) {
      const pageData = page.toObject();
      delete pageData._id;
      pageData.title = {show: true, level: 1};
      pages.push(pageData);
    };
  };
  newJournal.createEmbeddedDocuments("JournalEntryPage", pages);
}
getJournals();