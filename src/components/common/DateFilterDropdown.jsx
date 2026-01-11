'use client';
import React, { useState, useEffect, useRef } from 'react';
import { Calendar, ChevronDown, Check, X, Search, CheckCheck } from 'lucide-react';
import './FilterDropdowns.css';

const DateFilterDropdown = ({
  value = [], // Array of selected dates strings (YYYY-MM-DD)
  onChange,
  dates = [],
  placeholder = "Filter by Date"
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  // Helper: Format YYYY-MM-DD -> 15 Dec 2025
  const formatDateDisplay = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  // Normalize value to always be an array
  const selectedDates = Array.isArray(value) ? value : (value ? [value] : []);

  // Filter dates based on search (Flexible: Check Raw OR Formatted)
  const filteredDates = dates.filter(date => {
    const query = searchQuery.toLowerCase();
    // 1. Check Raw (YYYY-MM-DD) -> Covers '2025', '12', '16' (if in string)
    if (date.includes(query)) return true;

    // 2. Check Formatted (15 Dec 2025) -> Covers 'Dec', '15', '2025'
    const formatted = formatDateDisplay(date).toLowerCase();
    if (formatted.includes(query)) return true;

    return false;
  });

  // Check if all filtered dates are selected
  const areAllFilteredSelected = filteredDates.length > 0 && filteredDates.every(d => selectedDates.includes(d));

  // Toggle dropdown
  const toggleDropdown = () => {
    if (!isOpen) {
      setIsOpen(true);
      setSearchQuery('');
      setHighlightIndex(-1);
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setIsOpen(false);
    }
  };

  // Toggle a single date selection
  const toggleDate = (date) => {
    let newSelection;
    if (selectedDates.includes(date)) {
      newSelection = selectedDates.filter(d => d !== date);
    } else {
      newSelection = [...selectedDates, date];
    }
    newSelection.sort();
    onChange(newSelection);
    inputRef.current?.focus();
  };

  // Toggle Select All
  const handleSelectAll = (e) => {
    let newSelection = [...selectedDates];

    if (!areAllFilteredSelected) {
      // Select All
      const toAdd = filteredDates.filter(d => !selectedDates.includes(d));
      newSelection = [...newSelection, ...toAdd];
    } else {
      // Deselect All Filtered
      newSelection = newSelection.filter(d => !filteredDates.includes(d));
    }
    newSelection.sort();
    onChange(newSelection);
    inputRef.current?.focus();
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

  // Handle Keyboard Navigation
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
          const next = prev < filteredDates.length - 1 ? prev + 1 : prev;
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
          if (prev <= 0) return prev;
          const next = prev - 1;
          scrollHighlightIntoView(next);
          return next;
        });
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredDates[highlightIndex]) {
          toggleDate(filteredDates[highlightIndex]);
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

  const renderLabel = () => {
    if (selectedDates.length === 0) return placeholder;
    // Format the single date for display
    if (selectedDates.length === 1) return formatDateDisplay(selectedDates[0]);
    return `${selectedDates.length} dates selected`;
  };

  return (
    <div className="custom-dropdown-container" ref={dropdownRef}>
      <div
        className={`custom-dropdown-trigger ${isOpen ? 'active' : ''} ${selectedDates.length > 0 ? 'has-value' : ''}`}
        onClick={toggleDropdown}
        onKeyDown={handleKeyDown}
        tabIndex={0}
      >
        <Calendar size={16} className="dropdown-icon" />
        <span className="dropdown-label">
          {renderLabel()}
        </span>
        {selectedDates.length > 0 ? (
          <div
            className="clear-dropdown-btn"
            onClick={(e) => {
              e.stopPropagation();
              onChange([]);
            }}
          >
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
              placeholder="Type 'Dec', '16', or '2025'..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setHighlightIndex(0);
              }}
              onKeyDown={handleKeyDown}
              className="dropdown-search-input"
            />
            <button
              className={`select-all-btn ${areAllFilteredSelected ? 'active' : ''}`}
              onClick={handleSelectAll}
              title={areAllFilteredSelected ? "Deselect All Filtered" : "Select All Filtered"}
            >
              <CheckCheck size={16} />
            </button>
          </div>
          <div className="dropdown-list" ref={listRef}>
            {filteredDates.length === 0 ? (
              <div className="no-options-found">No dates found</div>
            ) : (
              filteredDates.map((date, idx) => {
                const isSelected = selectedDates.includes(date);
                return (
                  <div
                    key={date}
                    className={`dropdown-option ${idx === highlightIndex ? 'highlighted' : ''} ${isSelected ? 'selected' : ''}`}
                    onClick={() => toggleDate(date)}
                    onMouseEnter={() => setHighlightIndex(idx)}
                  >
                    <span>{formatDateDisplay(date)}</span>
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

export default DateFilterDropdown;
