import React, { useState, useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  flexRender,
  ColumnDef,
  VisibilityState,
} from '@tanstack/react-table';
import { useBudgetStore } from '../store/useBudgetStore';
import { BudgetItem, WorkPackage } from '../types/budget';
import { EditableCell } from './EditableCell';
import { formatDA, formatQuantity } from '../utils/formatters';
import { exportBudgetToCsv } from '../services/csvExportService';
import { 
  ChevronDown, 
  ChevronRight, 
  Search, 
  SlidersHorizontal, 
  AlertTriangle, 
  CheckCircle2, 
  Maximize2, 
  Minimize2,
  FileText,
  HelpCircle,
  Download,
} from 'lucide-react';

export const BudgetGrid: React.FC = () => {
  const {
    metadata,
    workPackages,
    items,
    expandedLots,
    toggleLotExpansion,
    expandAllLots,
    collapseAllLots,
    searchQuery,
    setSearchQuery,
    selectedLotFilter,
    setSelectedLotFilter,
    statusFilter,
    setStatusFilter,
    updateItemField,
    getLotSummaries,
    getConsolidation,
    setSelectedItemForModal,
  } = useBudgetStore();

  const [viewMode, setViewMode] = useState<'FULL' | 'FINANCIAL' | 'QUANTITIES'>('FULL');
  const consolidation = getConsolidation();
  const lotSummaries = getLotSummaries();

  // Filter items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // Lot filter
      if (selectedLotFilter !== 'ALL' && item.workPackageId !== selectedLotFilter) {
        return false;
      }

      // Search filter
      if (searchQuery.trim() !== '') {
        const query = searchQuery.toLowerCase();
        const matchNumber = String(item.itemNumber).includes(query);
        const matchDesignation = item.designation.toLowerCase().includes(query);
        const matchUnit = item.unit.toLowerCase().includes(query);
        if (!matchNumber && !matchDesignation && !matchUnit) {
          return false;
        }
      }

      // Status filter
      const sumForecasts = Object.values(item.forecasts).reduce((a, b) => a + b, 0);
      const diff = Number((sumForecasts - item.remainingQuantity).toFixed(3));
      if (statusFilter === 'BALANCED' && Math.abs(diff) > 0.001) return false;
      if (statusFilter === 'OVER_BUDGET' && diff <= 0.001) return false;
      if (statusFilter === 'UNDER_BUDGET' && diff >= -0.001) return false;

      return true;
    });
  }, [items, selectedLotFilter, searchQuery, statusFilter]);

  // Group items by workPackageId
  const itemsByLot = useMemo(() => {
    const map = new Map<string, BudgetItem[]>();
    workPackages.forEach((wp) => {
      map.set(wp.id, []);
    });
    filteredItems.forEach((item) => {
      const arr = map.get(item.workPackageId);
      if (arr) {
        arr.push(item);
      }
    });
    return map;
  }, [filteredItems, workPackages]);

  // Define columns
  const columns = useMemo<ColumnDef<BudgetItem>[]>(() => {
    return [
      {
        accessorKey: 'itemNumber',
        header: 'N°',
        size: 50,
        cell: (info) => (
          <span className="font-semibold text-slate-700 text-center block">
            {info.getValue() as number}
          </span>
        ),
      },
      {
        accessorKey: 'designation',
        header: 'Désignation des Prestations et Fournitures',
        size: 320,
        cell: ({ row }) => {
          const item = row.original;
          return (
            <div className="flex items-start gap-2 py-1">
              <span className="text-xs text-slate-800 leading-snug font-normal line-clamp-3 hover:line-clamp-none transition-all">
                {item.designation}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedItemForModal(item);
                }}
                title="Détails du poste"
                className="text-slate-400 hover:text-blue-600 shrink-0 p-0.5"
              >
                <FileText className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        },
      },
      {
        accessorKey: 'unit',
        header: 'U',
        size: 45,
        cell: (info) => (
          <span className="inline-block px-1.5 py-0.5 text-[11px] font-mono font-medium rounded bg-slate-100 text-slate-700">
            {info.getValue() as string}
          </span>
        ),
      },
      {
        accessorKey: 'unitPrice',
        header: 'P.U (DA)',
        size: 90,
        cell: ({ row }) => (
          <EditableCell
            value={row.original.unitPrice}
            onCommit={(val) => updateItemField(row.original.id, 'unitPrice', val)}
            format="currency"
            className="font-medium text-slate-800"
          />
        ),
      },
      // MÉTRÉS
      {
        accessorKey: 'contractQuantity',
        header: 'Qté Marché',
        size: 90,
        cell: ({ row }) => (
          <EditableCell
            value={row.original.contractQuantity}
            onCommit={(val) => updateItemField(row.original.id, 'contractQuantity', val)}
            format="quantity"
            className="font-semibold text-slate-800"
          />
        ),
      },
      {
        accessorKey: 'previousQuantity',
        header: 'Qté Réalisée',
        size: 85,
        cell: ({ row }) => (
          <EditableCell
            value={row.original.previousQuantity}
            onCommit={(val) => updateItemField(row.original.id, 'previousQuantity', val)}
            format="quantity"
            className="text-emerald-700 bg-emerald-50/50"
          />
        ),
      },
      {
        accessorKey: 'remainingQuantity',
        header: 'Qté Reste',
        size: 85,
        cell: ({ row }) => (
          <span className="font-mono text-xs font-semibold text-slate-700 block text-right pr-2">
            {formatQuantity(row.original.remainingQuantity)}
          </span>
        ),
      },
      // QUANTITÉS MENSUELLES
      {
        id: 'qtyOct',
        header: 'Qté Oct',
        size: 80,
        cell: ({ row }) => (
          <EditableCell
            value={row.original.forecasts['2026-10'] || 0}
            onCommit={(val) => updateItemField(row.original.id, '2026-10', val)}
            format="quantity"
            className="text-blue-900 bg-blue-50/40"
          />
        ),
      },
      {
        id: 'qtyNov',
        header: 'Qté Nov',
        size: 80,
        cell: ({ row }) => (
          <EditableCell
            value={row.original.forecasts['2026-11'] || 0}
            onCommit={(val) => updateItemField(row.original.id, '2026-11', val)}
            format="quantity"
            className="text-indigo-900 bg-indigo-50/40"
          />
        ),
      },
      {
        id: 'qtyDec',
        header: 'Qté Déc',
        size: 80,
        cell: ({ row }) => (
          <EditableCell
            value={row.original.forecasts['2026-12'] || 0}
            onCommit={(val) => updateItemField(row.original.id, '2026-12', val)}
            format="quantity"
            className="text-purple-900 bg-purple-50/40"
          />
        ),
      },
      {
        id: 'totalForecastQty',
        header: 'Tot. Qté Plan.',
        size: 90,
        cell: ({ row }) => {
          const sum = Object.values(row.original.forecasts).reduce((a, b) => a + b, 0);
          const isOver = sum > row.original.remainingQuantity + 0.001;
          const isUnder = sum < row.original.remainingQuantity - 0.001;
          return (
            <div className={`font-mono text-xs font-bold text-right pr-2 ${
              isOver ? 'text-red-600' : isUnder ? 'text-amber-600' : 'text-emerald-700'
            }`}>
              {formatQuantity(sum)}
            </div>
          );
        },
      },
      // MONTANTS FINANCIERS
      {
        accessorKey: 'contractAmount',
        header: 'Montant Marché',
        size: 110,
        cell: (info) => (
          <span className="font-mono text-xs text-slate-700 block text-right pr-1">
            {formatDA(info.getValue() as number)}
          </span>
        ),
      },
      {
        accessorKey: 'previousAmount',
        header: 'Montant Réalisé',
        size: 110,
        cell: (info) => (
          <span className="font-mono text-xs font-medium text-emerald-700 block text-right pr-1">
            {formatDA(info.getValue() as number)}
          </span>
        ),
      },
      {
        accessorKey: 'remainingAmount',
        header: 'Montant Reste',
        size: 115,
        cell: (info) => (
          <span className="font-mono text-xs font-semibold text-slate-800 block text-right pr-1">
            {formatDA(info.getValue() as number)}
          </span>
        ),
      },
      // MONTANTS PRÉVISIONNELS CALENDAIRES
      {
        id: 'amtOct',
        header: 'Montant Octobre',
        size: 115,
        cell: ({ row }) => (
          <span className="font-mono text-xs text-blue-900 font-medium block text-right pr-1 bg-blue-50/30">
            {formatDA(row.original.forecastAmounts['2026-10'] || 0)}
          </span>
        ),
      },
      {
        id: 'amtNov',
        header: 'Montant Novembre',
        size: 115,
        cell: ({ row }) => (
          <span className="font-mono text-xs text-indigo-900 font-medium block text-right pr-1 bg-indigo-50/30">
            {formatDA(row.original.forecastAmounts['2026-11'] || 0)}
          </span>
        ),
      },
      {
        id: 'amtDec',
        header: 'Montant Décembre',
        size: 115,
        cell: ({ row }) => (
          <span className="font-mono text-xs text-purple-900 font-medium block text-right pr-1 bg-purple-50/30">
            {formatDA(row.original.forecastAmounts['2026-12'] || 0)}
          </span>
        ),
      },
      {
        id: 'totalForecastAmt',
        header: 'Solde Trimestre',
        size: 120,
        cell: ({ row }) => {
          const sumAmt = Object.values(row.original.forecastAmounts).reduce((a, b) => a + b, 0);
          const diff = sumAmt - row.original.remainingAmount;
          const isExact = Math.abs(diff) < 0.05;
          return (
            <div className={`font-mono text-xs font-bold text-right pr-1 ${
              isExact ? 'text-slate-900' : diff > 0 ? 'text-red-600' : 'text-amber-600'
            }`}>
              {formatDA(sumAmt)}
            </div>
          );
        },
      },
      // STATUT & ALERTE
      {
        id: 'status',
        header: 'Équilibre',
        size: 95,
        cell: ({ row }) => {
          const sumQty = Object.values(row.original.forecasts).reduce((a, b) => a + b, 0);
          const diffQty = Number((sumQty - row.original.remainingQuantity).toFixed(3));
          
          if (Math.abs(diffQty) <= 0.001) {
            return (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                100%
              </span>
            );
          } else if (diffQty > 0) {
            return (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-red-100 text-red-800" title={`Dépassement de ${diffQty}`}>
                <AlertTriangle className="w-3 h-3 text-red-600" />
                +{diffQty}
              </span>
            );
          } else {
            return (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800" title={`Reliquat non planifié: ${Math.abs(diffQty)}`}>
                <HelpCircle className="w-3 h-3 text-amber-600" />
                {diffQty}
              </span>
            );
          }
        },
      },
    ];
  }, [updateItemField, setSelectedItemForModal]);

  // Column visibility based on viewMode
  const columnVisibility = useMemo<VisibilityState>(() => {
    const state: VisibilityState = {};
    if (viewMode === 'QUANTITIES') {
      state.contractAmount = false;
      state.previousAmount = false;
      state.remainingAmount = false;
      state.amtOct = false;
      state.amtNov = false;
      state.amtDec = false;
      state.totalForecastAmt = false;
    } else if (viewMode === 'FINANCIAL') {
      state.contractQuantity = false;
      state.previousQuantity = false;
      state.remainingQuantity = false;
      state.qtyOct = false;
      state.qtyNov = false;
      state.qtyDec = false;
      state.totalForecastQty = false;
    }
    return state;
  }, [viewMode]);

  const table = useReactTable({
    data: filteredItems,
    columns,
    state: {
      columnVisibility,
    },
    autoResetExpanded: false,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      {/* FILTER & TOOLBAR HEADER */}
      <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex flex-wrap items-center justify-between gap-3">
        {/* Search & Lot selector */}
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[300px]">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Rechercher désignation, N°, unité..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <SlidersHorizontal className="w-4 h-4 text-slate-400" />
            <select
              value={selectedLotFilter}
              onChange={(e) => setSelectedLotFilter(e.target.value)}
              className="py-1.5 px-2 text-xs bg-white border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-700"
            >
              <option value="ALL">Tous les Lots (6 Lots - 44 Postes)</option>
              {workPackages.map((wp) => (
                <option key={wp.id} value={wp.id}>
                  {wp.code} - {wp.title.slice(0, 30)}...
                </option>
              ))}
            </select>
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="py-1.5 px-2 text-xs bg-white border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-700"
          >
            <option value="ALL">Tous les statuts d'équilibre</option>
            <option value="BALANCED">✓ Équilibrés (100% planifié)</option>
            <option value="OVER_BUDGET">⚠️ En dépassement (&gt; reliquat)</option>
            <option value="UNDER_BUDGET">⏳ Reliquat incomplet (&lt; reliquat)</option>
          </select>
        </div>

        {/* View Mode & Expand/Collapse Toggles */}
        <div className="flex items-center gap-2">
          {/* View Mode Buttons */}
          <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 text-xs">
            <button
              onClick={() => setViewMode('FULL')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                viewMode === 'FULL'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Vue Complète
            </button>
            <button
              onClick={() => setViewMode('QUANTITIES')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                viewMode === 'QUANTITIES'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Métrés Seuls
            </button>
            <button
              onClick={() => setViewMode('FINANCIAL')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                viewMode === 'FINANCIAL'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Financier (DA)
            </button>
          </div>

          {/* Expand/Collapse */}
          <button
            onClick={expandAllLots}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 shadow-xs"
            title="Déplier tous les lots"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span>Déplier</span>
          </button>
          <button
            onClick={collapseAllLots}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 shadow-xs"
            title="Replier tous les lots"
          >
            <Minimize2 className="w-3.5 h-3.5" />
            <span>Replier</span>
          </button>

          {/* Quick CSV Export */}
          <button
            onClick={() => exportBudgetToCsv(metadata, workPackages, items)}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg shadow-xs transition-colors"
            title="Exporter le bordereau actuel au format CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span>CSV</span>
          </button>
        </div>
      </div>

      {/* TABLE CONTAINER */}
      <div className="overflow-x-auto max-h-[750px] relative">
        <table className="w-full text-left border-collapse min-w-[1400px]">
          {/* HEADER GROUPS */}
          <thead className="sticky top-0 z-20 bg-slate-900 text-white text-[11px] font-semibold tracking-wide">
            {/* Super Category Headers */}
            <tr className="border-b border-slate-700 bg-slate-950/95 text-slate-300">
              <th colSpan={3} className="py-2 px-3 text-left border-r border-slate-800">
                1. IDENTIFICATION TECHNIQUE
              </th>
              <th className="py-2 px-2 text-right border-r border-slate-800">
                PRIX BASE
              </th>
              {viewMode !== 'FINANCIAL' && (
                <>
                  <th colSpan={3} className="py-2 px-3 text-center border-r border-slate-800 bg-slate-900/90 text-sky-300">
                    2. MÉTRÉS CONTRACTUELS PHYSIQUES
                  </th>
                  <th colSpan={4} className="py-2 px-3 text-center border-r border-slate-800 bg-slate-900/70 text-blue-300">
                    3. PLANNING QUANTITATIF PRÉVISIONNEL (OCT - DÉC 2026)
                  </th>
                </>
              )}
              {viewMode !== 'QUANTITIES' && (
                <>
                  <th colSpan={3} className="py-2 px-3 text-center border-r border-slate-800 bg-slate-900/90 text-emerald-300">
                    4. VALORISATION CONTRACTUELLE (DA)
                  </th>
                  <th colSpan={4} className="py-2 px-3 text-center border-r border-slate-800 bg-slate-900/70 text-amber-300">
                    5. CADENCEMENT BUDGÉTAIRE PRÉVISIONNEL (DA)
                  </th>
                </>
              )}
              <th className="py-2 px-2 text-center">STATUT</th>
            </tr>

            {/* Individual Columns */}
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="border-b border-slate-800">
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    style={{ width: header.getSize() }}
                    className="py-2 px-2 text-slate-200 border-r border-slate-800 last:border-r-0 whitespace-nowrap text-center text-[10px] font-bold"
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>

          {/* BODY: GROUPED BY WORK PACKAGE */}
          <tbody className="divide-y divide-slate-200 text-xs">
            {workPackages.map((wp) => {
              const lotItems = itemsByLot.get(wp.id) || [];
              const isExpanded = !!expandedLots[wp.id];
              const summary = lotSummaries.find((s) => s.workPackageId === wp.id);

              if (selectedLotFilter !== 'ALL' && selectedLotFilter !== wp.id) {
                return null;
              }

              return (
                <React.Fragment key={wp.id}>
                  {/* LOT SECTION HEADER ROW */}
                  <tr
                    onClick={() => toggleLotExpansion(wp.id)}
                    className="cursor-pointer bg-slate-100/90 hover:bg-slate-200/80 transition-colors border-y-2 border-slate-300"
                  >
                    <td
                      colSpan={table.getVisibleFlatColumns().length}
                      className="py-2.5 px-3 text-slate-800 font-bold"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="p-1 rounded bg-white shadow-xs text-slate-700">
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4 text-blue-600" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-slate-600" />
                            )}
                          </span>
                          <span className="px-2 py-0.5 text-xs bg-blue-700 text-white rounded font-mono font-bold tracking-wide">
                            {wp.code}
                          </span>
                          <span className="text-sm font-semibold text-slate-900">
                            {wp.title}
                          </span>
                          <span className="text-xs text-slate-500 font-normal">
                            ({lotItems.length} article{lotItems.length > 1 ? 's' : ''})
                          </span>
                        </div>

                        {summary && (
                          <div className="flex items-center gap-4 text-xs font-mono">
                            <span className="text-slate-600">
                              Marché : <strong className="text-slate-900">{formatDA(summary.contractAmount)}</strong>
                            </span>
                            <span className="text-slate-600">
                              Reste : <strong className="text-slate-900">{formatDA(summary.remainingAmount)}</strong>
                            </span>
                            <span className="text-slate-600">
                              Prévision Trimestre : <strong className="text-blue-800">{formatDA(summary.totalForecastAmount)}</strong>
                            </span>
                            {summary.isBalanced ? (
                              <span className="px-2 py-0.5 rounded text-[11px] font-sans font-semibold bg-emerald-100 text-emerald-800">
                                100% Conforme
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[11px] font-sans font-semibold bg-red-100 text-red-800">
                                Écart : {formatDA(summary.totalForecastAmount - summary.remainingAmount)}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>

                  {/* LOT ITEMS (When Expanded) */}
                  {isExpanded &&
                    lotItems.map((item, idx) => {
                      const row = table.getRowModel().rows.find((r) => r.original.id === item.id);
                      if (!row) return null;

                      const isEven = idx % 2 === 0;

                      return (
                        <tr
                          key={item.id}
                          className={`hover:bg-blue-50/60 transition-colors ${
                            isEven ? 'bg-white' : 'bg-slate-50/40'
                          }`}
                        >
                          {row.getVisibleCells().map((cell) => (
                            <td
                              key={cell.id}
                              className="py-1 px-1.5 border-r border-slate-200 last:border-r-0 align-middle"
                            >
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </td>
                          ))}
                        </tr>
                      );
                    })}

                  {/* LOT SUBTOTAL ROW */}
                  {isExpanded && summary && (
                    <tr className="bg-slate-200/70 border-b-2 border-slate-400 font-bold text-xs text-slate-900">
                      <td colSpan={3} className="py-2 px-3 text-right pr-4 font-sans tracking-wide">
                        SOUS-TOTAL {wp.code} :
                      </td>
                      <td className="border-r border-slate-300"></td>

                      {/* Quantities subtotals blank (units differ) */}
                      {viewMode !== 'FINANCIAL' && (
                        <>
                          <td className="border-r border-slate-300"></td>
                          <td className="border-r border-slate-300"></td>
                          <td className="border-r border-slate-300"></td>
                          <td className="border-r border-slate-300"></td>
                          <td className="border-r border-slate-300"></td>
                          <td className="border-r border-slate-300"></td>
                          <td className="border-r border-slate-300"></td>
                        </>
                      )}

                      {/* Financial amounts subtotals */}
                      {viewMode !== 'QUANTITIES' && (
                        <>
                          <td className="py-2 px-2 text-right font-mono border-r border-slate-300">
                            {formatDA(summary.contractAmount)}
                          </td>
                          <td className="py-2 px-2 text-right font-mono text-emerald-800 border-r border-slate-300">
                            {formatDA(summary.previousAmount)}
                          </td>
                          <td className="py-2 px-2 text-right font-mono border-r border-slate-300">
                            {formatDA(summary.remainingAmount)}
                          </td>
                          <td className="py-2 px-2 text-right font-mono text-blue-900 border-r border-slate-300 bg-blue-100/40">
                            {formatDA(summary.monthlyAmounts['2026-10'] || 0)}
                          </td>
                          <td className="py-2 px-2 text-right font-mono text-indigo-900 border-r border-slate-300 bg-indigo-100/40">
                            {formatDA(summary.monthlyAmounts['2026-11'] || 0)}
                          </td>
                          <td className="py-2 px-2 text-right font-mono text-purple-900 border-r border-slate-300 bg-purple-100/40">
                            {formatDA(summary.monthlyAmounts['2026-12'] || 0)}
                          </td>
                          <td className="py-2 px-2 text-right font-mono text-slate-950 border-r border-slate-300">
                            {formatDA(summary.totalForecastAmount)}
                          </td>
                        </>
                      )}

                      <td className="text-center py-2 px-1">
                        {summary.isBalanced ? (
                          <span className="text-emerald-700 text-xs">✓ OK</span>
                        ) : (
                          <span className="text-red-700 text-xs">⚠️ Écart</span>
                        )}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>

          {/* GRAND TOTAL ROW */}
          <tfoot className="sticky bottom-0 z-20 bg-slate-950 text-white font-bold text-xs shadow-lg">
            <tr className="border-t-2 border-amber-400">
              <td colSpan={3} className="py-3 px-3 text-right pr-4 font-sans tracking-wider text-amber-300 text-xs uppercase">
                TOTAL GÉNÉRAL CONSOLIDÉ DU MARCHÉ :
              </td>
              <td className="border-r border-slate-800"></td>

              {viewMode !== 'FINANCIAL' && (
                <>
                  <td className="border-r border-slate-800"></td>
                  <td className="border-r border-slate-800"></td>
                  <td className="border-r border-slate-800"></td>
                  <td className="border-r border-slate-800"></td>
                  <td className="border-r border-slate-800"></td>
                  <td className="border-r border-slate-800"></td>
                  <td className="border-r border-slate-800"></td>
                </>
              )}

              {viewMode !== 'QUANTITIES' && (
                <>
                  <td className="py-3 px-2 text-right font-mono border-r border-slate-800 text-slate-200">
                    {formatDA(consolidation.totalContractAmount)}
                  </td>
                  <td className="py-3 px-2 text-right font-mono text-emerald-400 border-r border-slate-800">
                    {formatDA(consolidation.totalPreviousAmount)}
                  </td>
                  <td className="py-3 px-2 text-right font-mono text-slate-200 border-r border-slate-800">
                    {formatDA(consolidation.totalRemainingAmount)}
                  </td>
                  <td className="py-3 px-2 text-right font-mono text-sky-300 border-r border-slate-800 bg-blue-950/60">
                    {formatDA(consolidation.monthlyTotals['2026-10'] || 0)}
                  </td>
                  <td className="py-3 px-2 text-right font-mono text-indigo-300 border-r border-slate-800 bg-indigo-950/60">
                    {formatDA(consolidation.monthlyTotals['2026-11'] || 0)}
                  </td>
                  <td className="py-3 px-2 text-right font-mono text-purple-300 border-r border-slate-800 bg-purple-950/60">
                    {formatDA(consolidation.monthlyTotals['2026-12'] || 0)}
                  </td>
                  <td className="py-3 px-2 text-right font-mono text-amber-400 border-r border-slate-800 font-extrabold text-sm">
                    {formatDA(consolidation.totalForecastThreeMonths)}
                  </td>
                </>
              )}

              <td className="text-center py-3 px-1">
                {consolidation.isBalanced ? (
                  <span className="px-2 py-0.5 rounded text-[11px] font-sans font-bold bg-emerald-500 text-slate-950">
                    100.00%
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded text-[11px] font-sans font-bold bg-red-500 text-white">
                    Écart
                  </span>
                )}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};
