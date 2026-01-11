'use client';
import React, { useState, useMemo, useEffect } from 'react';
import { Plus, Check, Wallet, X, ChevronDown, Calendar, CreditCard, ArrowUpRight, ArrowDownLeft, Trash2, Loader2, RefreshCw, UploadCloud, FileText, Eye } from 'lucide-react';
import './WalletPage.css';
import ProofModal from '@/components/common/ProofModal';
import Toast from '@/components/common/Toast';

// Extracted Component for Per-Day Performance & Logic
const DailyBlock = ({ day, walletNum, expectedBalance, onAddExpense, onCloseDay, onDeleteExpense, onViewProof, showToast }) => {
  const [isOpen, setIsOpen] = useState(() => {
    // Auto-expand if today
    if (!day.date) return false;

    const now = new Date();
    const d = now.getDate();
    const m = now.getMonth() + 1;
    const y = now.getFullYear();

    // Normalize function: 01/01/2025 -> 1/1/2025
    const normalize = (dateStr) => {
      return String(dateStr).trim().split('/').map(p => parseInt(p)).join('/');
    };

    const todayStr = `${d}/${m}/${y}`;
    const dayDateStr = normalize(day.date);

    return dayDateStr === normalize(todayStr);
  });

  // Local state for inputs to prevent full-page re-renders
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseLink, setExpenseLink] = useState('');

  const [closingBalance, setClosingBalance] = useState('');

  // File Upload State
  const [proofFile, setProofFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Local loading state
  const [isAdding, setIsAdding] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  const toggleDate = () => setIsOpen(!isOpen);

  const handleAdd = async () => {
    if (!expenseAmount || !expenseLink) return;
    setIsAdding(true);
    await onAddExpense(day, { amount: expenseAmount, link: expenseLink });
    setIsAdding(false);
    setExpenseAmount('');
    setExpenseLink('');
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate Type
      if (!file.type.startsWith('image/')) {
        showToast('Please upload an image file (JPG, PNG).', 'error');
        e.target.value = ''; // Reset input
        return;
      }
      // Validate Size (1MB max)
      if (file.size > 1 * 1024 * 1024) {
        showToast('File size too large. Max 1MB.', 'error');
        e.target.value = ''; // Reset input
        return;
      }
      setProofFile(file);
    }
  };

  const clearFile = (e) => {
    e.stopPropagation(); // Prevent triggering dropzone click
    setProofFile(null);
  };

  const handleClose = async () => {
    if (!proofFile && !day.proof) return;

    setIsClosing(true);
    setUploadProgress(0);

    // Simulate Smoother Progress
    // Increment by 2% every 40ms
    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 95) return prev; // Hold at 95 until done
        return prev + 2;
      });
    }, 40);

    // Small initial delay for UX
    await new Promise(r => setTimeout(r, 500));

    try {
      await onCloseDay(day, {
        actualBalance: closingBalance === '' ? '0' : closingBalance,
        proofFile: proofFile,
        dateStr: day.date
      });

      clearInterval(interval);
      setUploadProgress(100);
      setProofFile(null);
      showToast('Day closed successfully!', 'success'); // Success toast
    } catch (error) {
      console.error("Closure Error:", error);
      clearInterval(interval);
      showToast("Failed to submit closure.", 'error'); // Error toast
    } finally {
      setIsClosing(false);
    }
  };

  const handleDelete = (idx) => {
    onDeleteExpense(day, idx);
  };

  // Helper to parse numbers
  const parseNum = (val) => parseFloat(String(val).replace(/,/g, '')) || 0;

  // Live Diff Calculation for Open State
  const sysBalNum = parseNum(expectedBalance);
  const userBalNum = parseNum(closingBalance);
  const diff = userBalNum - sysBalNum;
  const isMatch = Math.abs(diff) < 0.01; // float tolerance

  // Diff Calculation for Closed State
  const closedActual = parseNum(day.closedBalance);
  // Re-calculate diff based on the captured closed balance vs what system expected
  const closedDiff = closedActual - sysBalNum;
  const isClosedMatch = Math.abs(closedDiff) < 0.01;

  return (
    <div className={`wp-daily-block ${day.closed ? 'submitted' : ''} ${isOpen ? 'expanded' : 'collapsed'}`}>
      <div className="wp-db-header" onClick={toggleDate}>
        <div className="wp-db-left">
          {day.closed && <Check size={18} className="text-success" />}
          <Calendar size={18} className="text-secondary" />
          <span className="wp-db-date">{day.date}</span>
        </div>

        {!isOpen && (
          <div className="wp-db-meta">
            <span className="in">+{day.dailyIncome}</span>
            <span className="out">-{day.dailyExpenses}</span>
          </div>
        )}

        <ChevronDown className="wp-db-toggle-icon" size={20} />
      </div>

      {isOpen && (
        <div className="wp-db-content">
          {/* Day Stats */}
          <div className="wp-day-grid">
            <div className="wp-day-stat income">
              <ArrowDownLeft size={18} className="wp-day-stat-icon" />
              <div className="wp-day-stat-info">
                <label>Daily Income</label>
                <span>+{day.dailyIncome}</span>
              </div>
            </div>
            <div className="wp-day-stat expense">
              <ArrowUpRight size={18} className="wp-day-stat-icon" />
              <div className="wp-day-stat-info">
                <label>Daily Expenses</label>
                <span>-{day.dailyExpenses}</span>
              </div>
            </div>
          </div>

          {/* Expense List */}
          {day.expenses.length > 0 && (
            <div className="wp-txn-list">
              {day.expenses.map((exp, i) => (
                <div key={i} className="wp-txn-row">
                  <div className="wp-txn-info">
                    <span className="wp-txn-desc">{exp.name}</span>
                    <div className="wp-txn-meta">
                      {exp.link && <a href={exp.link} target="_blank" className="wp-txn-sub">Doc Of Expenses</a>}
                    </div>
                  </div>
                  {!day.closed && (
                    <button
                      className="wp-btn-delete"
                      onClick={() => handleDelete(i)}
                      title="Delete Expense"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                  <span className="wp-txn-amt">-{exp.amount}</span>
                </div>
              ))}
            </div>
          )}

          {/* Add Expense Form */}
          {!day.closed && (day.expenses.length < 4) && (
            <div className="wp-add-row">
              <input
                name="expenseAmount"
                placeholder="Amount"
                className="wp-input amount"
                value={expenseAmount}
                onChange={e => setExpenseAmount(e.target.value)}
              />
              <input
                name="expenseLink"
                placeholder="Link"
                className="wp-input desc"
                value={expenseLink}
                onChange={e => setExpenseLink(e.target.value)}
              />
              <button
                className={`wp-btn-add ${isAdding ? 'is-loading' : ''}`}
                onClick={handleAdd}
                disabled={isAdding || !expenseAmount || !expenseLink}
                title={(!expenseAmount || !expenseLink) ? "Enter Amount and Link" : "Add Expense"}
              >
                {isAdding ? (
                  <>
                    <Loader2 size={16} className="wp-spinner" />
                    <span>Adding...</span>
                  </>
                ) : (
                  <>
                    <Plus size={16} />
                    <span>Add Expense</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Close Day Section */}
          <div className="wp-reconcile-footer">

            {day.closed ? (
              // CLOSED STATE
              <div className="wp-closed-container">
                <div className="wp-closed-summary">
                  <div className="wp-closed-badge">
                    <div className="icon-box"><Check size={16} strokeWidth={3} /></div>
                    <span>Day Closed @ <strong>{(parseFloat(String(day.closedBalance).replace(/,/g, '')) || 0).toLocaleString()} EGP</strong></span>
                  </div>
                  <button
                    className="wp-closed-proof"
                    onClick={() => onViewProof(day.proof)}
                    title="View Proof"
                  >
                    View Proof <Eye size={20} />
                  </button>
                </div>

                {/* Mismatch Warning */}
                {!isClosedMatch && (
                  <div className="wp-closed-warning">
                    <div className="warning-icon"><X size={16} /></div>
                    <div className="warning-text">
                      <span className="status">Status: Not Matched</span>
                      <span className="diff">Remaining: {closedDiff > 0 ? '+' : ''}{closedDiff.toLocaleString()} EGP</span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              // OPEN STATE (2 Rows Layout)
              <div className="wp-closure-form-container">

                {/* Row 1: Comparison (System Balance + Actual Input + Diff) */}
                <div className="wp-closure-row top">
                  <div className="wp-sys-stat">
                    <span className="label">System Balance :</span>
                    <span className="value">{sysBalNum.toLocaleString()} EGP</span>
                  </div>

                  <div className="wp-actual-group">
                    <input
                      type="number"
                      placeholder="Actual Balance"
                      className="wp-input wp-compact-input"
                      name="actualBalance"
                      value={closingBalance}
                      onChange={(e) => setClosingBalance(e.target.value)}
                    />

                    <div className={`wp-diff-pill ${isMatch ? 'success' : 'error'}`}>
                      {isMatch ? <Check size={14} /> : <X size={14} />}
                      <span>{isMatch ? 'Match' : `${diff > 0 ? '+' : ''}${diff.toLocaleString()}`}</span>
                    </div>
                  </div>
                </div>

                {/* Row 2: Proof Upload Area */}
                <div className="wp-closure-row bottom">

                  {!proofFile ? (
                    <div
                      className={`wp-upload-zone ${isDragging ? 'dragging' : ''}`}
                      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                      onDragLeave={() => setIsDragging(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setIsDragging(false);
                        if (e.dataTransfer.files?.[0]) handleFileSelect({ target: { files: e.dataTransfer.files } });
                      }}
                      onClick={() => document.getElementById(`file-upload-${walletNum}-${day.date}`).click()}
                    >
                      <input
                        id={`file-upload-${walletNum}-${day.date}`}
                        type="file"
                        accept="image/*"
                        onChange={handleFileSelect}
                        hidden
                      />
                      <UploadCloud size={20} className="wp-upload-icon" />
                      <span>Click or Drag Proof Image</span>
                    </div>
                  ) : (
                    <div className="wp-file-preview-card">
                      <div className="wp-file-info">
                        <div className="wp-file-icon"><FileText size={16} /></div>
                        <span className="wp-filename">{proofFile.name}</span>
                        <span className="wp-filesize">{(proofFile.size / 1024).toFixed(0)}KB</span>
                      </div>
                      <button className="wp-remove-file" onClick={clearFile} disabled={isClosing}>
                        <X size={14} />
                      </button>
                      {isClosing && (
                        <div className="wp-upload-progress">
                          <div className="wp-progress-bar" style={{ width: `${uploadProgress}%` }}></div>
                        </div>
                      )}
                    </div>
                  )}

                  <button
                    className={`wp-btn-submit-closure ${isClosing ? 'is-loading' : ''}`}
                    onClick={handleClose}
                    disabled={isClosing || !proofFile}
                    title={!proofFile ? "Proof image required" : "Submit Closure"}
                  >
                    {isClosing ? (
                      <>
                        <Loader2 size={16} className="wp-spinner" />
                        <span>{uploadProgress < 100 ? `${uploadProgress}%` : 'Saving...'}</span>
                      </>
                    ) : (
                      <>Submit <ArrowUpRight size={16} /></>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const WalletPage = () => {
  // User State
  const [user, setUser] = useState(null);
  const [walletData, setWalletData] = useState([]);
  const [selectedWalletNum, setSelectedWalletNum] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Delete Confirmation Modal State
  const [deleteModal, setDeleteModal] = useState({ show: false, day: null, expenseIndex: null });
  const [isDeleting, setIsDeleting] = useState(false);

  // Proof Preview State
  const [previewProof, setPreviewProof] = useState(null);

  // Last Updated State
  const [lastUpdated, setLastUpdated] = useState('');

  // Toast State
  const [toast, setToast] = useState({ message: '', type: 'info' });

  const CACHE_TTL = 2 * 60 * 1000; // 2 minutes

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
  };

  const handleCloseToast = () => {
    setToast({ message: '', type: '' });
  };

  // 1. Load User on Mount
  useEffect(() => {
    const sessionUser = sessionStorage.getItem('currentUser');
    if (sessionUser) {
      const parsed = JSON.parse(sessionUser);
      setUser(parsed);

      if (parsed.wallets?.length > 0) {
        setSelectedWalletNum(parsed.wallets[0]);

        // Check cache
        const cacheKey = `wallet_cache_${parsed.agentName}`;
        const cached = sessionStorage.getItem(cacheKey);
        let shouldFetch = true;

        if (cached) {
          const { data, timestamp, updatedStr } = JSON.parse(cached);
          const age = Date.now() - timestamp;

          // Show cached data immediately
          setWalletData(data);
          setLastUpdated(updatedStr);
          setLoading(false);

          // Only fetch if cache is older than 2 minutes
          if (age < CACHE_TTL) {
            shouldFetch = false;
          }
        }

        if (shouldFetch) {
          fetchWalletData(parsed.agentName, parsed.wallets);
        }

      } else {
        setLoading(false);
        setError('No wallets assigned.');
      }
    } else {
      setLoading(false);
      setError('Please login first.');
    }
  }, []);

  // 2. Fetch Data
  const fetchWalletData = async (agentName, wallets) => {
    try {
      const res = await fetch('/api/wallets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'fetch', agentName, wallets })
      });
      const data = await res.json();

      if (data.success) {
        setWalletData(data.wallets);
        setLoading(false);
        setRefreshing(false);

        // Save to Cache
        const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        setLastUpdated(nowStr);

        const cacheKey = `wallet_cache_${agentName}`;
        sessionStorage.setItem(cacheKey, JSON.stringify({
          data: data.wallets,
          timestamp: Date.now(),
          updatedStr: nowStr
        }));

      } else {
        // Clear stale cache when sheet no longer exists
        const cacheKey = `wallet_cache_${agentName}`;
        sessionStorage.removeItem(cacheKey);
        setWalletData([]);
        setError(data.error || 'Failed to fetch');
        setLoading(false);
      }
    } catch (err) {
      console.error(err);
      setError('Network error');
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    if (!user) return;
    setRefreshing(true);
    fetchWalletData(user.agentName, user.wallets);
  };

  // 3. Derived State and Logic
  const selectedWallet = useMemo(() => {
    return walletData.find(w => String(w.walletNumber) === String(selectedWalletNum));
  }, [walletData, selectedWalletNum]);

  // Calculate Expected Balances Day-by-Day
  // Logic: Day End System = Prev End + Income - Expense
  const daysWithBalance = useMemo(() => {
    if (!selectedWallet) return [];

    const parse = (v) => parseFloat(String(v).replace(/,/g, '')) || 0;
    let runningBalance = parse(selectedWallet.fromLastMonth);

    return selectedWallet.days.map(day => {
      const inc = parse(day.dailyIncome);
      const exp = parse(day.dailyExpenses);
      const sysEnd = runningBalance + inc - exp;

      const dayWithSys = { ...day, systemEndBalance: sysEnd };

      // Update running for next day
      // CRITICAL: Always use system calculated balance for next day to isolate errors.
      // Even if user closed with a wrong amount, the system expects the correct amount next day.
      runningBalance = sysEnd;

      return dayWithSys;
    });
  }, [selectedWallet]);

  // 4. Handlers
  // Add Expense
  const handleAddExpense = async (day, { amount, link }) => {
    const walletIndex = walletData.findIndex(w => String(w.walletNumber) === String(selectedWalletNum));
    setRefreshing(true);

    try {
      const currentExpenses = day.expenses || [];

      const newExpenses = [
        ...currentExpenses,
        { name: 'Expense', amount: amount, link: link || '' } // Date Removed
      ];

      await fetch('/api/wallets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'updateDay',
          agentName: user.agentName,
          walletIndex,
          data: {
            rowIndex: day.rowIndex,
            expenses: newExpenses,
            closedBalance: day.closedBalance,
            proof: day.proof
          }
        })
      });
      await fetchWalletData(user.agentName, user.wallets);
    } catch (err) {
      alert('Failed to add expense'); // This alert was not part of the instruction to change, keeping it.
      setRefreshing(false);
    }
  };

  // Show Delete Modal
  const showDeleteModal = (day, expenseIndex) => {
    setDeleteModal({ show: true, day, expenseIndex });
  };

  // Hide Delete Modal
  const hideDeleteModal = () => {
    setDeleteModal({ show: false, day: null, expenseIndex: null });
  };

  // Close modal on Escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && deleteModal.show) {
        hideDeleteModal();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [deleteModal.show]);

  // Delete Expense (called when confirmed)
  const handleDeleteExpense = async () => {
    const { day, expenseIndex } = deleteModal;
    setIsDeleting(true);

    const walletIndex = walletData.findIndex(w => String(w.walletNumber) === String(selectedWalletNum));

    try {
      const newExpenses = [...day.expenses];
      newExpenses.splice(expenseIndex, 1);

      await fetch('/api/wallets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'updateDay',
          agentName: user.agentName,
          walletIndex,
          data: {
            rowIndex: day.rowIndex,
            expenses: newExpenses,
            closedBalance: day.closedBalance,
            proof: day.proof
          }
        })
      });

      await fetchWalletData(user.agentName, user.wallets);
    } catch (err) {
      // Silent fail
    } finally {
      setIsDeleting(false);
      hideDeleteModal();
    }
  };

  // Close Day
  const handleCloseDay = async (day, { actualBalance, proof, proofFile, dateStr }) => {
    const walletIndex = walletData.findIndex(w => String(w.walletNumber) === String(selectedWalletNum));
    setRefreshing(true);

    try {
      const formData = new FormData();
      formData.append('action', 'updateDay');
      formData.append('agentName', user.agentName);
      formData.append('walletIndex', walletIndex);
      formData.append('walletNumber', selectedWalletNum); // Pass explicitly for folder naming
      formData.append('dateStr', dateStr);

      // Data Object Construction
      // We need to pass data object. FormData is flat.
      // We can pass data fields individually or as a JSON string for the 'data' key?
      // API expects { walletIndex, data: { rowIndex... } }
      // Let's modify API loosely or structure formData to match body parsing

      const dayData = {
        rowIndex: day.rowIndex,
        expenses: day.expenses,
        closedBalance: actualBalance,
        proof: proof // existing link (if any?) usually null if we are uploading now
      };

      formData.append('data', JSON.stringify(dayData));

      if (proofFile) {
        formData.append('proofFile', proofFile);
      }

      await fetch('/api/wallets', {
        method: 'POST',
        // headers: { 'Content-Type': 'multipart/form-data' }, // Remove content-type for FormData (browser sets it with boundary)
        body: formData
      });

      await fetchWalletData(user.agentName, user.wallets);
      // Success toast is triggered locally in DailyBlock for better UX, or we can do it here

    } catch (err) {
      showToast('Failed to close day', 'error');
      setRefreshing(false);
      throw err; // Re-throw to let DailyBlock catch it
    }
  };

  if (loading) return (
    <div className="wp-loading-container">
      <Loader2 size={32} className="wp-spinner" />
      <p>Loading wallets...</p>
    </div>
  );

  if (error) return (
    <div className="wallet-page" style={{ justifyContent: 'center', alignItems: 'center', flexDirection: 'column' }}>
      <p style={{
        color: 'var(--danger-color)',
        direction: 'rtl',
        fontFamily: 'var(--font-arabic, Tajawal, sans-serif)',
        fontSize: '1.1rem',
        textAlign: 'center'
      }}>{error}</p>
      <Toast
        message={toast.message}
        type={toast.type}
        onClose={handleCloseToast}
      />
    </div>
  );

  return (
    <div className="wallet-page">
      {/* Toast Notification */}
      {toast.message && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={handleCloseToast}
        />
      )}

      {/* Sidebar */}
      <div className="wp-sidebar">
        <div className="wp-sidebar-header">
          <h2 className="wp-sidebar-title">My Wallets</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '14px', fontFamily: 'Poppins, sans-serif' }}>Updated: {lastUpdated}</span>
            <button
              className={`wp-refresh-btn ${refreshing ? 'spinning' : ''}`}
              onClick={handleRefresh}
              disabled={refreshing}
              title="Refresh data"
            >
              <RefreshCw size={16} />
            </button>
          </div>
        </div>

        <div className="wp-wallet-list">
          {walletData.map(w => {
            const isActive = String(selectedWalletNum) === String(w.walletNumber);
            return (
              <div
                key={w.walletNumber}
                className={`wp-simple-card ${isActive ? 'active' : ''}`}
                onClick={() => setSelectedWalletNum(w.walletNumber)}
              >
                <div className="wp-sc-left">
                  <div className="wp-sc-icon-box">
                    <Wallet size={20} className={isActive ? 'text-white' : 'text-primary'} />
                  </div>
                  <div className="wp-sc-info">
                    <span className="wp-sc-name">Vodafone Cash</span>
                    <span className="wp-sc-num">{w.walletNumber}</span>
                  </div>
                </div>
                <div className="wp-sc-right">
                  <span className="wp-sc-bal">{w.currentBalance}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Content */}
      <div className="wp-main">
        {selectedWallet && (
          <>
            {/* Header Stats */}
            <div className="wp-summary-grid">
              <div className="wp-stat-box">
                <div className="wp-stat-icon-wrapper start">
                  <Wallet size={20} />
                </div>
                <div className="wp-stat-info">
                  <span className="wp-stat-label">From Last Month</span>
                  <span className="wp-stat-value">{selectedWallet.fromLastMonth}</span>
                </div>
              </div>
              <div className="wp-stat-box">
                <div className="wp-stat-icon-wrapper income">
                  <ArrowDownLeft size={20} />
                </div>
                <div className="wp-stat-info">
                  <span className="wp-stat-label">Total Income</span>
                  <span className="wp-stat-value income">{selectedWallet.totalIncome}</span>
                </div>
              </div>
              <div className="wp-stat-box">
                <div className="wp-stat-icon-wrapper expense">
                  <ArrowUpRight size={20} />
                </div>
                <div className="wp-stat-info">
                  <span className="wp-stat-label">Total Expenses</span>
                  <span className="wp-stat-value expense">{selectedWallet.totalExpenses}</span>
                </div>
              </div>
              <div className="wp-stat-box">
                <div className="wp-stat-icon-wrapper balance">
                  <CreditCard size={20} />
                </div>
                <div className="wp-stat-info">
                  <span className="wp-stat-label">Current Balance</span>
                  <span className="wp-stat-value total">{selectedWallet.currentBalance}</span>
                </div>
              </div>
            </div>

            {/* Daily Ledger */}
            <div className="wp-ledger-list">
              {daysWithBalance.map((day, idx) => (
                <DailyBlock
                  key={day.rowIndex}
                  day={day}
                  walletNum={selectedWalletNum}
                  expectedBalance={day.systemEndBalance}
                  onAddExpense={handleAddExpense}
                  onCloseDay={handleCloseDay}
                  onDeleteExpense={showDeleteModal}
                  onViewProof={setPreviewProof}
                  showToast={showToast}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteModal.show && (
        <div className="wp-modal-overlay" onClick={hideDeleteModal}>
          <div className="wp-modal" onClick={e => e.stopPropagation()}>
            <div className="wp-modal-icon">
              <Trash2 size={24} />
            </div>
            <h3 className="wp-modal-title">حذف المصروف؟</h3>
            <p className="wp-modal-text">هل أنت متأكد من حذف هذا المصروف؟</p>
            <div className="wp-modal-actions">
              <button className="wp-modal-btn cancel" onClick={hideDeleteModal} disabled={isDeleting}>إلغاء</button>
              <button className="wp-modal-btn confirm" onClick={handleDeleteExpense} disabled={isDeleting}>
                {isDeleting ? <Loader2 size={16} className="wp-spinner" /> : 'حذف'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Proof Preview Modal */}
      <ProofModal
        isOpen={!!previewProof}
        onClose={() => setPreviewProof(null)}
        url={previewProof}
      />
    </div>
  );
};

export default WalletPage;
