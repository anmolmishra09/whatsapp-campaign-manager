/**
 * Excel / CSV Processing Pipeline using local SheetJS
 */
class ExcelContactImporter {
  constructor() {
    this.parsedContacts = [];
    this.duplicates = [];
    this.invalidRows = [];
  }

  async parseFile(file, defaultPrefix = '91') {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array', raw: false });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

          if (!rows || rows.length < 2) {
            return reject(new Error('Spreadsheet appears to be empty or lacks header rows.'));
          }

          const headers = rows[0].map(h => String(h).trim().toLowerCase());
          const phoneIndex = this.locatePhoneColumn(headers);

          if (phoneIndex === -1) {
            return reject(new Error('Could not identify a Phone Number column. Headers must include phone, mobile, or contact.'));
          }

          const nameIndex = headers.findIndex(h => h.includes('name'));
          const companyIndex = headers.findIndex(h => h.includes('company') || h.includes('organization'));

          this.parsedContacts = [];
          this.duplicates = [];
          this.invalidRows = [];
          const seenNumbers = new Set();

          for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            const rawPhone = row[phoneIndex];
            if (!rawPhone) continue; // Skip blank rows

            const name = nameIndex !== -1 ? String(row[nameIndex]).trim() : '';
            const company = companyIndex !== -1 ? String(row[companyIndex]).trim() : '';

            const validation = PhoneValidator.normalize(rawPhone, defaultPrefix);

            if (!validation.isValid) {
              this.invalidRows.push({ rowNumber: i + 1, name, rawPhone, reason: validation.error });
            } else if (seenNumbers.has(validation.normalized)) {
              this.duplicates.push({ rowNumber: i + 1, name, phone: validation.normalized });
            } else {
              seenNumbers.add(validation.normalized);
              this.parsedContacts.push({
                rowNumber: i + 1,
                name: name || 'Valued Customer',
                phone: validation.normalized,
                company: company || '',
                isValid: true
              });
            }
          }

          resolve({
            valid: this.parsedContacts,
            duplicates: this.duplicates,
            invalid: this.invalidRows
          });
        } catch (err) {
          reject(new Error(`Failed to parse spreadsheet: ${err.message}`));
        }
      };

      reader.onerror = () => reject(new Error('Disk error reading file.'));
      reader.readAsArrayBuffer(file);
    });
  }

  locatePhoneColumn(headers) {
    const candidates = ['phone', 'mobile', 'whatsapp', 'contact', 'telephone', 'number', 'phone number'];
    return headers.findIndex(header => candidates.some(c => header.includes(c)));
  }
}

window.ExcelContactImporter = ExcelContactImporter;