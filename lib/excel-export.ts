export type ExcelColumn = {
  key: string;
  label: string;
  width: number;
  kind?: "integer" | "decimal" | "text";
  wrap?: boolean;
};

type ExcelRow = Record<string, string | number | null>;

type ExcelExport = {
  columns: ExcelColumn[];
  rows: ExcelRow[];
  sheetName: string;
  fileName: string;
  frozenColumns?: number;
};

const COLORS = {
  heading: "FF2D6258",
  headingBorder: "FF214E47",
  text: "FF20302E",
  muted: "FF586A64",
  alternate: "FFF6F8F5",
  border: "FFD8E2D9",
};

export async function buildExcelWorkbook({ columns, rows, sheetName, frozenColumns = 2 }: ExcelExport) {
  const ExcelJS = (await import("exceljs")).default;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Test de Líneas";

  const sheet = workbook.addWorksheet(sheetName, {
    views: [{ state: "frozen", xSplit: frozenColumns, ySplit: 1, showGridLines: false }],
    pageSetup: { paperSize: 9, orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  });
  sheet.properties.tabColor = { argb: COLORS.heading };
  sheet.columns = columns.map(({ key, label, width }) => ({ key, header: label, width }));
  sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: columns.length } };
  sheet.pageSetup.printTitlesRow = "1:1";
  sheet.headerFooter.oddFooter = "&LTest de Líneas&RPágina &P de &N";

  const heading = sheet.getRow(1);
  heading.height = 38;
  heading.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.heading } };
    cell.font = { name: "Aptos", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    cell.border = { bottom: { style: "medium", color: { argb: COLORS.headingBorder } } };
  });

  for (const record of rows) {
    const row = sheet.addRow(columns.map(({ key }) => record[key] ?? ""));
    row.height = columns.some((column) => column.wrap) ? 48 : 25;
    row.eachCell({ includeEmpty: true }, (cell, columnNumber) => {
      const column = columns[columnNumber - 1];
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: row.number % 2 === 0 ? "FFFFFFFF" : COLORS.alternate } };
      cell.font = { name: "Aptos", size: 10, color: { argb: COLORS.text } };
      cell.alignment = {
        vertical: "middle",
        horizontal: column.kind === "integer" || column.kind === "decimal" ? "right" : "left",
        wrapText: column.wrap ?? false,
      };
      cell.border = { bottom: { style: "hair", color: { argb: COLORS.border } } };
      if (column.kind === "integer") cell.numFmt = "#,##0";
      if (column.kind === "decimal") cell.numFmt = "#,##0.00";
      if (column.kind === "text") cell.numFmt = "@";
    });
  }

  return workbook;
}

export async function downloadExcelFile(options: ExcelExport) {
  const workbook = await buildExcelWorkbook(options);
  const buffer = await workbook.xlsx.writeBuffer();
  const bytes = new Uint8Array(buffer as unknown as ArrayBuffer);
  const url = URL.createObjectURL(new Blob([bytes], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  }));
  const link = document.createElement("a");
  link.href = url;
  link.download = options.fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
