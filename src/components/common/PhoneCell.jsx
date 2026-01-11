'use client';
import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, Copy, X } from 'lucide-react';
import './PhoneCell.css';

/**
 * PhoneCell - Clickable phone number with:
 * - Left click: Copy to clipboard, shows "Copied" text
 * - Right click: Custom context menu with WhatsApp option
 */
const PhoneCell = ({ number, label }) => {
  const [showMenu, setShowMenu] = useState(false);
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });
  const [showCopied, setShowCopied] = useState(false);
  const menuRef = useRef(null);

  // Clean number (remove spaces, dashes)
  const cleanNumber = number ? number.toString().replace(/[\s\-]/g, '') : '';

  // Format for WhatsApp (add Egypt country code if needed)
  const getWhatsAppNumber = () => {
    if (cleanNumber.startsWith('0')) {
      return `20${cleanNumber.slice(1)}`;
    } else if (cleanNumber.startsWith('+')) {
      return cleanNumber.slice(1);
    }
    return cleanNumber;
  };

  // Handle left click - copy
  const handleCopy = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!number) return;

    try {
      await navigator.clipboard.writeText(number.toString());
      setShowCopied(true);
      setTimeout(() => setShowCopied(false), 1000);
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = number.toString();
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setShowCopied(true);
      setTimeout(() => setShowCopied(false), 2000);
    }
  };

  // Handle right click - show menu
  const handleContextMenu = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!number) return;

    setMenuPos({ x: e.clientX, y: e.clientY });
    setShowMenu(true);
  };

  // Close menu on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowMenu(false);
      }
    };

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showMenu]);

  // Get WhatsApp URL
  const whatsappUrl = `https://web.whatsapp.com/send/?phone=${getWhatsAppNumber()}`;

  // Copy from menu
  const copyFromMenu = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    await handleCopy(e);
    setShowMenu(false);
  };

  if (!number || number === '-') {
    return <span className="phone-cell phone-cell--empty">-</span>;
  }

  return (
    <span className="phone-cell-wrapper">
      <span
        className={`phone-cell ${showCopied ? 'phone-cell--copied' : ''}`}
        onClick={handleCopy}
        onContextMenu={handleContextMenu}
        title="Left-click: Copy | Right-click: WhatsApp"
      >
        {showCopied ? 'Copied!' : number}
      </span>

      {showMenu && (
        <div
          ref={menuRef}
          className="phone-menu phone-menu--simple"
          style={{ top: menuPos.y, left: menuPos.x }}
        >
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="phone-menu__item phone-menu__item--whatsapp"
            onClick={() => setShowMenu(false)}
          >
            <MessageCircle size={16} />
            Chat on WhatsApp
          </a>
        </div>
      )}
    </span>
  );
};

export default PhoneCell;
