import React, { useState } from 'react';
import { useBudgetStore } from '../store/useBudgetStore';
import { X, History, Trash2, Shield, Search } from 'lucide-react';

interface AuditLogModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuditLogModal: React.FC<AuditLogModalProps> = ({ isOpen, onClose }) => {
  const { auditLogs, clearAuditLogs } = useBudgetStore();
  const [filterQuery, setFilterQuery] = useState('');

  if (!isOpen) return null;

  const filtered = auditLogs.filter((log) => {
    if (!filterQuery) return true;
    const q = filterQuery.toLowerCase();
    return (
      String(log.itemNumber).includes(q) ||
      log.designation.toLowerCase().includes(q) ||
      log.fieldLabel.toLowerCase().includes(q) ||
      log.user.toLowerCase().includes(q)
    );
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="bg-slate-900 text-white p-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-600/30 text-blue-400 rounded-lg">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                Registre d'Audit & Traçabilité des Métrés (BTP)
                <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300 font-normal">
                  {auditLogs.length} évènement{auditLogs.length > 1 ? 's' : ''}
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Historique légal conforme aux exigences de révision des décomptes (E.G.U.V.A / GITRA)
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar */}
        <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filtrer l'audit..."
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {auditLogs.length > 0 && (
            <button
              onClick={clearAuditLogs}
              className="flex items-center gap-1 px-2.5 py-1 text-xs text-rose-600 hover:bg-rose-50 rounded-md border border-rose-200 font-medium transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Effacer l'historique</span>
            </button>
          )}
        </div>

        {/* Content list */}
        <div className="flex-1 overflow-y-auto p-4">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <Shield className="w-10 h-10 mx-auto text-slate-300 mb-2" />
              <p className="text-xs font-medium text-slate-600">Aucun enregistrement d'audit</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Modifiez une cellule de quantité ou de prix unitaire pour créer un enregistrement traçable.
              </p>
            </div>
          ) : (
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 text-slate-700 font-bold text-[10px] uppercase border-b border-slate-200">
                  <tr>
                    <th className="py-2 px-3">Date & Heure</th>
                    <th className="py-2 px-2 text-center">Poste</th>
                    <th className="py-2 px-3">Désignation</th>
                    <th className="py-2 px-3">Paramètre</th>
                    <th className="py-2 px-3 text-right">Ancienne Valeur</th>
                    <th className="py-2 px-3 text-right">Nouvelle Valeur</th>
                    <th className="py-2 px-3">Intervenant</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {filtered.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2 px-3 text-slate-500 text-[11px]">
                        {new Date(log.timestamp).toLocaleString('fr-FR')}
                      </td>
                      <td className="py-2 px-2 text-center font-bold text-slate-800">
                        #{log.itemNumber}
                      </td>
                      <td className="py-2 px-3 font-sans text-slate-800 max-w-xs truncate text-[11px]" title={log.designation}>
                        {log.designation}
                      </td>
                      <td className="py-2 px-3 font-sans font-semibold text-blue-700 text-[11px]">
                        {log.fieldLabel}
                      </td>
                      <td className="py-2 px-3 text-right text-slate-400 line-through">
                        {log.oldValue}
                      </td>
                      <td className="py-2 px-3 text-right font-bold text-emerald-700 bg-emerald-50/50">
                        {log.newValue}
                      </td>
                      <td className="py-2 px-3 font-sans text-slate-600 text-[11px]">
                        {log.user}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white rounded-lg"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
