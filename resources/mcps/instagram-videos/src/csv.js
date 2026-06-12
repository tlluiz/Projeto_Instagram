// CSV utilities — writing and reading compatible with RFC 4180.
// Implemented by hand to avoid depending on external libraries and to
// correctly handle captions that contain commas, quotes and line breaks.

/** Escapes a single value for CSV. */
function escapeField(value) {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (/[",\n\r]/.test(str)) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

/**
 * Serializes an array of objects into CSV text.
 * @param {string[]} columns Column order (also used as the header).
 * @param {object[]} rows Rows to write.
 * @returns {string}
 */
export function toCSV(columns, rows) {
  const lines = [];
  lines.push(columns.map(escapeField).join(','));
  for (const row of rows) {
    lines.push(columns.map((col) => escapeField(row[col])).join(','));
  }
  // A trailing line break helps some tools handle the file.
  return lines.join('\n') + '\n';
}

/**
 * Parses CSV text into an array of objects using the first line as the
 * header. Supports fields with quotes, internal commas and line breaks
 * inside quotes.
 * @param {string} text
 * @returns {object[]}
 */
export function parseCSV(text) {
  if (!text) return [];
  const rows = [];
  let field = '';
  let record = [];
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++; // skip the escaped quote
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      record.push(field);
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      // Treat \r\n as a single line break.
      if (ch === '\r' && text[i + 1] === '\n') i++;
      record.push(field);
      field = '';
      // Ignore completely empty lines.
      if (record.length > 1 || record[0] !== '') {
        rows.push(record);
      }
      record = [];
    } else {
      field += ch;
    }
  }

  // Last field/line without a trailing break.
  if (field !== '' || record.length > 0) {
    record.push(field);
    if (record.length > 1 || record[0] !== '') {
      rows.push(record);
    }
  }

  if (rows.length === 0) return [];

  const header = rows[0];
  return rows.slice(1).map((cols) => {
    const obj = {};
    header.forEach((key, idx) => {
      obj[key] = cols[idx] ?? '';
    });
    return obj;
  });
}
