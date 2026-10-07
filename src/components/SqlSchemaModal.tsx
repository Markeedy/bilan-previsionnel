import React, { useState } from 'react';
import { X, Copy, Check, Database, Code2 } from 'lucide-react';

interface SqlSchemaModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SQL_CODE = `-- =====================================================================
-- ARCHITECTURE SUPABASE / POSTGRESQL POUR SUIVI BUDGÉTAIRE BTP
-- PROJET : TRAVAUX DE RÉHABILITATION DU PORT DE KHEMISTI (TIPAZA)
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Table maîtresse des projets de génie civil et travaux publics
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name TEXT NOT NULL,
    client_name TEXT NOT NULL,
    contractor_name TEXT NOT NULL,
    total_budget NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Table des lots et chapitres techniques
CREATE TABLE work_packages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    code VARCHAR(20) NOT NULL,
    title TEXT NOT NULL,
    display_order INT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (project_id, code)
);

-- 3. Table des articles techniques du bordereau des prix (avec colonnes STORED)
CREATE TABLE market_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    work_package_id UUID NOT NULL REFERENCES work_packages(id) ON DELETE CASCADE,
    item_number INT NOT NULL,
    designation TEXT NOT NULL,
    unit VARCHAR(10) NOT NULL,
    unit_price NUMERIC(15, 2) NOT NULL CHECK (unit_price >= 0),
    contract_quantity NUMERIC(12, 3) NOT NULL CHECK (contract_quantity >= 0),
    previous_quantity NUMERIC(12, 3) NOT NULL DEFAULT 0.000 CHECK (previous_quantity >= 0),
    remaining_quantity NUMERIC(12, 3) GENERATED ALWAYS AS (contract_quantity - previous_quantity) STORED,
    total_contract_amount NUMERIC(15, 2) GENERATED ALWAYS AS (contract_quantity * unit_price) STORED,
    previous_amount NUMERIC(15, 2) GENERATED ALWAYS AS (previous_quantity * unit_price) STORED,
    remaining_amount NUMERIC(15, 2) GENERATED ALWAYS AS ((contract_quantity - previous_quantity) * unit_price) STORED,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT check_quantity_bounds CHECK (previous_quantity <= contract_quantity),
    UNIQUE (work_package_id, item_number)
);

-- 4. Table des prévisions et jalonnements mensuels (extensibilité temporelle)
CREATE TABLE monthly_forecasts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    item_id UUID NOT NULL REFERENCES market_items(id) ON DELETE CASCADE,
    year_month DATE NOT NULL,
    forecast_quantity NUMERIC(12, 3) NOT NULL DEFAULT 0.000 CHECK (forecast_quantity >= 0),
    actual_quantity NUMERIC(12, 3) NOT NULL DEFAULT 0.000 CHECK (actual_quantity >= 0),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (item_id, year_month)
);

CREATE INDEX idx_items_package ON market_items(work_package_id);
CREATE INDEX idx_forecasts_item_date ON monthly_forecasts(item_id, year_month);

-- 5. Trigger PL/pgSQL d'intégrité budgétaire stricte
CREATE OR REPLACE FUNCTION validate_forecast_quantity()
RETURNS TRIGGER AS $$
DECLARE
    v_contract_qty NUMERIC(12, 3);
    v_prev_qty NUMERIC(12, 3);
    v_total_forecast NUMERIC(12, 3);
BEGIN
    SELECT contract_quantity, previous_quantity 
    INTO v_contract_qty, v_prev_qty
    FROM market_items 
    WHERE id = NEW.item_id;

    SELECT COALESCE(SUM(forecast_quantity), 0)
    INTO v_total_forecast
    FROM monthly_forecasts
    WHERE item_id = NEW.item_id AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);

    IF (v_total_forecast + NEW.forecast_quantity) > (v_contract_qty - v_prev_qty) THEN
        RAISE EXCEPTION 'Violation de contrainte budgétaire : la somme des prévisions mensuelles (%) excède le solde restant à réaliser (%) sur cet article.',
            (v_total_forecast + NEW.forecast_quantity), (v_contract_qty - v_prev_qty);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validate_forecast_quantity
BEFORE INSERT OR UPDATE ON monthly_forecasts
FOR EACH ROW EXECUTE FUNCTION validate_forecast_quantity();

-- 6. Politiques de Sécurité au niveau de la ligne (Supabase RLS)
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_forecasts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Consultation autorisée pour les intervenants du projet"
ON projects FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM project_members pm
        WHERE pm.project_id = projects.id AND pm.user_id = auth.uid()
    )
);

CREATE POLICY "Modification réservée au management de chantier"
ON monthly_forecasts FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM project_members pm
        JOIN market_items mi ON mi.id = monthly_forecasts.item_id
        JOIN work_packages wp ON wp.id = mi.work_package_id
        WHERE wp.project_id = pm.project_id 
          AND pm.user_id = auth.uid() 
          AND pm.role IN ('project_director', 'site_manager')
    )
);
`;

export const SqlSchemaModal: React.FC<SqlSchemaModalProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(SQL_CODE);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-slate-900 rounded-2xl max-w-4xl w-full shadow-2xl overflow-hidden border border-slate-700 flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/20 text-amber-400 rounded-lg">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                Architecture de Base de Données Supabase & PostgreSQL 15+
              </h3>
              <p className="text-xs text-slate-400">
                Schéma relationnel normalisé, Triggers PL/pgSQL d'intégrité budgétaire et Politiques RLS
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-lg shadow-sm transition-all"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copié !' : 'Copier le script SQL'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Code Content */}
        <div className="flex-1 overflow-y-auto p-4 bg-slate-950 font-mono text-xs text-emerald-400 selection:bg-blue-600 selection:text-white">
          <pre className="whitespace-pre">{SQL_CODE}</pre>
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-900 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <Code2 className="w-4 h-4 text-amber-400" />
            <span>Conforme aux spécifications d'ingénierie financière de l'E.G.U.V.A / GITRA</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white rounded-lg"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
