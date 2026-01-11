'use client';
import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Check, X, Search } from 'lucide-react';
import './FilterDropdowns.css';

const GenericFilterDropdown = ({
  value,
  onChange,
  options = [],
  placeholder = "Select...",
  icon: Icon
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  // Filter options based on search
  const filteredOptions = options.filter(opt =>
    opt.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleDropdown = () => {
    if (!isOpen) {
      setIsOpen(true);
      setSearchQuery('');
      setHighlightIndex(-1); // Start with nothing highlighted
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setIsOpen(false);
    }
  };

  const handleSelect = (option) => {
    onChange(option);
    setIsOpen(false);
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange('');
  };

  // Handle Click Outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleKeyDown = (e) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === 'ArrowDown') {
        toggleDropdown();
        e.preventDefault();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightIndex(prev => {
          // If -1, jump to 0. Else next.
          const next = prev < filteredOptions.length - 1 ? prev + 1 : prev;
          if (prev === -1) {
            scrollHighlightIntoView(0);
            return 0;
          }
          scrollHighlightIntoView(next);
          return next;
        });
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightIndex(prev => {
          if (prev <= 0) return prev; // Don't go below 0
          const next = prev - 1;
          scrollHighlightIntoView(next);
          return next;
        });
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredOptions[highlightIndex]) {
          handleSelect(filteredOptions[highlightIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        break;
      default:
        break;
    }
  };

  const scrollHighlightIntoView = (index) => {
    if (listRef.current) {
      const item = listRef.current.children[index];
      if (item) {
        item.scrollIntoView({ block: 'nearest' });
      }
    }
  };

  return (
    <div className="custom-dropdown-container" ref={dropdownRef}>
      <div
        className={`custom-dropdown-trigger ${isOpen ? 'active' : ''} ${value ? 'has-value' : ''}`}
        onClick={toggleDropdown}
        onKeyDown={handleKeyDown}
        tabIndex={0}
      >
        {Icon && <Icon size={16} className="dropdown-icon" />}
        <span className="dropdown-label">
          {value || placeholder}
        </span>
        {value ? (
          <div className="clear-dropdown-btn" onClick={handleClear}>
            <X size={14} />
          </div>
        ) : (
          <ChevronDown size={14} className="chevron-icon" />
        )}
      </div>

      {isOpen && (
        <div className="custom-dropdown-menu">
          <div className="dropdown-search-box">
            <Search size={14} className="search-icon" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setHighlightIndex(0);
              }}
              onKeyDown={handleKeyDown}
              className="dropdown-search-input"
            />
          </div>
          <div className="dropdown-list" ref={listRef}>
            {filteredOptions.length === 0 ? (
              <div className="no-options-found">No results</div>
            ) : (
              filteredOptions.map((opt, idx) => {
                const isSelected = value === opt;
                return (
                  <div
                    key={opt}
                    className={`dropdown-option ${idx === highlightIndex ? 'highlighted' : ''} ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleSelect(opt)}
                    onMouseEnter={() => setHighlightIndex(idx)}
                  >
                    <span>{opt}</span>
                    {isSelected && <Check size={14} className="check-icon" />}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default GenericFilterDropdown;
