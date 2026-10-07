import { BudgetItem, WorkPackage, ProjectMetadata } from '../types/budget';

export interface SpreadsheetFileInfo {
  id: string;
  name: string;
  modifiedTime: string;
  webViewLink: string;
}

export async function createBudgetSpreadsheet(
  metadata: ProjectMetadata,
  workPackages: WorkPackage[],
  items: BudgetItem[],
  accessToken: string
): Promise<{ spreadsheetId: string; spreadsheetUrl: string; title: string }> {
  const title = `BORDEREAU PRÉVISIONNEL - PORT DE KHEMISTI 2026 (${metadata.holding} / ${metadata.client})`;

  // 1. Prepare raw row values
  const values: any[][] = [];

  // Rows 1-3: Header metadata
  values.push([`${metadata.holding} — ${metadata.client}`]);
  values.push([`${metadata.projectName} — ${metadata.location}`]);
  values.push([`Certifications : ${metadata.isoCertifications.join(' | ')} — Arrêté de situation : ${metadata.date}`]);
  values.push([]); // Row 4 empty

  // Row 5 & 6: Headers
  values.push([
    'N°',
    'DÉSIGNATION DES TRAVAUX',
    'UNITÉ',
    'MÉTRÉS CONTRACTUELS',
    '',
    '',
    'QUANTITÉS PRÉVISIONNELLES',
    '',
    '',
    'PRIX UNITAIRE',
    'VALORISATION FINANCIÈRE CONTRACTUELLE',
    '',
    'MONTANTS PRÉVISIONNELS CALENDAIRES (DA)',
    '',
    '',
    'TOTAL PRÉVISION',
  ]);

  values.push([
    '',
    '',
    '',
    'QT MARCHÉ',
    'QT RÉALISÉE',
    'QT RESTE',
    'OCTOBRE',
    'NOVEMBRE',
    'DÉCEMBRE',
    'P.U (DA)',
    'RÉALISÉ ANT.',
    'RESTE À RÉALISER',
    'OCTOBRE (DA)',
    'NOVEMBRE (DA)',
    'DÉCEMBRE (DA)',
    'SOLDE TRIMESTRE',
  ]);

  const lotSubtotalRowIndexes: number[] = [];

  // Populate Lots & Items
  workPackages.forEach((wp) => {
    const lotItems = items.filter((it) => it.workPackageId === wp.id);
    if (lotItems.length === 0) return;

    // Lot Header Row
    values.push([`${wp.code} — ${wp.title}`]);
    const lotHeaderRowIdx = values.length; // 1-based row index in Sheet
    const startItemRow = lotHeaderRowIdx + 1;

    lotItems.forEach((item) => {
      const curRow = values.length + 1;
      values.push([
        item.itemNumber,
        item.designation,
        item.unit,
        item.contractQuantity,
        item.previousQuantity,
        `=D${curRow}-E${curRow}`, // Qté Reste
        item.forecasts['2026-10'] || 0,
        item.forecasts['2026-11'] || 0,
        item.forecasts['2026-12'] || 0,
        item.unitPrice,
        `=E${curRow}*J${curRow}`, // Montant Réalisé
        `=F${curRow}*J${curRow}`, // Montant Reste
        `=G${curRow}*J${curRow}`, // Montant Octobre
        `=H${curRow}*J${curRow}`, // Montant Novembre
        `=I${curRow}*J${curRow}`, // Montant Décembre
        `=M${curRow}+N${curRow}+O${curRow}`, // Total Trimestre
      ]);
    });

    const endItemRow = values.length;
    const subtotalRowIdx = values.length + 1;
    lotSubtotalRowIndexes.push(subtotalRowIdx);

    // Lot Subtotal Row with Formulas
    values.push([
      `SOUS-TOTAL ${wp.code}`,
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      `=SUM(K${startItemRow}:K${endItemRow})`,
      `=SUM(L${startItemRow}:L${endItemRow})`,
      `=SUM(M${startItemRow}:M${endItemRow})`,
      `=SUM(N${startItemRow}:N${endItemRow})`,
      `=SUM(O${startItemRow}:O${endItemRow})`,
      `=SUM(P${startItemRow}:P${endItemRow})`,
    ]);
  });

  // Grand Total Row
  const grandTotalRowIdx = values.length + 1;
  const sumPrev = lotSubtotalRowIndexes.map((r) => `K${r}`).join('+');
  const sumRest = lotSubtotalRowIndexes.map((r) => `L${r}`).join('+');
  const sumOct = lotSubtotalRowIndexes.map((r) => `M${r}`).join('+');
  const sumNov = lotSubtotalRowIndexes.map((r) => `N${r}`).join('+');
  const sumDec = lotSubtotalRowIndexes.map((r) => `O${r}`).join('+');
  const sumTotal = lotSubtotalRowIndexes.map((r) => `P${r}`).join('+');

  values.push([
    'TOTAL GÉNÉRAL CONSOLIDÉ DU MARCHÉ',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    `=${sumPrev}`,
    `=${sumRest}`,
    `=${sumOct}`,
    `=${sumNov}`,
    `=${sumDec}`,
    `=${sumTotal}`,
  ]);

  // 2. Create the spreadsheet using Google Sheets API
  const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: {
        title,
        locale: 'fr_DZ',
        timeZone: 'Africa/Algiers',
      },
      sheets: [
        {
          properties: {
            title: 'Bordereau Prévisionnel',
            gridProperties: {
              frozenRowCount: 6,
              frozenColumnCount: 2,
            },
          },
        },
      ],
    }),
  });

  if (!createRes.ok) {
    const errorData = await createRes.json();
    throw new Error(errorData.error?.message || 'Erreur lors de la création de la feuille Google Sheets');
  }

  const createData = await createRes.json();
  const spreadsheetId = createData.spreadsheetId;
  const spreadsheetUrl = createData.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
  const sheetId = createData.sheets?.[0]?.properties?.sheetId || 0;

  // 3. Write data into the sheet
  const updateValuesRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/A1:P${values.length}?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        range: `A1:P${values.length}`,
        majorDimension: 'ROWS',
        values,
      }),
    }
  );

  if (!updateValuesRes.ok) {
    const err = await updateValuesRes.json();
    console.warn('Avertissement écriture valeurs:', err);
  }

  // 4. Apply formatting batch update (Colors, borders, column widths)
  try {
    const requests: any[] = [
      // Merge title rows
      {
        mergeCells: {
          range: { sheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: 16 },
          mergeType: 'MERGE_ALL',
        },
      },
      {
        mergeCells: {
          range: { sheetId, startRowIndex: 1, endRowIndex: 2, startColumnIndex: 0, endColumnIndex: 16 },
          mergeType: 'MERGE_ALL',
        },
      },
      {
        mergeCells: {
          range: { sheetId, startRowIndex: 2, endRowIndex: 3, startColumnIndex: 0, endColumnIndex: 16 },
          mergeType: 'MERGE_ALL',
        },
      },
      // Merge Group Headers
      {
        mergeCells: {
          range: { sheetId, startRowIndex: 4, endRowIndex: 6, startColumnIndex: 0, endColumnIndex: 1 },
          mergeType: 'MERGE_ALL',
        },
      },
      {
        mergeCells: {
          range: { sheetId, startRowIndex: 4, endRowIndex: 6, startColumnIndex: 1, endColumnIndex: 2 },
          mergeType: 'MERGE_ALL',
        },
      },
      {
        mergeCells: {
          range: { sheetId, startRowIndex: 4, endRowIndex: 6, startColumnIndex: 2, endColumnIndex: 3 },
          mergeType: 'MERGE_ALL',
        },
      },
      {
        mergeCells: {
          range: { sheetId, startRowIndex: 4, endRowIndex: 5, startColumnIndex: 3, endColumnIndex: 6 },
          mergeType: 'MERGE_ALL',
        },
      },
      {
        mergeCells: {
          range: { sheetId, startRowIndex: 4, endRowIndex: 5, startColumnIndex: 6, endColumnIndex: 9 },
          mergeType: 'MERGE_ALL',
        },
      },
      {
        mergeCells: {
          range: { sheetId, startRowIndex: 4, endRowIndex: 6, startColumnIndex: 9, endColumnIndex: 10 },
          mergeType: 'MERGE_ALL',
        },
      },
      {
        mergeCells: {
          range: { sheetId, startRowIndex: 4, endRowIndex: 5, startColumnIndex: 10, endColumnIndex: 12 },
          mergeType: 'MERGE_ALL',
        },
      },
      {
        mergeCells: {
          range: { sheetId, startRowIndex: 4, endRowIndex: 5, startColumnIndex: 12, endColumnIndex: 15 },
          mergeType: 'MERGE_ALL',
        },
      },
      {
        mergeCells: {
          range: { sheetId, startRowIndex: 4, endRowIndex: 6, startColumnIndex: 15, endColumnIndex: 16 },
          mergeType: 'MERGE_ALL',
        },
      },
      // Header row styling
      {
        repeatCell: {
          range: { sheetId, startRowIndex: 4, endRowIndex: 6, startColumnIndex: 0, endColumnIndex: 16 },
          cell: {
            userEnteredFormat: {
              backgroundColor: { red: 0.08, green: 0.12, blue: 0.18 }, // Navy slate
              textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 }, fontSize: 10 },
              horizontalAlignment: 'CENTER',
              verticalAlignment: 'MIDDLE',
              wrapStrategy: 'WRAP',
            },
          },
          fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment,wrapStrategy)',
        },
      },
      // Number formats for currency columns (J, K, L, M, N, O, P)
      {
        repeatCell: {
          range: { sheetId, startRowIndex: 6, endRowIndex: values.length, startColumnIndex: 9, endColumnIndex: 16 },
          cell: {
            userEnteredFormat: {
              numberFormat: {
                type: 'CURRENCY',
                pattern: '#,##0.00" DA"',
              },
            },
          },
          fields: 'userEnteredFormat.numberFormat',
        },
      },
      // Set Column Widths (A=50, B=320, C=50, D-I=90, J-P=120)
      {
        updateDimensionProperties: {
          range: { sheetId, dimension: 'COLUMNS', startIndex: 0, endIndex: 1 },
          properties: { pixelSize: 50 },
          fields: 'pixelSize',
        },
      },
      {
        updateDimensionProperties: {
          range: { sheetId, dimension: 'COLUMNS', startIndex: 1, endIndex: 2 },
          properties: { pixelSize: 320 },
          fields: 'pixelSize',
        },
      },
      {
        updateDimensionProperties: {
          range: { sheetId, dimension: 'COLUMNS', startIndex: 2, endIndex: 3 },
          properties: { pixelSize: 50 },
          fields: 'pixelSize',
        },
      },
      {
        updateDimensionProperties: {
          range: { sheetId, dimension: 'COLUMNS', startIndex: 3, endIndex: 9 },
          properties: { pixelSize: 95 },
          fields: 'pixelSize',
        },
      },
      {
        updateDimensionProperties: {
          range: { sheetId, dimension: 'COLUMNS', startIndex: 9, endIndex: 16 },
          properties: { pixelSize: 125 },
          fields: 'pixelSize',
        },
      },
    ];

    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ requests }),
    });
  } catch (err) {
    console.warn('Batch update styles note:', err);
  }

  return { spreadsheetId, spreadsheetUrl, title };
}

export async function listUserSpreadsheets(accessToken: string): Promise<SpreadsheetFileInfo[]> {
  const query = encodeURIComponent("mimeType='application/vnd.google-apps.spreadsheet' and trashed=false");
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,modifiedTime,webViewLink)&orderBy=modifiedTime desc&pageSize=15`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!res.ok) {
    throw new Error('Impossible de lister les feuilles Google Sheets depuis Google Drive');
  }

  const data = await res.json();
  return data.files || [];
}

export async function readSpreadsheetValues(
  spreadsheetId: string,
  range: string,
  accessToken: string
): Promise<any[][]> {
  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.error?.message || 'Erreur lors de la lecture de Google Sheets');
  }

  const data = await res.json();
  return data.values || [];
}
