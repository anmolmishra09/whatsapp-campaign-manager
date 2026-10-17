/**
 * Real-time Message Composer, Placeholder Substitution & Preview
 */
class MessageComposer {
  constructor() {
    this.editor = document.getElementById('messageEditor');
    this.charCounter = document.getElementById('charCounter');
    this.bubbleText = document.getElementById('bubbleTextPreview');
    this.bubbleTime = document.getElementById('bubbleTime');
    this.placeholderButtons = document.querySelectorAll('.insert-placeholder');

    this.init();
  }

  init() {
    this.editor.addEventListener('input', () => this.updateLivePreview());
    this.placeholderButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const placeholder = e.target.getAttribute('data-val');
        this.insertAtCursor(placeholder);
      });
    });
    this.updateClock();
  }

  insertAtCursor(text) {
    const start = this.editor.selectionStart;
    const end = this.editor.selectionEnd;
    const current = this.editor.value;
    this.editor.value = current.substring(0, start) + text + current.substring(end);
    this.editor.focus();
    this.editor.selectionEnd = start + text.length;
    this.updateLivePreview();
  }

  updateLivePreview() {
    const text = this.editor.value;
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    this.charCounter.innerText = `${text.length} chars | ${words} words`;

    if (!text.trim()) {
      this.bubbleText.innerText = 'Awaiting message input...';
      return;
    }

    // Render client preview with mock placeholders replaced
    let preview = text
      .replace(/{{name}}/g, 'Alex Mercer')
      .replace(/{{phone}}/g, '+918787222966')
      .replace(/{{company}}/g, 'Acme Corp');

    this.bubbleText.innerText = preview;
  }

  updateClock() {
    const now = new Date();
    this.bubbleTime.innerText = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  getMessage() {
    return this.editor.value;
  }
}

window.MessageComposer = MessageComposer;