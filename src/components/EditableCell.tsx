import React, { useState, useEffect, useRef } from 'react';

interface EditableCellProps {
  value: number;
  onCommit: (newVal: number) => { success: boolean; message?: string } | void;
  format?: 'currency' | 'quantity' | 'number';
  disabled?: boolean;
  min?: number;
  max?: number;
  className?: string;
  isOverBudget?: boolean;
}

export const EditableCell: React.FC<EditableCellProps> = ({
  value,
  onCommit,
  format = 'quantity',
  disabled = false,
  min = 0,
  className = '',
  isOverBudget = false,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempValue, setTempValue] = useState(String(value));
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isEditing) {
      setTempValue(String(value));
    }
  }, [value, isEditing]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleStartEdit = () => {
    if (disabled) return;
    setTempValue(String(value));
    setErrorMessage(null);
    setIsEditing(true);
  };

  const handleCancel = () => {
    setTempValue(String(value));
    setErrorMessage(null);
    setIsEditing(false);
  };

  const handleSave = () => {
    // replace french comma with dot
    const cleanStr = tempValue.replace(/\s/g, '').replace(',', '.');
    const parsed = parseFloat(cleanStr);

    if (isNaN(parsed)) {
      setErrorMessage('Valeur numérique requise');
      return;
    }

    if (parsed < min) {
      setErrorMessage(`Min: ${min}`);
      return;
    }

    const res = onCommit(parsed);
    if (res && !res.success) {
      setErrorMessage(res.message || 'Erreur de saisie');
      return;
    }

    setIsEditing(false);
    setErrorMessage(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  };

  const formattedDisplay = () => {
    if (format === 'currency') {
      return new Intl.NumberFormat('fr-DZ', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(value) + ' DA';
    }
    return new Intl.NumberFormat('fr-DZ', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 3,
    }).format(value);
  };

  if (isEditing) {
    return (
      <div className="relative inline-block w-full">
        <input
          ref={inputRef}
          type="text"
          value={tempValue}
          onChange={(e) => {
            setTempValue(e.target.value);
            setErrorMessage(null);
          }}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          className="w-full text-right px-2 py-1 text-xs font-mono font-bold bg-white text-blue-900 border-2 border-blue-500 rounded shadow-inner outline-none ring-2 ring-blue-200"
        />
        {errorMessage && (
          <div className="absolute z-30 right-0 top-full mt-1 px-2 py-1 bg-red-600 text-white text-[10px] rounded shadow-md whitespace-nowrap">
            {errorMessage}
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      onClick={handleStartEdit}
      title={disabled ? 'Cellule calculée (non modifiable)' : 'Cliquer pour modifier la valeur'}
      className={`group cursor-pointer select-none text-right px-2 py-1 rounded transition-colors duration-150 font-mono text-xs ${
        disabled
          ? 'cursor-not-allowed opacity-90'
          : 'hover:bg-blue-50 hover:text-blue-900 hover:ring-1 hover:ring-blue-300'
      } ${
        isOverBudget
          ? 'bg-red-50 text-red-700 font-bold ring-1 ring-red-400'
          : value > 0
          ? 'text-slate-800'
          : 'text-slate-400'
      } ${className}`}
    >
      <span>{formattedDisplay()}</span>
      {!disabled && (
        <span className="hidden group-hover:inline-block ml-1 text-[9px] text-blue-500 font-sans">
          ✎
        </span>
      )}
    </div>
  );
};
