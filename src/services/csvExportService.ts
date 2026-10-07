import { BudgetItem, WorkPackage, ProjectMetadata } from '../types/budget';

/**
 * Service d'exportation CSV normalisé pour le reporting mensuel BTP
 * Conforme à Microsoft Excel et LibreOffice (séparateur point-virgule et BOM UTF-8)
 */
export function exportBudgetToCsv(
  metadata: ProjectMetadata,
  workPackages: WorkPackage[],
  items: BudgetItem[]
): void {
  // UTF-8 Byte Order Mark (BOM) pour que Excel reconnaisse immédiatement les accents et caractères spéciaux (M³, M², etc.)
  const BOM = '\uFEFF';
  const delimiter = ';';

  const rows: string[] = [];

  // Helper to escape CSV cell
  const escapeCell = (val: string | number | undefined | null): string => {
    if (val === undefined || val === null) return '""';
    const str = String(val).replace(/\r\n/g, ' ').replace(/\n/g, ' ').replace(/\r/g, ' ');
    if (str.includes(';') || str.includes('"') || str.includes(',') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return `"${str}"`;
  };

  const formatNumberForCsv = (num: number, decimals: number = 2): string => {
    if (isNaN(num)) return '0,00';
    return num.toFixed(decimals).replace('.', ',');
  };

  // 1. En-tête institutionnel
  rows.push([escapeCell(metadata.holding), escapeCell(metadata.client)].join(delimiter));
  rows.push([escapeCell(metadata.projectName), escapeCell(metadata.location)].join(delimiter));
  rows.push([escapeCell(`Arrêté de situation : ${metadata.date}`), escapeCell(`Certifications : ${metadata.isoCertifications.join(' - ')}`)].join(delimiter));
  rows.push(''); // Ligne vide

  // 2. En-têtes de colonnes
  const headers = [
    'Lot',
    'N_Poste',
    'Designation_Travaux',
    'Unite',
    'Prix_Unitaire_DA',
    'Qte_Marche',
    'Qte_Realisee',
    'Qte_Reste_A_Realiser',
    'Qte_Octobre_2026',
    'Qte_Novembre_2026',
    'Qte_Decembre_2026',
    'Montant_Marche_DA',
    'Montant_Realise_DA',
    'Montant_Reste_DA',
    'Montant_Octobre_DA',
    'Montant_Novembre_DA',
    'Montant_Decembre_DA',
    'Total_Prevision_Trimestre_DA',
    'Taux_Avancement_Physique_Pct',
    'Statut_Conformite',
  ];
  rows.push(headers.join(delimiter));

  let totalContract = 0;
  let totalPrevious = 0;
  let totalRemaining = 0;
  let totalOct = 0;
  let totalNov = 0;
  let totalDec = 0;
  let totalForecastAll = 0;

  // 3. Parcours par lot et par poste
  workPackages.forEach((wp) => {
    const lotItems = items.filter((it) => it.workPackageId === wp.id);
    if (lotItems.length === 0) return;

    let lotContract = 0;
    let lotPrevious = 0;
    let lotRemaining = 0;
    let lotOct = 0;
    let lotNov = 0;
    let lotDec = 0;
    let lotForecast = 0;

    lotItems.forEach((it) => {
      const qteOct = it.forecasts['2026-10'] || 0;
      const qteNov = it.forecasts['2026-11'] || 0;
      const qteDec = it.forecasts['2026-12'] || 0;

      const amtOct = it.forecastAmounts['2026-10'] || 0;
      const amtNov = it.forecastAmounts['2026-11'] || 0;
      const amtDec = it.forecastAmounts['2026-12'] || 0;
      const totalQtr = amtOct + amtNov + amtDec;

      const progressPct = it.contractQuantity > 0 ? (it.previousQuantity / it.contractQuantity) * 100 : 0;
      const sumQtePlan = qteOct + qteNov + qteDec;
      const isConforme = Math.abs(sumQtePlan - it.remainingQuantity) <= 0.001;

      lotContract += it.contractAmount;
      lotPrevious += it.previousAmount;
      lotRemaining += it.remainingAmount;
      lotOct += amtOct;
      lotNov += amtNov;
      lotDec += amtDec;
      lotForecast += totalQtr;

      totalContract += it.contractAmount;
      totalPrevious += it.previousAmount;
      totalRemaining += it.remainingAmount;
      totalOct += amtOct;
      totalNov += amtNov;
      totalDec += amtDec;
      totalForecastAll += totalQtr;

      const row = [
        escapeCell(wp.code),
        escapeCell(it.itemNumber),
        escapeCell(it.designation),
        escapeCell(it.unit),
        formatNumberForCsv(it.unitPrice),
        formatNumberForCsv(it.contractQuantity),
        formatNumberForCsv(it.previousQuantity),
        formatNumberForCsv(it.remainingQuantity),
        formatNumberForCsv(qteOct),
        formatNumberForCsv(qteNov),
        formatNumberForCsv(qteDec),
        formatNumberForCsv(it.contractAmount),
        formatNumberForCsv(it.previousAmount),
        formatNumberForCsv(it.remainingAmount),
        formatNumberForCsv(amtOct),
        formatNumberForCsv(amtNov),
        formatNumberForCsv(amtDec),
        formatNumberForCsv(totalQtr),
        formatNumberForCsv(progressPct, 1),
        escapeCell(isConforme ? 'CONFORME_100%' : 'ECART_DETECTE'),
      ];
      rows.push(row.join(delimiter));
    });

    // Sous-total du lot
    const subtotalRow = [
      escapeCell(`SOUS_TOTAL_${wp.code}`),
      escapeCell(''),
      escapeCell(`SOUS-TOTAL : ${wp.title}`),
      escapeCell(''),
      escapeCell(''),
      escapeCell(''),
      escapeCell(''),
      escapeCell(''),
      escapeCell(''),
      escapeCell(''),
      escapeCell(''),
      formatNumberForCsv(lotContract),
      formatNumberForCsv(lotPrevious),
      formatNumberForCsv(lotRemaining),
      formatNumberForCsv(lotOct),
      formatNumberForCsv(lotNov),
      formatNumberForCsv(lotDec),
      formatNumberForCsv(lotForecast),
      formatNumberForCsv(lotContract > 0 ? (lotPrevious / lotContract) * 100 : 0, 1),
      escapeCell(Math.abs(lotForecast - lotRemaining) < 0.05 ? 'CONFORME' : 'ECART'),
    ];
    rows.push(subtotalRow.join(delimiter));
  });

  // 4. Ligne de total général consolidé
  const grandTotalRow = [
    escapeCell('TOTAL_GENERAL'),
    escapeCell(''),
    escapeCell('TOTAL GENERAL CONSOLIDE DU MARCHE (EGUVA / GITRA)'),
    escapeCell(''),
    escapeCell(''),
    escapeCell(''),
    escapeCell(''),
    escapeCell(''),
    escapeCell(''),
    escapeCell(''),
    escapeCell(''),
    formatNumberForCsv(totalContract),
    formatNumberForCsv(totalPrevious),
    formatNumberForCsv(totalRemaining),
    formatNumberForCsv(totalOct),
    formatNumberForCsv(totalNov),
    formatNumberForCsv(totalDec),
    formatNumberForCsv(totalForecastAll),
    formatNumberForCsv(totalContract > 0 ? (totalPrevious / totalContract) * 100 : 0, 1),
    escapeCell(Math.abs(totalForecastAll - totalRemaining) < 0.05 ? 'CONFORME_100%' : 'ECART'),
  ];
  rows.push(grandTotalRow.join(delimiter));

  // 5. Création du blob et téléchargement automatique
  const csvContent = BOM + rows.join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  const dateStr = new Date().toISOString().slice(0, 10);
  link.setAttribute('download', `SUIVI_BUDGETAIRE_PORT_KHEMISTI_${dateStr}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
