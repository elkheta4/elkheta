'use client';
import React, { useState, useEffect } from 'react';
import Store from '@/services/store';
import { callGasApi } from '@/services/api';
import { APP_SETTINGS } from '@/utils/constants';
import { X, User, Lock, Mail, Shield, Wallet, Save, Plus, PlusCircle, Loader2, RefreshCw, Trash2 } from 'lucide-react';
import Toast from '@/components/common/Toast';
import './UserManagement.css';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [error, setError] = useState(null);

  // Toast State
  const [toast, setToast] = useState(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null); // null = create

  // Form State
  const [formData, setFormData] = useState({
    username: '', password: '', email: '', agentName: '', role: 'User',
    walletsList: [''] // Dynamic list of wallets
  });
  const [isDirty, setIsDirty] = useState(false);
  const [initialState, setInitialState] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState(''); // New status state for inline feedback

  const fetchUsers = async (force = false) => {
    // Only show full table loader if we have no data
    if (users.length === 0) setLoading(true);
    if (force) setIsRefreshing(true);

    try {
      const res = await Store.fetch('users', 'getUsers', null, { ttl: APP_SETTINGS.cache.usersTTL, force, storage: 'local' });
      if (res.success) {
        setUsers(res.users);
        setLastUpdated(res.timestamp ? new Date(res.timestamp) : new Date());
      } else {
        setError(res.error || 'Failed to fetch users');
      }
    } catch (err) {
      setError('Network Error');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchUsers(false);
  }, []);

  const openModal = (user = null) => {
    setEditingUser(user);
    if (user) {
      // Parse wallets string "w1,w2,w3" to array
      const walletsArr = user.wallets ? String(user.wallets).split(',').map(w => w.trim()).filter(Boolean) : [''];
      if (walletsArr.length === 0) walletsArr.push('');

      const data = {
        userId: user.userId,
        username: user.username,
        password: user.password,
        email: user.email,
        agentName: user.agentName,
        role: user.role,
        walletsList: walletsArr
      };
      setFormData(data);
      setInitialState(data);
    } else {
      const data = {
        username: '', password: '', email: '', agentName: '', role: 'User',
        walletsList: ['']
      };
      setFormData(data);
      setInitialState(data);
    }
    setIsDirty(false);
    setStatusMessage(''); // Reset status
    setIsModalOpen(true);
  };

  // Close on Escape
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape' && isModalOpen) {
        setIsModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isModalOpen]);

  // Block body scroll when modal is open (mobile)
  useEffect(() => {
    if (isModalOpen) {
      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';
    } else {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    }
    return () => {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    };
  }, [isModalOpen]);

  const closeModal = () => setIsModalOpen(false);

  // Form Tracking
  const handleChange = (field, value) => {
    const newData = { ...formData, [field]: value };
    setFormData(newData);
    // Check dirty
    // Simple comparison
    let dirty = false;
    for (const key in newData) {
      if (newData[key] !== (initialState[key] || '')) {
        dirty = true;
        break;
      }
    }
    setIsDirty(dirty);
    setStatusMessage(''); // Clear status on edit
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isDirty && editingUser) return; // Prevention

    setIsSaving(true);
    setStatusMessage('');

    // Simple Validation
    if (formData.username.length < 3) {
      setStatusMessage("Error: Username must be > 3 chars");
      setIsSaving(false);
      return;
    }
    if (formData.password.length < 6) {
      setStatusMessage("Error: Password must be > 6 chars");
      setIsSaving(false);
      return;
    }

    const action = editingUser ? 'editUser' : 'createUser';
    try {
      const payload = { ...formData };

      // Combine dynamic wallets
      const combinedWallets = formData.walletsList
        .map(w => w.trim()).filter(w => w).join(',');
      payload.wallets = combinedWallets;
      delete payload.walletsList; // Remove internal array from payload

      if (editingUser) {
        payload.userId = editingUser.userId;
        payload.row = editingUser.row; // Critical for duplicate ID targeting
      }

      const res = await callGasApi(action, payload);
      if (res.success) {
        // --- OPTIMISTIC UPDATE ---
        // Construct optimistic user object
        const optimisticUser = {
          ...formData,
          userId: editingUser ? editingUser.userId : Date.now(), // Temp ID for new users if needed
          row: editingUser ? editingUser.row : undefined, // Preserve Row Index for stable sorting

          wallets: combinedWallets, // Critical: Ensure table sees formatting wallets instantly
          // Ensure fields match table expectation
        };

        // 1. Update State Instantly
        if (editingUser) {
          setUsers(prev => prev.map(u => {
            // Match by ID as requested
            const isMatch = u.userId == editingUser.userId;
            return isMatch ? optimisticUser : u;
          }));

          // Update Store Manually
          const currentStore = Store.get('users', 'local');
          if (currentStore && currentStore.users) {
            const newUsers = currentStore.users.map(u => {
              const isMatch = u.userId == editingUser.userId;
              return isMatch ? optimisticUser : u;
            });
            Store._set('users', { ...currentStore, users: newUsers }, 'local');
          }
        } else {
          setUsers(prev => [...prev, optimisticUser]); // Append to bottom to match Sheet behavior
          Store.addToList('users', 'users', optimisticUser, 'local', false); // Add to end (false = append)
        }

        // 2. Close Modal & Show Toast
        closeModal();
        setToast({ message: editingUser ? 'User updated successfully' : 'New user created successfully', type: 'success' });

        // 3. Silent Background Sync (Delayed to avoid stale reads)
        setTimeout(() => fetchUsers(true), 2000);

      } else {
        setStatusMessage('Error: ' + res.error);
      }
    } catch (err) {
      setStatusMessage('Failed to save: Network Error');
    } finally {
      setIsSaving(false);
    }
  };

  // Check if specific field is changed (Simplified for objects/arrays)
  const isFieldDirty = (field) => {
    if (!editingUser) return false;
    return JSON.stringify(formData[field]) !== JSON.stringify(initialState[field] || '');
  };

  // Dynamic Wallet Handlers
  const handleWalletChange = (index, value) => {
    const list = [...formData.walletsList];
    list[index] = value;
    setFormData({ ...formData, walletsList: list });
    setIsDirty(true); // Assuming change is dirty
  };

  const addWalletField = (e) => {
    e.preventDefault();
    setFormData({ ...formData, walletsList: [...formData.walletsList, ''] });
  };

  const removeWalletField = (index) => {
    const list = [...formData.walletsList];
    if (list.length > 1) {
      list.splice(index, 1);
      setFormData({ ...formData, walletsList: list });
      setIsDirty(true);
    }
  };

  return (
    <div id="view-user-management" className="view-section">
      {/* Toast Notification */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Action Bar */}
      <div className="action-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button onClick={() => fetchUsers(true)} className="um-refresh-btn" disabled={loading || isRefreshing} title="Refresh Data from Sheet">
            <RefreshCw size={18} className={isRefreshing ? "spinner-spin" : ""} />
          </button>
          {lastUpdated && <span style={{ fontSize: '15px', fontWeight: '500', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>Updated: {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>}
        </div>

        <button onClick={() => openModal()} className="um-add-btn">
          <Plus size={18} /> New User
        </button>
      </div>

      <div className="data-table-wrapper">
        <table>
          <thead>
            <tr>
              <th>ID</th><th>Agent Name</th><th>Username</th><th>Role</th><th>Wallets</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && users.length === 0 ? (
              <tr><td colSpan="6" className="um-loading-row"><Loader2 className="spinner-spin" size={18} /> Loading users...</td></tr>
            ) : error ? (
              <tr><td colSpan="6" className="um-error-row">Error: {error}</td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan="6" className="um-empty-row">No users found</td></tr>
            ) : (
              users.map((u, i) => (
                <tr key={`${u.userId}-${i}`}>
                  <td>{u.userId}</td>
                  <td>{u.agentName}</td>
                  <td>{u.username}</td>
                  <td>
                    <span className={`role-badge ${u.role.toLowerCase()}`}>{u.role}</span>
                  </td>
                  <td>
                    <div className="um-wallets-wrapper">
                      {u.wallets ? String(u.wallets).split(',').map((w, i) => (
                        <span key={i} className="wallet-badge">{w.trim()}</span>
                      )) : '-'}
                    </div>
                  </td>


                  <td>
                    <button className="mode-btn um-edit-btn" onClick={() => openModal(u)}>Edit</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}>
          <div className="modal-content">
            <div className="modal-header">
              <h3>{editingUser ? 'Edit User' : 'Add New User'}</h3>
              <button className="close-btn" onClick={closeModal}><X size={20} /></button>
            </div>

            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Username</label>
                  <div className="input-with-icon">
                    <User size={16} className="input-icon" />
                    <input
                      type="text"
                      id="username"
                      name="username"
                      value={formData.username}
                      onChange={e => handleChange('username', e.target.value)}
                      required
                      placeholder="Username"
                      style={{ borderColor: isFieldDirty('username') ? 'var(--success)' : '' }}
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label>Password</label>
                  <div className="input-with-icon">
                    <Lock size={16} className="input-icon" />
                    <input
                      type="text"
                      id="password"
                      name="password"
                      value={formData.password}
                      onChange={e => handleChange('password', e.target.value)}
                      required
                      placeholder="Password"
                      style={{ borderColor: isFieldDirty('password') ? 'var(--success)' : '' }}
                    />
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label>Email Address</label>
                <div className="input-with-icon">
                  <Mail size={16} className="input-icon" />
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={e => handleChange('email', e.target.value)}
                    placeholder="Email"
                    style={{ borderColor: isFieldDirty('email') ? 'var(--success)' : '' }}
                  />
                </div>
              </div>

              {!editingUser && (
                <div className="form-row">
                  <div className="form-group">
                    <label>Agent Name</label>
                    <div className="input-with-icon">
                      <User size={16} className="input-icon" />
                      <input type="text" id="agentName" name="agentName" value={formData.agentName} onChange={e => handleChange('agentName', e.target.value)} required placeholder="Agent Name" />
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Role</label>
                    <div className="input-with-icon">
                      <Shield size={16} className="input-icon" />
                      <select id="role" name="role" value={formData.role} onChange={e => handleChange('role', e.target.value)} required>
                        <option value="User">User</option>
                        <option value="Admin">Admin</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* WALLETS SECTION */}
              <div className="form-group" style={{ marginTop: '1rem' }}>
                <label style={{ marginBottom: '0.8rem', display: 'block', fontWeight: '500' }}>Wallets (Vodafone Cash)</label>

                <div className="form-row" style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                  {formData.walletsList.map((val, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>

                      {/* Input with Inner Icon */}
                      <div style={{ flex: 1, position: 'relative' }}>
                        <Wallet
                          size={18}
                          className="input-icon"
                          style={{
                            position: 'absolute',
                            left: '12px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            color: 'var(--text-secondary)',
                            pointerEvents: 'none'
                          }}
                        />
                        <input
                          type="text"
                          placeholder={`Wallet ${idx + 1}`}
                          value={val}
                          onChange={e => handleWalletChange(idx, e.target.value)}
                          style={{
                            width: '100%',
                            padding: '0.75rem 0.75rem 0.75rem 2.8rem', // Extra left padding for icon
                            border: '1px solid var(--border-color)',
                            borderRadius: 'var(--radius-md)',
                            fontSize: '0.95rem'
                          }}
                        />
                      </div>

                      {/* Add Button (Green Icon) */}
                      {idx === formData.walletsList.length - 1 && (
                        <button
                          type="button"
                          onClick={addWalletField}
                          title="Add New Wallet"
                          className="um-icon-action-btn um-icon-add"
                        >
                          <PlusCircle size={26} strokeWidth={1.5} />
                        </button>
                      )}

                      {/* Delete Button (Red Icon) */}
                      {formData.walletsList.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeWalletField(idx)}
                          title="Delete Wallet"
                          className="um-icon-action-btn um-icon-del"
                        >
                          <Trash2 size={22} strokeWidth={1.5} />
                        </button>
                      )}

                    </div>
                  ))}
                </div>
              </div>

              {/* Status Message Display */}
              {statusMessage && (
                <div className={`status-message ${statusMessage.includes('Error') || statusMessage.includes('Failed') ? 'error' : 'success'}`}
                  style={{
                    marginBottom: '1rem', padding: '0.5rem', borderRadius: '4px', fontSize: '0.9rem',
                    backgroundColor: statusMessage.includes('Error') ? '#fee2e2' : '#dcfce7',
                    color: statusMessage.includes('Error') ? 'var(--danger)' : 'var(--success-dark)'
                  }}>
                  {statusMessage}
                </div>
              )}

              <div className="modal-footer">
                <button type="button" onClick={closeModal} className="btn-secondary">Cancel</button>
                <button type="submit" disabled={!isDirty || isSaving} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {isSaving ? <Loader2 size={16} className="spinner-spin" /> : <Save size={16} />}
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default UserManagement;

