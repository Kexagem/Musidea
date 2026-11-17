
import React from 'react';
import type { OptionType } from '../types';

interface SelectControlProps {
  label: string;
  value: string;
  onChange: (event: React.ChangeEvent<HTMLSelectElement>) => void;
  options: OptionType;
  icon?: React.ReactNode;
}

const SelectControl: React.FC<SelectControlProps> = ({ label, value, onChange, options, icon }) => (
  <div>
    <label className="block text-xs font-medium text-gray-400 mb-1">
      {icon}{icon && ' '}{label}
    </label>
    <select
      value={value}
      onChange={onChange}
      className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors text-sm text-gray-200"
    >
      {Object.entries(options).map(([key, name]) => (
        <option key={key} value={key} className="bg-gray-700 text-gray-200">
          {name}
        </option>
      ))}
    </select>
  </div>
);

export default SelectControl;
