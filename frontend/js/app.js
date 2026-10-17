/**
 * Application Lifecycle Coordinator
 */
document.addEventListener('DOMContentLoaded', () => {
  const importer = new ExcelContactImporter();
  const composer = new MessageComposer();
  const uploader = new PDFUploader();

  // Navigation Logic
  const navButtons = document.querySelectorAll('.sidebar-nav button');
  const views = document.querySelectorAll('.page-view');
  const pageTitle = document.getElementById('pageTitle');

  navButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      navButtons.forEach(b => b.parentElement.classList.remove('active'));
      views.forEach(v => v.classList.remove('active'));

      btn.parentElement.classList.add('active');
      const target = btn.getAttribute('data-target');
      document.getElementById(target).classList.add('active');
      pageTitle.innerText = btn.innerText;

      if (target === 'view-history') loadHistory();
      if (target === 'view-contacts') loadSuppressions();
    });
  });

  // Theme Toggle
  const themeBtn = document.getElementById('themeToggleBtn');
  themeBtn.addEventListener('click', () => {
    const root = document.documentElement;
    const current = root.getAttribute('data-theme');
    root.setAttribute('data-theme', current === 'light' ? 'dark' : 'light');
  });

  // Dispatch Mode Adjuster
  const dispatchMode = document.getElementById('dispatchModeSelect');
  const pdfWrapper = document.getElementById('pdfUploadWrapper');
  const textWrapper = document.getElementById('textMessageWrapper');

  dispatchMode.addEventListener('change', () => {
    const val = dispatchMode.value;
    pdfWrapper.style.display = (val === 'pdf_only' || val === 'text_with_pdf') ? 'block' : 'none';
    textWrapper.style.display = (val === 'pdf_only') ? 'none' : 'block';
  });

  // Contact File Import Handler
  const excelDropZone = document.getElementById('excelDropZone');
  const excelFileInput = document.getElementById('excelFileInput');
  const excelFileMeta = document.getElementById('excelFileMeta');
  const countryPrefixSelect = document.getElementById('countryPrefixSelect');
  let currentValidContacts = [];

  excelDropZone.addEventListener('click', () => excelFileInput.click());
  excelFileInput.addEventListener('change', async (e) => {
    if (e.target.files.length === 0) return;
    const file = e.target.files[0];
    excelFileMeta.innerText = `Processing: ${file.name}...`;

    try {
      const results = await importer.parseFile(file, countryPrefixSelect.value);
      excelFileMeta.innerText = `${file.name} parsed successfully.`;
      currentValidContacts = results.valid;

      document.getElementById('countValid').innerText = results.valid.length;
      document.getElementById('countDuplicates').innerText = results.duplicates.length;
      document.getElementById('countInvalid').innerText = results.invalid.length;

      // Populate preview table
      const tbody = document.getElementById('contactTableBody');
      tbody.innerHTML = '';
      results.valid.slice(0, 100).forEach((c, idx) => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${idx + 1}</td>
          <td>${c.name}</td>
          <td>${c.phone}</td>
          <td><span class="badge badge-valid">Valid</span></td>
        `;
        tbody.appendChild(row);
      });

      checkReadiness();
    } catch (err) {
      alert(err.message);
      excelFileMeta.innerText = 'Upload failed.';
    }
  });

  // Consent & Validation State
  const consentBox = document.getElementById('consentConfirmation');
  const launchBtn = document.getElementById('launchCampaignBtn');

  consentBox.addEventListener('change', checkReadiness);

  function checkReadiness() {
    const isReady = currentValidContacts.length > 0 && consentBox.checked;
    launchBtn.disabled = !isReady;
  }

  // Launch Flow & Modal
  const modal = document.getElementById('campaignReviewModal');
  const cancelBtn = document.getElementById('cancelReviewBtn');
  const confirmBtn = document.getElementById('confirmDispatchBtn');

  launchBtn.addEventListener('click', () => {
    document.getElementById('reviewRecipientCount').innerText = currentValidContacts.length;
    modal.style.display = 'flex';
  });

  cancelBtn.addEventListener('click', () => {
    modal.style.display = 'none';
  });

  confirmBtn.addEventListener('click', async () => {
    confirmBtn.disabled = true;
    confirmBtn.innerText = 'Initializing Dispatch Queue...';

    const formData = new FormData();
    formData.append('name', `Campaign ${new Date().toISOString()}`);
    formData.append('message_type', dispatchMode.value);
    formData.append('raw_message', composer.getMessage());
    formData.append('recipients', JSON.stringify(currentValidContacts));

    if (uploader.getFile()) {
      formData.append('media_file', uploader.getFile());
    }

    try {
      const res = await API.createCampaign(formData);
      alert(`Campaign ${res.data.id} successfully initiated and placed on the persistent delivery queue.`);
      modal.style.display = 'none';
      window.location.reload();
    } catch (err) {
      alert(`Dispatch Error: ${err.message}`);
    } finally {
      confirmBtn.disabled = false;
      confirmBtn.innerText = 'Confirm & Dispatch';
    }
  });

  // Verify Sender Connectivity
  async function checkBackendSender() {
    const badgeText = document.getElementById('senderStatusText');
    try {
      const res = await API.getSenderStatus();
      if (res.data.status === 'verified') {
        badgeText.innerText = `Verified: ${res.data.phone_number} (ID: ${res.data.phone_number_id})`;
      } else {
        badgeText.innerText = 'Sender ID Missing / Not Verified in Meta';
        badgeText.parentElement.style.color = 'var(--accent-orange)';
      }
    } catch (e) {
      badgeText.innerText = 'Offline: Start Backend Server';
      badgeText.parentElement.style.color = 'var(--accent-red)';
    }
  }

  checkBackendSender();
});a