const escapeCsvValue = (value) => {
  const str = value === null || value === undefined ? '' : String(value);
  return /[",\r\n]/.test(str) ? `"${str.replaceAll('"', '""')}"` : str;
};

export function toCsv(rows, columns) {
  const header = columns.map((column) => escapeCsvValue(column.label)).join(',');
  const lines = rows.map((row) => columns.map((column) => escapeCsvValue(column.value(row))).join(','));
  return [header, ...lines].join('\r\n');
}
