const { diffWords } = require('diff');

// Returns structured word-level diff tokens the frontend can render directly.
// Each token: { value, added?, removed? }
function wordDiff(oldText, newText) {
  const parts = diffWords(oldText || '', newText || '');
  return parts.map((p) => ({
    value: p.value,
    added: !!p.added,
    removed: !!p.removed,
  }));
}

module.exports = { wordDiff };
