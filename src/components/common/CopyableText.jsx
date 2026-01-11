'use client';
import React, { useState } from 'react';
import { copyToClipboard } from '../../utils/utils';
import './CopyableText.css';

const CopyableText = ({ text, className = '' }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e) => {
    e.stopPropagation(); // Prevent row click if any
    if (e.type === 'contextmenu') e.preventDefault(); // Prevent default menu on right-click

    if (!text || text === '-') return;

    // Pass null as callbacks since we handle UI state here
    copyToClipboard(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1000);
  };

  if (!text) return <span>-</span>;

  return (
    <span
      className={`copyable-text ${className}`}
      onClick={handleCopy}
      onContextMenu={handleCopy}
      title="Click (Left or Right) to copy"
      style={{
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: '90px',
        transition: 'all 0.2s',
        fontWeight: copied ? '600' : '500'
      }}
    >
      {copied ? 'Copied! ✅' : text}
    </span>
  );
};

export default CopyableText;
