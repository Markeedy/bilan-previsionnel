import ExcelJS from 'exceljs';
import { BudgetItem, WorkPackage, ProjectMetadata } from '../types/budget';

export async function exportBudgetToExcel(
  metadata: ProjectMetadata,
  workPackages: WorkPackage[],
  items: BudgetItem[]
): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'E.G.U.V.A / GITRA - Direction Technique';
  workbook.lastModifiedBy = 'Ingénieur Travaux BTP';
  workbook.created = new Date();
  workbook.modified = new Date();

  const worksheet = workbook.addWorksheet('Bordereau Prévisionnel', {
    views: [{ showGridLines: true, state: 'frozen', xSplit: 2, ySplit: 8 }],
  });

  // Colors & Fills
  const headerFill: ExcelJS.Fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1E293B' }, // Dark slate
  };

  const lotHeaderFill: ExcelJS.Fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF0284C7' }, // Deep sky blue
  };

  const lotSubtotalFill: ExcelJS.Fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFF1F5F9' }, // Light slate
  };

  const grandTotalFill: ExcelJS.Fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF0F172A' }, // Deepest navy
  };

  // Thin border
  const borderThin: Partial<ExcelJS.Borders> = {
    top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
  };

  const borderThickBottom: Partial<ExcelJS.Borders> = {
    ...borderThin,
    bottom: { style: 'medium', color: { argb: 'FF0F172A' } },
  };

  // Columns setup
  worksheet.columns = [
    { key: 'itemNumber', width: 8 },      // A
    { key: 'designation', width: 45 },     // B
    { key: 'unit', width: 8 },            // C
    { key: 'contractQty', width: 14 },     // D
    { key: 'previousQty', width: 14 },     // E
    { key: 'remainingQty', width: 15 },    // F
    { key: 'octQty', width: 14 },          // G
    { key: 'novQty', width: 14 },          // H
    { key: 'decQty', width: 14 },          // I
    { key: 'unitPrice', width: 16 },       // J
    { key: 'previousAmount', width: 18 },  // K
    { key: 'remainingAmount', width: 18 }, // L
    { key: 'octAmount', width: 18 },       // M
    { key: 'novAmount', width: 18 },       // N
    { key: 'decAmount', width: 18 },       // O
    { key: 'totalQuarter', width: 20 },    // P
  ];

  // 1. Title Banner
  worksheet.mergeCells('A1:P1');
  const row1 = worksheet.getCell('A1');
  row1.value = `${metadata.holding} - ${metadata.client}`;
  row1.font = { name: 'Calibri', size: 12, bold: true, color: { argb: 'FF0F172A' } };
  row1.alignment = { horizontal: 'center', vertical: 'middle' };

  worksheet.mergeCells('A2:P2');
  const row2 = worksheet.getCell('A2');
  row2.value = `${metadata.projectName} - ${metadata.location}`;
  row2.font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FF1E3A8A' } };
  row2.alignment = { horizontal: 'center', vertical: 'middle' };

  worksheet.mergeCells('A3:P3');
  const row3 = worksheet.getCell('A3');
  row3.value = `Certifications : ${metadata.isoCertifications.join(' | ')}  —  Arrêté de situation : ${metadata.date}`;
  row3.font = { name: 'Calibri', size: 10, italic: true, color: { argb: 'FF475569' } };
  row3.alignment = { horizontal: 'center', vertical: 'middle' };

  // Empty row 4
  worksheet.addRow([]);

  // 2. Multi-level Table Headers (Rows 6 & 7)
  const headerRow1 = [
    'N°',
    'DÉSIGNATION DES TRAVAUX',
    'UNITÉ',
    'MÉTRÉS CONTRACTUELS & RÉALISATIONS',
    '',
    '',
    'QUANTITÉS PRÉVISIONNELLES TRIMESTRE',
    '',
    '',
    'PRIX UNITAIRE',
    'VALORISATION FINANCIÈRE CONTRACTUELLE',
    '',
    'MONTANTS PRÉVISIONNELS CALENDAIRES (DA)',
    '',
    '',
    'TOTAL PRÉVISION',
  ];

  const headerRow2 = [
    '',
    '',
    '',
    'QT MARCHÉ',
    'QT RÉALISÉE',
    'QT RESTE',
    'OCTOBRE',
    'NOVEMBRE',
    'DÉCEMBRE',
    'PU H.T (DA)',
    'RÉALISÉ ANT.',
    'RESTE À RÉALISER',
    'OCTOBRE (DA)',
    'NOVEMBRE (DA)',
    'DÉCEMBRE (DA)',
    'SOLDE TRIMESTRE',
  ];

  const r6 = worksheet.addRow(headerRow1);
  const r7 = worksheet.addRow(headerRow2);

  // Merge group headers
  worksheet.mergeCells('A6:A7');
  worksheet.mergeCells('B6:B7');
  worksheet.mergeCells('C6:C7');
  worksheet.mergeCells('D6:F6');
  worksheet.mergeCells('G6:I6');
  worksheet.mergeCells('J6:J7');
  worksheet.mergeCells('K6:L6');
  worksheet.mergeCells('M6:O6');
  worksheet.mergeCells('P6:P7');

  [r6, r7].forEach((row) => {
    row.eachCell((cell) => {
      cell.fill = headerFill;
      cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.border = borderThin;
    });
  });
  r6.height = 24;
  r7.height = 24;

  const lotSubtotalRowNumbers: number[] = [];

  // 3. Populate Lots & Items
  workPackages.forEach((wp) => {
    const lotItems = items.filter((it) => it.workPackageId === wp.id);
    if (lotItems.length === 0) return;

    // Lot Header Row
    const lotRow = worksheet.addRow([`${wp.code} - ${wp.title}`]);
    const lotRowIndex = lotRow.number;
    worksheet.mergeCells(`A${lotRowIndex}:P${lotRowIndex}`);
    const lotCell = worksheet.getCell(`A${lotRowIndex}`);
    lotCell.fill = lotHeaderFill;
    lotCell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    lotCell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
    lotRow.height = 22;

    const startItemRow = lotRowIndex + 1;

    // Add Items
    lotItems.forEach((item) => {
      const row = worksheet.addRow([]);
      const rowIdx = row.number;

      // Col A: Item Number
      row.getCell(1).value = item.itemNumber;
      row.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };

      // Col B: Designation
      row.getCell(2).value = item.designation;
      row.getCell(2).alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };

      // Col C: Unit
      row.getCell(3).value = item.unit;
      row.getCell(3).alignment = { horizontal: 'center', vertical: 'middle' };

      // Col D: Contract Qty
      row.getCell(4).value = item.contractQuantity;
      row.getCell(4).numFmt = '#,##0.00';

      // Col E: Previous Qty
      row.getCell(5).value = item.previousQuantity;
      row.getCell(5).numFmt = '#,##0.00';

      // Col F: Remaining Qty (Formula: =D - E)
      row.getCell(6).value = { formula: `D${rowIdx}-E${rowIdx}`, result: item.remainingQuantity };
      row.getCell(6).numFmt = '#,##0.00';

      // Col G: Oct Qty
      row.getCell(7).value = item.forecasts['2026-10'] || 0;
      row.getCell(7).numFmt = '#,##0.00';

      // Col H: Nov Qty
      row.getCell(8).value = item.forecasts['2026-11'] || 0;
      row.getCell(8).numFmt = '#,##0.00';

      // Col I: Dec Qty
      row.getCell(9).value = item.forecasts['2026-12'] || 0;
      row.getCell(9).numFmt = '#,##0.00';

      // Col J: Unit Price
      row.getCell(10).value = item.unitPrice;
      row.getCell(10).numFmt = '#,##0.00 "DA"';

      // Col K: Previous Amount (Formula: =E * J)
      row.getCell(11).value = { formula: `E${rowIdx}*J${rowIdx}`, result: item.previousAmount };
      row.getCell(11).numFmt = '#,##0.00 "DA"';

      // Col L: Remaining Amount (Formula: =F * J)
      row.getCell(12).value = { formula: `F${rowIdx}*J${rowIdx}`, result: item.remainingAmount };
      row.getCell(12).numFmt = '#,##0.00 "DA"';

      // Col M: Oct Amount (Formula: =G * J)
      row.getCell(13).value = { formula: `G${rowIdx}*J${rowIdx}`, result: item.forecastAmounts['2026-10'] || 0 };
      row.getCell(13).numFmt = '#,##0.00 "DA"';

      // Col N: Nov Amount (Formula: =H * J)
      row.getCell(14).value = { formula: `H${rowIdx}*J${rowIdx}`, result: item.forecastAmounts['2026-11'] || 0 };
      row.getCell(14).numFmt = '#,##0.00 "DA"';

      // Col O: Dec Amount (Formula: =I * J)
      row.getCell(15).value = { formula: `I${rowIdx}*J${rowIdx}`, result: item.forecastAmounts['2026-12'] || 0 };
      row.getCell(15).numFmt = '#,##0.00 "DA"';

      // Col P: Total Quarter Amount (Formula: =M + N + O)
      const qtrTotal = (item.forecastAmounts['2026-10'] || 0) + (item.forecastAmounts['2026-11'] || 0) + (item.forecastAmounts['2026-12'] || 0);
      row.getCell(16).value = { formula: `M${rowIdx}+N${rowIdx}+O${rowIdx}`, result: qtrTotal };
      row.getCell(16).numFmt = '#,##0.00 "DA"';

      // Styles
      row.eachCell((cell) => {
        cell.font = { name: 'Calibri', size: 9 };
        cell.border = borderThin;
        if (!cell.alignment) {
          cell.alignment = { vertical: 'middle' };
        }
      });
      row.height = 20;
    });

    const endItemRow = startItemRow + lotItems.length - 1;

    // Subtotal Row for the Lot
    const subtotalRow = worksheet.addRow([]);
    const subIdx = subtotalRow.number;
    lotSubtotalRowNumbers.push(subIdx);

    worksheet.mergeCells(`A${subIdx}:C${subIdx}`);
    subtotalRow.getCell(1).value = `SOUS-TOTAL ${wp.code}`;
    subtotalRow.getCell(1).alignment = { horizontal: 'right', vertical: 'middle' };

    // Subtotals Formulas
    subtotalRow.getCell(11).value = { formula: `SUM(K${startItemRow}:K${endItemRow})` };
    subtotalRow.getCell(12).value = { formula: `SUM(L${startItemRow}:L${endItemRow})` };
    subtotalRow.getCell(13).value = { formula: `SUM(M${startItemRow}:M${endItemRow})` };
    subtotalRow.getCell(14).value = { formula: `SUM(N${startItemRow}:N${endItemRow})` };
    subtotalRow.getCell(15).value = { formula: `SUM(O${startItemRow}:O${endItemRow})` };
    subtotalRow.getCell(16).value = { formula: `SUM(P${startItemRow}:P${endItemRow})` };

    for (let c = 11; c <= 16; c++) {
      subtotalRow.getCell(c).numFmt = '#,##0.00 "DA"';
    }

    subtotalRow.eachCell((cell) => {
      cell.fill = lotSubtotalFill;
      cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF0F172A' } };
      cell.border = borderThickBottom;
      if (!cell.alignment) {
        cell.alignment = { vertical: 'middle' };
      }
    });
    subtotalRow.height = 22;
  });

  // 4. Grand Total Row
  const grandTotalRow = worksheet.addRow([]);
  const grandIdx = grandTotalRow.number;
  worksheet.mergeCells(`A${grandIdx}:C${grandIdx}`);
  grandTotalRow.getCell(1).value = 'TOTAL GÉNÉRAL CONSOLIDÉ DU MARCHÉ';
  grandTotalRow.getCell(1).alignment = { horizontal: 'right', vertical: 'middle' };

  const formulaSumPrev = lotSubtotalRowNumbers.map((r) => `K${r}`).join('+');
  const formulaSumRest = lotSubtotalRowNumbers.map((r) => `L${r}`).join('+');
  const formulaSumOct = lotSubtotalRowNumbers.map((r) => `M${r}`).join('+');
  const formulaSumNov = lotSubtotalRowNumbers.map((r) => `N${r}`).join('+');
  const formulaSumDec = lotSubtotalRowNumbers.map((r) => `O${r}`).join('+');
  const formulaSumTotal = lotSubtotalRowNumbers.map((r) => `P${r}`).join('+');

  grandTotalRow.getCell(11).value = { formula: formulaSumPrev };
  grandTotalRow.getCell(12).value = { formula: formulaSumRest };
  grandTotalRow.getCell(13).value = { formula: formulaSumOct };
  grandTotalRow.getCell(14).value = { formula: formulaSumNov };
  grandTotalRow.getCell(15).value = { formula: formulaSumDec };
  grandTotalRow.getCell(16).value = { formula: formulaSumTotal };

  for (let c = 11; c <= 16; c++) {
    grandTotalRow.getCell(c).numFmt = '#,##0.00 "DA"';
  }

  grandTotalRow.eachCell((cell) => {
    cell.fill = grandTotalFill;
    cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.border = {
      top: { style: 'medium', color: { argb: 'FFFFFFFF' } },
      bottom: { style: 'double', color: { argb: 'FFFFFFFF' } },
      left: { style: 'thin', color: { argb: 'FFFFFFFF' } },
      right: { style: 'thin', color: { argb: 'FFFFFFFF' } },
    };
    if (!cell.alignment) {
      cell.alignment = { vertical: 'middle' };
    }
  });
  grandTotalRow.height = 26;

  // Generate buffer and trigger browser download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `BORDEREAU_PREVISIONNEL_PORT_KHEMISTI_${new Date().toISOString().slice(0, 10)}.xlsx`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.URL.revokeObjectURL(url);
}
