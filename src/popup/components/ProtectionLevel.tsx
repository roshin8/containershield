import React from 'react';
import type { ProtectionLevel as Level } from '@/types';
import {
  PROTECTION_LEVEL_NAMES,
  PROTECTION_LEVEL_DESCRIPTIONS,
} from '@/lib/constants';

interface Props {
  level: Level;
  onChange: (level: Level) => void;
  disabled?: boolean;
}

const LEVEL_COLORS: Record<Level, string> = {
  0: 'bg-gray-600',
  1: 'bg-yellow-600',
  2: 'bg-green-600',
  3: 'bg-red-600',
};

export default function ProtectionLevel({ level, onChange, disabled }: Props) {
  const levels: Level[] = [0, 1, 2, 3];

  return (
    <div className={`space-y-3 ${disabled ? 'opacity-50' : ''}`}>
      <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">
        Protection Level
      </h3>

      <div className="grid grid-cols-4 gap-2">
        {levels.map((l) => (
          <button
            key={l}
            onClick={() => !disabled && onChange(l)}
            disabled={disabled}
            className={`
              px-3 py-2 rounded-lg text-center transition-all
              ${
                level === l
                  ? `${LEVEL_COLORS[l]} text-white ring-2 ring-white/30`
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }
              ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}
            `}
          >
            <div className="text-lg font-bold">{l}</div>
            <div className="text-xs">{PROTECTION_LEVEL_NAMES[l]}</div>
          </button>
        ))}
      </div>

      <p className="text-sm text-gray-400 p-2 bg-gray-800/50 rounded">
        {PROTECTION_LEVEL_DESCRIPTIONS[level]}
      </p>
    </div>
  );
}
