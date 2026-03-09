/** Read the full document body as plain text. */
export async function getDocumentText(): Promise<string> {
  return Word.run(async (context) => {
    const body = context.document.body;
    body.load('text');
    await context.sync();
    return body.text;
  });
}

/** Read the currently selected text. */
export async function getSelectedText(): Promise<string> {
  return Word.run(async (context) => {
    const selection = context.document.getSelection();
    selection.load('text');
    await context.sync();
    return selection.text;
  });
}

/** Replace the current selection with new text. */
export async function replaceSelection(newText: string): Promise<void> {
  return Word.run(async (context) => {
    const selection = context.document.getSelection();
    selection.insertText(newText, Word.InsertLocation.replace);
    await context.sync();
  });
}

/** Get the document title (from document properties, fallback to 'Document'). */
export async function getDocumentTitle(): Promise<string> {
  try {
    return await Word.run(async (context) => {
      const properties = context.document.properties;
      properties.load('title');
      await context.sync();
      return properties.title || 'Document';
    });
  } catch {
    return 'Document';
  }
}
