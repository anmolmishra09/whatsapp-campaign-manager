/**
 * PDF Document Upload & Validation Component
 */
class PDFUploader {
  constructor() {
    this.dropZone = document.getElementById('pdfDropZone');
    this.fileInput = document.getElementById('pdfFileInput');
    this.fileMeta = document.getElementById('pdfFileMeta');
    this.bubbleDocPreview = document.getElementById('bubbleDocPreview');
    this.selectedFile = null;

    this.init();
  }

  init() {
    this.dropZone.addEventListener('click', () => this.fileInput.click());
    this.fileInput.addEventListener('change', (e) => this.handleFiles(e.target.files));

    ['dragover', 'dragenter'].forEach(event => {
      this.dropZone.addEventListener(event, (e) => {
        e.preventDefault();
        this.dropZone.classList.add('dragover');
      });
    });

    ['dragleave', 'drop'].forEach(event => {
      this.dropZone.addEventListener(event, (e) => {
        e.preventDefault();
        this.dropZone.classList.remove('dragover');
      });
    });

    this.dropZone.addEventListener('drop', (e) => {
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        this.handleFiles(e.dataTransfer.files);
      }
    });
  }

  handleFiles(files) {
    if (!files || files.length === 0) return;
    const file = files[0];

    if (file.type !== 'application/pdf') {
      alert('Strict Policy Violation: Only valid PDF documents are allowed.');
      return;
    }

    // Maximum 100MB limit
    if (file.size > 104857600) {
      alert('Selected file exceeds maximum allowable limit of 100MB.');
      return;
    }

    this.selectedFile = file;
    const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
    this.fileMeta.innerText = `Selected: ${file.name} (${sizeMb} MB)`;
    this.bubbleDocPreview.innerText = `📄 ${file.name}`;
    this.bubbleDocPreview.style.display = 'block';
  }

  getFile() {
    return this.selectedFile;
  }
}

window.PDFUploader = PDFUploader;