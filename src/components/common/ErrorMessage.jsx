'use client';
import React from 'react';
import { AlertTriangle, RefreshCw, XCircle } from 'lucide-react';
import './ErrorMessage.css';

/**
 * Reusable Error Message Component
 * Displays user-friendly error messages with retry functionality
 */
const ErrorMessage = ({ 
  error, 
  onRetry, 
  title = 'Something went wrong',
  showDetails = false 
}) => {
  // Parse error message
  const errorMessage = typeof error === 'string' 
    ? error 
    : error?.message || error?.error || 'An unexpected error occurred';

  return (
    <div className="error-message-container">
      <div className="error-message-content">
        <div className="error-icon">
          <XCircle size={48} />
        </div>
        
        <h3 className="error-title">{title}</h3>
        
        <p className="error-description">{errorMessage}</p>

        {onRetry && (
          <button 
            onClick={onRetry} 
            className="error-retry-btn"
          >
            <RefreshCw size={18} />
            Try Again
          </button>
        )}

        {showDetails && error?.stack && process.env.NODE_ENV === 'development' && (
          <details className="error-details">
            <summary>Technical Details</summary>
            <pre>{error.stack}</pre>
          </details>
        )}
      </div>
    </div>
  );
};

export default ErrorMessage;
