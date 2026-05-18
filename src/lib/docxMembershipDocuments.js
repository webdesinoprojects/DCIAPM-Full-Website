import certificateTemplateUrl from '../assets/user-docs/Certificate_Format.docx?url';
import receiptTemplateUrl from '../assets/user-docs/Receipt Format.docx?url';

const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

export async function createMembershipReceiptDocx(application, fileName) {
  const entries = await readDocxTemplate(receiptTemplateUrl);
  const documentEntry = getDocumentEntry(entries, 'receipt');
  const documentXml = new TextDecoder().decode(documentEntry.data);
  documentEntry.data = textBytes(replaceReceiptFields(documentXml, application));
  return new File([zipStored(entries)], fileName, { type: DOCX_MIME });
}

export async function createMembershipCertificateDocx(application, fileName) {
  const entries = await readDocxTemplate(certificateTemplateUrl);
  const documentEntry = getDocumentEntry(entries, 'certificate');
  const documentXml = new TextDecoder().decode(documentEntry.data);
  const memberLabel = `${application.applicant_name || '-'} (${application.membership_number || '-'})`.toUpperCase();
  documentEntry.data = textBytes(replaceTextRunRange(
    documentXml,
    /<w:t>Name \(membership number\)<\/w:t>/,
    `<w:t>${escapeXml(memberLabel)}</w:t>`,
    'Certificate template placeholder was not found.',
  ));
  return new File([zipStored(entries)], fileName, { type: DOCX_MIME });
}

function replaceReceiptFields(documentXml, application) {
  const approvedDate = application.approved_at ? new Date(application.approved_at) : new Date();
  const dateLabel = formatDocumentDate(approvedDate);
  const amount = application.amount_label || `${application.amount_paid || ''} ${application.currency || ''}`.trim() || '-';
  const billNumber = application.bill_number || application.membership_number || '-';
  const applicantName = application.applicant_name || '-';
  const transaction = application.transaction_details || '-';
  const membershipType = application.membership_type_label || 'Membership';

  let xml = replaceTextRunRange(
    documentXml,
    /<w:t>Bill No: 0001\/<\/w:t>[\s\S]*?<w:t>6<\/w:t>/,
    `<w:t>${escapeXml(`Bill No: ${billNumber}`)}</w:t>`,
    'Receipt bill number placeholder was not found.',
  );

  const receiptLines = [
    `This is to certify that a total sum of INR/ USD ${amount} has been received from`,
    `${applicantName}, in Cash/ by Cheque number ______________, dated__________, or via Online transfer`,
    `No ${transaction}, dated ${dateLabel}, on account of his/ her application`,
    `for ${membershipType} application.`,
  ];

  xml = replaceTextRunRange(
    xml,
    /<w:t>This is to certify that a total sum of INR\/ USD[\s\S]*?Membership application\. <\/w:t>/,
    textLinesInsideCurrentRun(receiptLines),
    'Receipt body placeholder was not found.',
  );

  return replaceTextRunRange(
    xml,
    /<w:t>Dated ___<\/w:t>[\s\S]*?<w:t>_______<\/w:t>/,
    `<w:t>${escapeXml(`Dated ${dateLabel}`)}</w:t>`,
    'Receipt date placeholder was not found.',
  );
}

function getDocumentEntry(entries, label) {
  const documentEntry = entries.find((entry) => entry.name === 'word/document.xml');
  if (!documentEntry) throw new Error(`${label} template is missing document.xml.`);
  return documentEntry;
}

function replaceTextRunRange(documentXml, pattern, replacement, errorMessage) {
  if (!pattern.test(documentXml)) throw new Error(errorMessage);
  return documentXml.replace(pattern, replacement);
}

function textLinesInsideCurrentRun(lines) {
  return lines.map((line, index) => {
    const text = `<w:t>${escapeXml(line)}</w:t>`;
    if (index === 0) return text;
    return `</w:r><w:r><w:br/></w:r><w:r>${text}`;
  }).join('');
}

async function readDocxTemplate(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error('Unable to load document template.');
  return unzip(await response.arrayBuffer());
}

async function unzip(arrayBuffer) {
  const bytes = new Uint8Array(arrayBuffer);
  const view = new DataView(arrayBuffer);
  const endOffset = findEndOfCentralDirectory(bytes);
  const entryCount = view.getUint16(endOffset + 10, true);
  const centralOffset = view.getUint32(endOffset + 16, true);
  const entries = [];
  let offset = centralOffset;

  for (let index = 0; index < entryCount; index += 1) {
    if (view.getUint32(offset, true) !== 0x02014b50) throw new Error('Invalid DOCX central directory.');
    const method = view.getUint16(offset + 10, true);
    const compressedSize = view.getUint32(offset + 20, true);
    const nameLength = view.getUint16(offset + 28, true);
    const extraLength = view.getUint16(offset + 30, true);
    const commentLength = view.getUint16(offset + 32, true);
    const localOffset = view.getUint32(offset + 42, true);
    const name = new TextDecoder().decode(bytes.slice(offset + 46, offset + 46 + nameLength));
    const localNameLength = view.getUint16(localOffset + 26, true);
    const localExtraLength = view.getUint16(localOffset + 28, true);
    const dataOffset = localOffset + 30 + localNameLength + localExtraLength;
    const compressed = bytes.slice(dataOffset, dataOffset + compressedSize);
    const data = method === 0 ? compressed : await inflateRaw(compressed);
    entries.push({ name, data });
    offset += 46 + nameLength + extraLength + commentLength;
  }

  return entries;
}

