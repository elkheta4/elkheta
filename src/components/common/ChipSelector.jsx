'use client';
import React from 'react';

const ChipSelector = ({ options, selected, onSelect, multiple = false }) => {
  if (!options) return null;

  return (
    <div className="chip-container">
      {options.map(opt => {
        // If opt is object {label, value}, handle that, else string
        const val = typeof opt === 'object' ? opt.value : opt;
        const label = typeof opt === 'object' ? opt.label : opt;

        let isActive = false;
        if (multiple && Array.isArray(selected)) {
          isActive = selected.includes(val);
        } else {
          isActive = selected === val;
        }

        return (
          <div
            key={val}
            className={`chip ${isActive ? 'active' : ''}`}
            onClick={() => {
              // logic: toggle if multiple, or simple select if single (with toggle off?)
              // Original logic: "Toggle On: Clear siblings... Toggle Off if already active"
              if (isActive) {
                if (multiple) {
                  onSelect(selected.filter(s => s !== val));
                } else {
                  onSelect(''); // Toggle off
                }
              } else {
                if (multiple) {
                  onSelect([...(selected || []), val]);
                } else {
                  onSelect(val);
                }
              }
            }}
          >
            {label}
          </div>
        );
      })}
    </div>
  );
};

export default ChipSelector;
