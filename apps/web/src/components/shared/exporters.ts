import ExcelJS from 'exceljs';
import { saveAs } from './file-saver';

export async function exportToExcel<T extends Record<string, unknown>>(
  filename: string,
  data: T[],
  columns: Array<{ key: keyof T; header: string }>,
) {
  const wb = new ExcelJS.Workbook();
  const sheet = wb.addWorksheet('Sheet1');
  sheet.columns = columns.map((c) => ({ header: c.header, key: String(c.key), width: 20 }));
  sheet.addRows(data);
  const buffer = await wb.xlsx.writeBuffer();
  saveAs(new Blob([buffer], { type: 'application/octet-stream' }), `${filename}.xlsx`);
}

export function exportToCSV<T extends Record<string, unknown>>(filename: string, data: T[]) {
  if (data.length === 0) return;
  const headers = Object.keys(data[0]);
  const rows = data.map((row) =>
    headers.map((h) => JSON.stringify((row as Record<string, unknown>)[h] ?? '')).join(','),
  );
  const csv = [headers.join(','), ...rows].join('\n');
  saveAs(new Blob([csv], { type: 'text/csv;charset=utf-8;' }), `${filename}.csv`);
}

export function printHtml(title: string, html: string) {
  const w = window.open('', '_blank');
  if (!w) return;
  w.document.write(`<!doctype html><html><head><title>${title}</title><style>body{font-family:Inter,system-ui,sans-serif;padding:20px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ccc;padding:6px 10px;text-align:start}th{background:#eee}</style></head><body>${html}</body></html>`);
  w.document.close();
  setTimeout(() => w.print(), 250);
}