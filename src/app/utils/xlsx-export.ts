/** Crea un .xlsx (OOXML ZIP sin compresión) con Excel compatible, sin bibliotecas externas.
 *  Las celdas se serializan como inlineStr, escapadas para prevenir fórmulas inyectadas. */
export interface SheetData { name: string; rows: (string | number | boolean | null | undefined)[][]; }

const encoder = new TextEncoder();
function escapeXml(value: unknown): string {
  return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');
}
function columnName(num: number): string {
  let s = '';
  for (num++; num > 0; num = Math.floor((num - 1) / 26)) s = String.fromCharCode(65 + (num - 1) % 26) + s;
  return s;
}
function sheetXml(rows: SheetData['rows']): string {
  const body = rows.map((row, r) => `<row r="${r + 1}">${row.map((value, c) => {
    const ref = `${columnName(c)}${r + 1}`;
    // Todo se guarda como texto: no se interpretan fórmulas ni se pierde el cero inicial del DNI.
    return `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${escapeXml(value)}</t></is></c>`;
  }).join('')}</row>`).join('');
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${body}</sheetData></worksheet>`;
}
function u16(n: number): number[] { return [n & 255, (n >>> 8) & 255]; }
function u32(n: number): number[] { return [n & 255, (n >>> 8) & 255, (n >>> 16) & 255, (n >>> 24) & 255]; }
const crcTable = Array.from({ length: 256 }, (_, i) => {
  let c = i;
  for (let j = 0; j < 8; j++) c = (c >>> 1) ^ ((c & 1) ? 0xedb88320 : 0);
  return c >>> 0;
});
function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const b of bytes) crc = crcTable[(crc ^ b) & 255] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}
function packZip(files: {path:string; text:string}[]): Blob {
  const locals: Uint8Array[] = [], centrals: Uint8Array[] = [];
  let offset = 0;
  for (const file of files) {
    const name = encoder.encode(file.path), data = encoder.encode(file.text), crc = crc32(data);
    const local = new Uint8Array([...u32(0x04034b50), ...u16(20), ...u16(0), ...u16(0), ...u16(0), ...u16(0), ...u32(crc), ...u32(data.length), ...u32(data.length), ...u16(name.length), ...u16(0), ...name]);
    locals.push(local, data);
    const central = new Uint8Array([...u32(0x02014b50), ...u16(20), ...u16(20), ...u16(0), ...u16(0), ...u16(0), ...u16(0), ...u32(crc), ...u32(data.length), ...u32(data.length), ...u16(name.length), ...u16(0), ...u16(0), ...u16(0), ...u16(0), ...u32(0), ...u32(offset), ...name]);
    centrals.push(central);
    offset += local.length + data.length;
  }
  const centralSize = centrals.reduce((n, part) => n + part.length, 0);
  const final = new Uint8Array([...u32(0x06054b50), ...u16(0), ...u16(0), ...u16(files.length), ...u16(files.length), ...u32(centralSize), ...u32(offset), ...u16(0)]);
  // BlobPart type-check en TS 5.9 exige ArrayBuffer-backed buffers en vez de Uint8Array<ArrayBufferLike>.
  return new Blob([...locals, ...centrals, final].map(b => new Uint8Array(b).buffer as ArrayBuffer), { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}
export function createXlsx(sheets: SheetData[]): Blob {
  const used = new Set<string>();
  const normalized = sheets.map((sheet, i) => {
    let name = (sheet.name.replace(/[\\/?*\[\]:]/g, '_').slice(0, 31).trim() || `Hoja ${i + 1}`);
    const original = name;
    for (let suffix = 2; used.has(name.toLowerCase()); suffix++) name = `${original.slice(0, 27)}_${suffix}`;
    used.add(name.toLowerCase());
    return { ...sheet, name };
  });
  const types = `<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>${normalized.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}</Types>`;
  const workbook = `<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${normalized.map((s, i) => `<sheet name="${escapeXml(s.name)}" sheetId="${i+1}" r:id="rId${i+1}"/>`).join('')}</sheets></workbook>`;
  const rels = `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`;
  const sheetRels = `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${normalized.map((_,i)=>`<Relationship Id="rId${i+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i+1}.xml"/>`).join('')}</Relationships>`;
  return packZip([
    {path:'[Content_Types].xml',text:types}, {path:'_rels/.rels',text:rels},
    {path:'xl/workbook.xml',text:workbook},{path:'xl/_rels/workbook.xml.rels',text:sheetRels},
    ...normalized.map((s,i)=>({path:`xl/worksheets/sheet${i+1}.xml`,text:sheetXml(s.rows)}))
  ]);
}
export function saveBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = filename;
  anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
