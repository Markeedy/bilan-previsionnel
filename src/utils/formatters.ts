/**
 * Formateur monétaire officiel en Dinars Algériens (DA)
 * Norme BTP / Comptabilité publique algérienne
 */
export function formatDA(amount: number | undefined | null): string {
  if (amount === undefined || amount === null || isNaN(amount)) {
    return '0,00 DA';
  }
  const formatted = new Intl.NumberFormat('fr-DZ', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
  
  return `${formatted} DA`;
}

export function formatQuantity(qty: number | undefined | null, decimals: number = 2): string {
  if (qty === undefined || qty === null || isNaN(qty)) {
    return '0';
  }
  return new Intl.NumberFormat('fr-DZ', {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  }).format(qty);
}

export function formatPercent(value: number | undefined | null): string {
  if (value === undefined || value === null || isNaN(value)) {
    return '0,00 %';
  }
  return new Intl.NumberFormat('fr-DZ', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value) + ' %';
}
