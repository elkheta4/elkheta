import React, { useEffect, useState } from 'react';
import { X, ExternalLink, Loader2 } from 'lucide-react';
import './ProofModal.css';

const ProofModal = ({ isOpen, onClose, url, altText = 'Proof Image' }) => {
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);
    const [isClosing, setIsClosing] = useState(false);

    // Reset state when URL changes
    useEffect(() => {
        setIsLoading(true);
        setHasError(false);
        setIsClosing(false);
    }, [url, isOpen]);

    const handleClose = () => {
        setIsClosing(true);
        // Wait for animation (200ms matches CSS)
        setTimeout(() => {
            onClose();
            setIsClosing(false);
        }, 200);
    };

    // Handle ESC key to close
    useEffect(() => {
        const handleEsc = (e) => {
            if (e.key === 'Escape') handleClose();
        };
        if (isOpen) window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [isOpen]);

    if (!isOpen || !url) return null;

    // Convert Drive View URL to Direct Image URL
    const getDirectUrl = (viewUrl) => {
        try {
            // Check if it's a Google Drive URL
            if (viewUrl.includes('drive.google.com')) {
                // Extract ID: patterns like /file/d/ID/view or /open?id=ID
                const idMatch = viewUrl.match(/\/d\/(.*?)\/view/) || viewUrl.match(/id=(.*?)(&|$)/);
                if (idMatch && idMatch[1]) {
                    // Use the thumbnail endpoint which is much more reliable for embedding than uc?export=view
                    // sz=w2000 requests a width of up to 2000px (high quality)
                    return `https://drive.google.com/thumbnail?id=${idMatch[1]}&sz=w2000`;
                }
            }
        } catch (e) {
            console.error('Error parsing Drive URL', e);
        }
        return viewUrl; // Return original if not a drive link or parse failed
    };

    const directUrl = getDirectUrl(url);

    return (
        <div 
            className={`proof-modal__overlay ${isClosing ? 'closing' : ''}`} 
            onClick={handleClose} 
            aria-modal="true" 
            role="dialog"
        >
            <div 
                className={`proof-modal__content ${isClosing ? 'closing' : ''}`} 
            >
                <button className="proof-modal__close-btn" onClick={handleClose} aria-label="Close">
                    <X size={24} />
                </button>

                <div 
                    className="proof-modal__image-wrapper"
                    onClick={e => e.stopPropagation()}
                >
                    {isLoading && !hasError && (
                        <div className="proof-modal__loader">
                            <Loader2 size={48} className="spinner-spin" />
                        </div>
                    )}
                    
                    {!hasError ? (
                        <img 
                            src={directUrl} 
                            alt={altText} 
                            referrerPolicy="no-referrer"
                            className={`proof-modal__image ${isLoading ? 'hidden' : ''}`}
                            onLoad={() => setIsLoading(false)}
                            onError={() => {
                                setIsLoading(false);
                                setHasError(true);
                            }}
                        />
                    ) : (
                        <div className="proof-modal__error">
                            <p>Preview missing or private.</p>
                            <a href={url} target="_blank" rel="noopener noreferrer" className="proof-modal__link-btn">
                                Open in Google Drive <ExternalLink size={16} />
                            </a>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ProofModal;