function findEndOfCentralDirectory(bytes) {
  for (let offset = bytes.length - 22; offset >= 0; offset -= 1) {
    if (
      bytes[offset] === 0x50
      && bytes[offset + 1] === 0x4b
      && bytes[offset + 2] === 0x05
      && bytes[offset + 3] === 0x06
    ) {
      return offset;
    }
  }
  throw new Error('Invalid DOCX package.');
}

async function inflateRaw(bytes) {
  if (typeof DecompressionStream === 'undefined') {
    throw new Error('This browser cannot process the DOCX template.');
  }

  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

function formatDocumentDate(value) {
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(value);
}

function escapeXml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function textBytes(value) {
  return new TextEncoder().encode(value);
}

function zipStored(entries) {
  const localParts = [];
  const centralParts = [];
  let offset = 0;

  for (const entry of entries) {
    const nameBytes = textBytes(entry.name);
    const data = entry.data instanceof Uint8Array ? entry.data : new Uint8Array(entry.data);
    const crc = crc32(data);
    const localHeader = new Uint8Array(30 + nameBytes.length);
    const localView = new DataView(localHeader.buffer);
    writeZipHeader(localView, {
      signature: 0x04034b50,
      versionNeeded: 20,
      flags: 0x0800,
      method: 0,
      crc,
      size: data.length,
      nameLength: nameBytes.length,
    });
    localHeader.set(nameBytes, 30);
    localParts.push(localHeader, data);

    const centralHeader = new Uint8Array(46 + nameBytes.length);
    const centralView = new DataView(centralHeader.buffer);
    writeZipHeader(centralView, {
      signature: 0x02014b50,
      versionMade: 20,
      versionNeeded: 20,
      flags: 0x0800,
      method: 0,
      crc,
      size: data.length,
      nameLength: nameBytes.length,
      offset,
      central: true,
    });
    centralHeader.set(nameBytes, 46);
    centralParts.push(centralHeader);
    offset += localHeader.length + data.length;
  }

  const centralOffset = offset;
  const centralSize = centralParts.reduce((sum, part) => sum + part.length, 0);
  const end = new Uint8Array(22);
  const endView = new DataView(end.buffer);
  endView.setUint32(0, 0x06054b50, true);
  endView.setUint16(8, entries.length, true);
  endView.setUint16(10, entries.length, true);
  endView.setUint32(12, centralSize, true);
  endView.setUint32(16, centralOffset, true);

  return new Blob([...localParts, ...centralParts, end], { type: DOCX_MIME });
}

function writeZipHeader(view, options) {
  const dateTime = dosDateTime(new Date());
  view.setUint32(0, options.signature, true);
  if (options.central) {
    view.setUint16(4, options.versionMade, true);
    view.setUint16(6, options.versionNeeded, true);
    view.setUint16(8, options.flags, true);
    view.setUint16(10, options.method, true);
    view.setUint16(12, dateTime.time, true);
    view.setUint16(14, dateTime.date, true);
    view.setUint32(16, options.crc, true);
    view.setUint32(20, options.size, true);
    view.setUint32(24, options.size, true);
    view.setUint16(28, options.nameLength, true);
    view.setUint32(42, options.offset, true);
    return;
  }

  view.setUint16(4, options.versionNeeded, true);
  view.setUint16(6, options.flags, true);
  view.setUint16(8, options.method, true);
  view.setUint16(10, dateTime.time, true);
  view.setUint16(12, dateTime.date, true);
  view.setUint32(14, options.crc, true);
  view.setUint32(18, options.size, true);
  view.setUint32(22, options.size, true);
  view.setUint16(26, options.nameLength, true);
}

function dosDateTime(date) {
  const year = Math.max(date.getFullYear(), 1980);
  return {
    time: (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2),
    date: ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate(),
  };
}

function crc32(data) {
  let crc = 0xffffffff;
  for (let index = 0; index < data.length; index += 1) {
    crc = CRC_TABLE[(crc ^ data[index]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let index = 0; index < 256; index += 1) {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) {
      value = (value & 1) ? (0xedb88320 ^ (value >>> 1)) : (value >>> 1);
    }
    table[index] = value >>> 0;
  }
  return table;
})();
