import React, { useState, useEffect } from 'react';
import { useBudgetStore } from '../store/useBudgetStore';
import {
  initAuth,
  googleSignIn,
  logout,
  getAccessToken,
} from '../services/auth';
import {
  createBudgetSpreadsheet,
  listUserSpreadsheets,
  readSpreadsheetValues,
  SpreadsheetFileInfo,
} from '../services/googleSheetsService';
import { User } from 'firebase/auth';
import {
  X,
  FileSpreadsheet,
  ExternalLink,
  Plus,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  FolderOpen,
  LogOut,
  ShieldAlert,
} from 'lucide-react';

interface GoogleSheetsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GoogleSheetsModal: React.FC<GoogleSheetsModalProps> = ({ isOpen, onClose }) => {
  const { metadata, workPackages, items, updateItemField } = useBudgetStore();

  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createdSheet, setCreatedSheet] = useState<{
    spreadsheetId: string;
    spreadsheetUrl: string;
    title: string;
  } | null>(null);
  const [recentSheets, setRecentSheets] = useState<SpreadsheetFileInfo[]>([]);
  const [isLoadingSheets, setIsLoadingSheets] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Destructive Confirmation Modal State
  const [confirmOperation, setConfirmOperation] = useState<{
    type: 'OVERWRITE_SHEET' | 'IMPORT_DATA';
    sheetId: string;
    sheetName: string;
  } | null>(null);

  useEffect(() => {
    const unsubscribe = initAuth(
      (currentUser, currentToken) => {
        setUser(currentUser);
        setToken(currentToken);
        if (currentUser && currentToken) {
          loadUserSheets(currentToken);
        }
      },
      () => {
        setUser(null);
        setToken(null);
        setRecentSheets([]);
      }
    );
    return () => unsubscribe();
  }, []);

  const loadUserSheets = async (tok: string) => {
    try {
      setIsLoadingSheets(true);
      const list = await listUserSpreadsheets(tok);
      setRecentSheets(list);
    } catch (err: any) {
      console.warn('Impossible de charger les fichiers Drive:', err);
    } finally {
      setIsLoadingSheets(false);
    }
  };

  const handleLogin = async () => {
    try {
      setIsLoggingIn(true);
      setStatusMessage(null);
      const res = await googleSignIn();
      if (res) {
        setUser(res.user);
        setToken(res.accessToken);
        await loadUserSheets(res.accessToken);
      }
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err?.message || 'Échec de la connexion à Google.',
      });
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    setUser(null);
    setToken(null);
    setCreatedSheet(null);
    setRecentSheets([]);
    setStatusMessage(null);
  };

  const handleCreateNewSheet = async () => {
    let currentToken = token;
    if (!currentToken) {
      currentToken = await getAccessToken();
    }

    if (!currentToken) {
      setStatusMessage({
        type: 'error',
        text: 'Veuillez vous reconnecter à votre compte Google.',
      });
      return;
    }

    try {
      setIsCreating(true);
      setStatusMessage(null);
      const res = await createBudgetSpreadsheet(metadata, workPackages, items, currentToken);
      setCreatedSheet(res);
      setStatusMessage({
        type: 'success',
        text: 'Feuille Google Sheets créée avec succès avec les 44 postes et formules contractuelles !',
      });
      await loadUserSheets(currentToken);
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err?.message || 'Erreur lors de la création sur Google Sheets.',
      });
    } finally {
      setIsCreating(false);
    }
  };

  // Execution after explicit confirmation dialog
  const handleExecuteConfirmedOperation = async () => {
    if (!confirmOperation) return;
    const { type, sheetId, sheetName } = confirmOperation;
    setConfirmOperation(null);

    let currentToken = token || (await getAccessToken());
    if (!currentToken) return;

    if (type === 'IMPORT_DATA') {
      try {
        setIsLoadingSheets(true);
        setStatusMessage(null);
        // Read values from the sheet
        const rows = await readSpreadsheetValues(sheetId, 'A7:J55', currentToken);
        let updatedCount = 0;

        rows.forEach((row) => {
          const itemNum = parseInt(row[0], 10);
          if (!isNaN(itemNum)) {
            const matchingItem = items.find((it) => it.itemNumber === itemNum);
            if (matchingItem) {
              const octQty = parseFloat(String(row[6]).replace(',', '.'));
              const novQty = parseFloat(String(row[7]).replace(',', '.'));
              const decQty = parseFloat(String(row[8]).replace(',', '.'));

              if (!isNaN(octQty)) updateItemField(matchingItem.id, '2026-10', octQty);
              if (!isNaN(novQty)) updateItemField(matchingItem.id, '2026-11', novQty);
              if (!isNaN(decQty)) updateItemField(matchingItem.id, '2026-12', decQty);
              updatedCount++;
            }
          }
        });

        setStatusMessage({
          type: 'success',
          text: `Synchronisation réussie : ${updatedCount} postes mis à jour depuis « ${sheetName} ».`,
        });
      } catch (err: any) {
        setStatusMessage({
          type: 'error',
          text: err?.message || 'Erreur lors de l’importation depuis Google Sheets.',
        });
      } finally {
        setIsLoadingSheets(false);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-800 to-teal-900 text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-xl">
              <FileSpreadsheet className="w-6 h-6 text-emerald-300" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                Intégration Google Sheets & Google Drive
              </h3>
              <p className="text-xs text-emerald-200">
                Synchronisation en direct du bordereau prévisionnel de Khemisti
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg text-emerald-200 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* USER AUTH STATUS */}
          {!user ? (
            <div className="p-5 rounded-xl border border-slate-200 bg-slate-50 text-center space-y-4">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-800">
                  Connexion à Google Workspace
                </h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 leading-relaxed">
                  Autorisez l'application à créer et synchroniser des classeurs Google Sheets directement sur votre Google Drive pour le suivi du chantier.
                </p>
              </div>

              {/* Official Google Sign-in Button */}
              <button
                onClick={handleLogin}
                disabled={isLoggingIn}
                className="inline-flex items-center justify-center gap-3 px-5 py-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-xl shadow-xs hover:shadow-sm transition-all mx-auto disabled:opacity-60"
              >
                {isLoggingIn ? (
                  <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                ) : (
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                )}
                <span>Se connecter avec Google</span>
              </button>
            </div>
          ) : (
            <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/60 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'Utilisateur'}
                    className="w-10 h-10 rounded-full border border-emerald-300"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-sm">
                    {user.email?.charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <div className="text-xs font-bold text-slate-800">
                    {user.displayName || 'Compte Google Connecté'}
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono">
                    {user.email}
                  </div>
                </div>
              </div>

              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-rose-700 hover:bg-rose-100 rounded-lg font-medium transition-colors border border-rose-200"
                title="Se déconnecter"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Déconnexion</span>
              </button>
            </div>
          )}

          {/* STATUS NOTIFICATION */}
          {statusMessage && (
            <div
              className={`p-3 rounded-xl flex items-center gap-2.5 text-xs font-medium ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-red-50 text-red-800 border border-red-200'
              }`}
            >
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              )}
              <span>{statusMessage.text}</span>
            </div>
          )}

          {/* PRIMARY ACTION: CREATE SPREADSHEET */}
          {user && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                      <Plus className="w-4 h-4 text-emerald-600" />
                      Créer une nouvelle feuille Google Sheets
                    </h4>
                    <p className="text-xs text-slate-500 mt-1">
                      Génère un classeur complet avec la mise en page officielle, les 44 postes techniques du Port de Khemisti, et les formules automatiques (SOMME, calcul des restes et montants).
                    </p>
                  </div>

                  <button
                    onClick={handleCreateNewSheet}
                    disabled={isCreating}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow-sm transition-all shrink-0 disabled:opacity-50"
                  >
                    {isCreating ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <FileSpreadsheet className="w-4 h-4" />
                    )}
                    <span>Générer la feuille</span>
                  </button>
                </div>

                {/* Newly Created Sheet Link */}
                {createdSheet && (
                  <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-emerald-900">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span className="font-medium truncate max-w-xs">{createdSheet.title}</span>
                    </div>

                    <a
                      href={createdSheet.spreadsheetUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded-md text-xs font-semibold shadow-xs"
                    >
                      <span>Ouvrir dans Google Sheets</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                )}
              </div>

              {/* RECENT SPREADSHEETS FROM DRIVE */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                    <FolderOpen className="w-4 h-4 text-amber-500" />
                    <span>Feuilles Google Sheets sur votre Drive ({recentSheets.length})</span>
                  </div>

                  <button
                    onClick={() => token && loadUserSheets(token)}
                    disabled={isLoadingSheets}
                    className="p-1 rounded text-slate-500 hover:text-slate-800 hover:bg-slate-200 transition-colors"
                    title="Actualiser la liste"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoadingSheets ? 'animate-spin' : ''}`} />
                  </button>
                </div>

                <div className="max-h-48 overflow-y-auto divide-y divide-slate-100 text-xs">
                  {recentSheets.length === 0 ? (
                    <div className="p-6 text-center text-slate-400">
                      {isLoadingSheets ? 'Recherche des classeurs...' : 'Aucun classeur trouvé sur Google Drive.'}
                    </div>
                  ) : (
                    recentSheets.map((s) => (
                      <div
                        key={s.id}
                        className="p-2.5 hover:bg-slate-50 transition-colors flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-slate-800 truncate" title={s.name}>
                            {s.name}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            Modifié le {new Date(s.modifiedTime).toLocaleDateString('fr-FR')}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() =>
                              setConfirmOperation({
                                type: 'IMPORT_DATA',
                                sheetId: s.id,
                                sheetName: s.name,
                              })
                            }
                            className="px-2 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded text-[11px] font-semibold transition-colors"
                            title="Importer les quantités planifiées depuis cette feuille"
                          >
                            Synchroniser
                          </button>

                          <a
                            href={s.webViewLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 text-slate-400 hover:text-slate-700"
                            title="Ouvrir"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white rounded-lg"
          >
            Fermer
          </button>
        </div>
      </div>

      {/* MANDATORY CONFIRMATION DIALOG FOR DATA IMPORT/UPDATE */}
      {confirmOperation && (
        <div className="fixed inset-0 z-60 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-5 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3 text-amber-600">
              <ShieldAlert className="w-6 h-6" />
              <h4 className="text-sm font-bold text-slate-900">
                Confirmation d'écrasement des données
              </h4>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Êtes-vous certain de vouloir importer et synchroniser les valeurs de la feuille{' '}
              <strong className="text-slate-900 font-semibold">« {confirmOperation.sheetName} »</strong> ?
              Cette opération mettra à jour les quantités prévisionnelles dans l'application avec les données distantes de Google Sheets.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setConfirmOperation(null)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900 rounded-lg border border-slate-200"
              >
                Annuler
              </button>
              <button
                onClick={handleExecuteConfirmedOperation}
                className="px-3.5 py-1.5 text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white rounded-lg shadow-xs"
              >
                Confirmer la synchronisation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
