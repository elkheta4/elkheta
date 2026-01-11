'use client';
import React, { useState, useEffect, useRef } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import './DatePicker.css';

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const DAY_NAMES = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

const DatePicker = ({
  value,
  onChange,
  label,
  placeholder = "Select Date",
  name,
  id,
  required = false,
  position = "bottom" // 'bottom' or 'top'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Initial view state (Current Month/Year)
  // If value exists, start viewing that month, otherwise today's month
  const getInitialDate = () => {
    if (value && !isNaN(new Date(value).getTime())) {
      return new Date(value);
    }
    return new Date();
  };

  const [viewDate, setViewDate] = useState(getInitialDate());

  // Update view if externally value changes (optional UX choice, usually good)
  useEffect(() => {
    if (value) {
      const d = new Date(value);
      if (!isNaN(d.getTime())) {
        setViewDate(d);
      }
    }
  }, [value]);

  // Handle Click Outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Format display string (YYYY-MM-DD for value, but maybe prettier for input?)
  // Requirement says "Style the input field...". 
  // Usually best to show YYYY-MM-DD or DD MMM YYYY.
  // Let's stick to YYYY-MM-DD as it's the standard value format, 
  // OR format it nicely for display if the input is readOnly.
  // Let's make the input readOnly to prevent bad manual typing, forcing picker use.

  // Helper: Get days in month
  const getDaysInMonth = (year, month) => {
    return new Date(year, month + 1, 0).getDate();
  };

  // Helper: Get start day of week (0-6)
  const getFirstDayOfMonth = (year, month) => {
    return new Date(year, month, 1).getDay();
  };

  const handlePrevMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  };

  const handleDayClick = (day) => {
    // Construct YYYY-MM-DD
    // Note: Month is 0-indexed in JS Date, but we need 01-12
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth() + 1;
    const padMonth = month < 10 ? `0${month}` : month;
    const padDay = day < 10 ? `0${day}` : day;

    const dateStr = `${year}-${padMonth}-${padDay}`;
    onChange(dateStr);
    setIsOpen(false);
  };

  const handleToday = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth() + 1;
    const day = today.getDate();

    const padMonth = month < 10 ? `0${month}` : month;
    const padDay = day < 10 ? `0${day}` : day;

    const dateStr = `${year}-${padMonth}-${padDay}`;

    onChange(dateStr);
    setViewDate(today);
    setIsOpen(false);
  };

  // Render Logic
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const startDay = getFirstDayOfMonth(year, month);

  // Prepare grid slots
  const slots = [];
  // Empty slots for previous month padding
  for (let i = 0; i < startDay; i++) {
    slots.push(<div key={`empty-${i}`} className="datepicker-day empty"></div>);
  }
  // Day slots
  for (let d = 1; d <= daysInMonth; d++) {
    // Check if selected
    // Value format: YYYY-MM-DD
    // Current slot: year-month-d
    const currentSlotStr = `${year}-${(month + 1).toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
    const isSelected = value === currentSlotStr;

    // Check if today
    const today = new Date();
    const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === d;

    slots.push(
      <div
        key={d}
        className={`datepicker-day ${isSelected ? 'selected' : ''} ${isToday ? 'today' : ''}`}
        onClick={() => handleDayClick(d)}
      >
        {d}
      </div>
    );
  }

  return (
    <div className="datepicker-container" ref={containerRef}>
      {label && <label className="new-order__label" htmlFor={id}>{label} {required && <span className="req">*</span>}</label>}

      <div className="datepicker-input-wrapper" onClick={() => setIsOpen(!isOpen)}>
        <input
          type="text"
          id={id}
          name={name}
          className="datepicker-input"
          placeholder={placeholder}
          value={value || ''}
          readOnly
        // Make it readonly so popup is primary interaction, 
        // preventing invalid text. can allow typing later if requested.
        />
        <CalendarIcon size={16} className="datepicker-icon" />
      </div>

      {isOpen && (
        <div className={`datepicker-popup ${position === 'top' ? 'datepicker-popup--top' : ''}`}>
          <div className="datepicker-header">
            <button type="button" className="datepicker-nav-btn" onClick={handlePrevMonth}>
              <ChevronLeft size={16} />
            </button>
            <div className="datepicker-title">
              {MONTH_NAMES[month]} {year}
            </div>
            <button type="button" className="datepicker-nav-btn" onClick={handleNextMonth}>
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="datepicker-footer">
            <button type="button" className="datepicker-today-link" onClick={handleToday}>
              Select Today
            </button>
          </div>

          <div className="datepicker-grid">
            {DAY_NAMES.map(dn => (
              <div key={dn} className="datepicker-day-name">{dn}</div>
            ))}
          </div>

          <div className="datepicker-grid">
            {slots}
          </div>
        </div>
      )}
    </div>
  );
};

export default DatePicker;
