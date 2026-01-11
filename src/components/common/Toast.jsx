'use client';
import React, { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import './Toast.css';

const Toast = ({ message, type = 'success', onClose }) => {
  const [isExiting, setIsExiting] = useState(false);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => {
      onClose();
    }, 300); // Wait for exit animation
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      handleClose();
    }, 2000); // Start exit after 2s

    return () => clearTimeout(timer);
  }, []);

  const getIcon = () => {
      switch(type) {
          case 'success': return <CheckCircle2 size={24} className="toast-icon-svg success" />;
          case 'error': return <XCircle size={24} className="toast-icon-svg error" />;
          case 'warning': return <AlertTriangle size={24} className="toast-icon-svg warning" />;
          default: return <Info size={24} className="toast-icon-svg info" />;
      }
  };

  return (
    <div className={`toast-notification toast-${type} ${isExiting ? 'toast-exiting' : ''}`}>
      <div className="toast-content">
        <div className="toast-icon-wrapper">
            {getIcon()}
        </div>
        <span className="toast-message">{message}</span>
      </div>
      <button className="toast-close" onClick={handleClose}><X size={18} /></button>
    </div>
  );
};

export default Toast;
