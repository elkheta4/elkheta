'use client';

import { useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import './not-found.css'; // Re-use the nice 404 styles

export default function Error({ error, reset }) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error);
  }, [error]);

  return (
    <div className="not-found-container">
      <div className="nf-content">
        <h1 className="nf-code" style={{ fontSize: '6rem' }}>500</h1>
        <h2 className="nf-title">حصلت مشكلة غير متوقعة!</h2>
        <p className="nf-desc">
          ماتقلقش، السيرفر تعبان شوية.
          ممكن تجرب تعمل ريفريش، ولو المشكلة استمرت كلم الدعم.
        </p>

        <div className="nf-actions">
          <button
            onClick={reset}
            className="nf-btn primary"
          >
            <RefreshCw size={20} />
            حاول تاني
          </button>
        </div>

        {/* Optional: Dev Details */}
        {process.env.NODE_ENV === 'development' && (
          <div style={{ marginTop: '2rem', textAlign: 'left', background: 'rgba(0,0,0,0.05)', padding: '1rem', borderRadius: '8px', overflow: 'auto', maxHeight: '200px' }}>
            <p style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: 'red' }}>{error.message}</p>
          </div>
        )}
      </div>
    </div>
  );
}
