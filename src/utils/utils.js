/**
 * UTILITIES
 */

// Toast needs to be handled via Context/Callback in React. 
// We will export a simple helper if we use a library or global event.
// For now, only logical utils.

export function copyToClipboard(text, onSuccess, onError) {
  if (!text || text === '-') return;
  
  navigator.clipboard.writeText(text).then(() => {
    if (onSuccess) onSuccess('Phone number copied!');
  }).catch(err => {
    console.error('Failed to copy: ', err);
    if (onError) onError('Failed to copy');
  });
}

// Formatters
export function formatDate(dateStr) {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-GB');
}
