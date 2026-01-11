'use client';
import React, { useState } from 'react';
import ChipSelector from '@/components/common/ChipSelector';
import DatePicker from '@/components/common/DatePicker';
import { FORM_CONFIG, APP_SETTINGS } from '@/utils/constants';
import Store from '@/services/store';
import Toast from '@/components/common/Toast';
import './NewOrder.css';
import { useAppContext } from '@/context/AppContext';
import { useUserDashboardContext } from '@/context/UserDashboardContext';
import { CheckCircle2, X } from 'lucide-react';

const NewOrder = () => {
    const { user } = useAppContext();
    const { onOrderSaved } = useUserDashboardContext() || {};

    // Guard: Don't render if user is null (SSR, logout, or not authenticated)
    if (!user) {
        return null;
    }

    const [mode, setMode] = useState('With Data'); // 'With Data' | 'Without Data'

    // Handle Mode Switching with Clear Logic
    const handleModeChange = (newMode) => {
        if (newMode === mode) return;

        // 1. Set Mode
        setMode(newMode);

        // 2. Clear Dependent Fields (Student Info & Package)
        // Keep: crmCode, source, walletNumber, transfer info
        // Clear: studentName, phones, address, class, package, subject
        setFormData(prev => ({
            ...prev,
            studentName: '',
            studentPhone: '',
            parentPhone: '',
            studentBirthday: '',
            city: '',
            area: '',
            studentClass: '',
            selectedPackage: '',
            selectedSubject: '',
            orderState: '' // Reset Order State
        }));
    };

    const [formData, setFormData] = useState({
        crmCode: '',
        source: '',
        sourceOther: '',
        studentName: '',
        studentPhone: '',
        parentPhone: '',
        studentBirthday: '',
        city: '',
        area: '',
        studentClass: '',
        selectedPackage: '',
        selectedSubject: '',
        activationDate: new Date().toISOString().split('T')[0],
        orderCost: '',
        orderState: '', // Re-added
        walletNumber: '',
        transferNumber: '',
        transferCode: '',
        orderNote: '',
        transferCodeOption: 'With Transfer Code', // Restored
    });

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [successMsg, setSuccessMsg] = useState('');
    const [toast, setToast] = useState(null);

    // Toast Helper
    const showToast = (message, type = 'error') => {
        setToast({ message, type });
    };

    const showStudentSection = mode === 'With Data';
    const showPackage = !!formData.studentClass;
    const showSubject = formData.studentClass && formData.selectedPackage && formData.selectedPackage.toLowerCase().includes('subject');

    const getSubjects = () => {
        if (!formData.studentClass) return [];
        const classVal = formData.studentClass;
        for (const group of FORM_CONFIG.subjectLogic) {
            if (group.triggers.some(t => classVal.startsWith(t))) {
                return group.subjects;
            }
        }
        return [];
    };

    const updateField = (field, val) => {
        if (field === 'studentClass') {
            setFormData(prev => ({ ...prev, studentClass: val, selectedPackage: '', selectedSubject: '' }));
            return;
        }
        if (field === 'selectedPackage') {
            const isSubjRequired = val.toLowerCase().includes('subject');
            let newSubj = '';
            if (val && !isSubjRequired) {
                newSubj = 'All';
            }
            setFormData(prev => ({ ...prev, selectedPackage: val, selectedSubject: newSubj }));
            return;
        }

        // Validate Order Cost (Allow only numbers and one decimal point)
        if (field === 'orderCost') {
            if (val === '') {
                setFormData(prev => ({ ...prev, [field]: val }));
                return;
            }
            // Strict Regex: Digits, optional single dot, optional digits after dot
            if (/^\d*\.?\d*$/.test(val)) {
                setFormData(prev => ({ ...prev, [field]: val }));
            }
            return;
        }

        setFormData(prev => ({ ...prev, [field]: val }));
    };

    const handleWalletSelect = (wallet) => {
        if (formData.walletNumber === wallet) {
            updateField('walletNumber', '');
        } else {
            updateField('walletNumber', wallet);
        }
    };





    const toggleTransferOption = (option) => {
        updateField('transferCodeOption', option);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // 1. Mandatory Wallet Check (All Modes)
        if (!formData.walletNumber) {
            showToast('Please select a Wallet from the sidebar', 'error');
            return;
        }

        // Source Other
        const finalSource = formData.source === 'Other' ? formData.sourceOther : formData.source;
        if (formData.source === 'Other' && !formData.sourceOther && mode === 'With Data') {
            showToast('Please specify the Other source', 'warning');
            return;
        }

        if (mode === 'With Data') { // Strict With Data Checks
            if (!formData.studentName || formData.studentName.trim().length < 2) {
                showToast('Student Name is required', 'warning'); return;
            }
            if (!/^01[0125][0-9]{8}$/.test(formData.studentPhone)) {
                showToast('Invalid Student Phone Number', 'error'); return;
            }

            // Academic Info Validation (Skipped for Overpayment)
            if (formData.orderState !== 'OverPayment') {
                if (!formData.studentClass) {
                    showToast('Please select a Class', 'warning'); return;
                }
                if (showPackage && !formData.selectedPackage) {
                    showToast('Please select a Package', 'warning'); return;
                }
                if (showSubject && !formData.selectedSubject) {
                    showToast('Please select a Subject', 'warning'); return;
                }
            }
        }

        // Shared Checks (Both Modes)
        if (!formData.orderCost) { showToast('Order Cost is required', 'error'); return; }
        if (!formData.transferNumber) { showToast('Transfer Number is required', 'error'); return; }

        if (formData.transferCodeOption === 'With Transfer Code' && !formData.transferCode) {
            showToast('Transfer Code is required', 'error'); return;
        }

        setIsSubmitting(true);
        setSuccessMsg('');

        // Build FormData for submission
        const formDataToSend = new FormData();

        // Add all form fields
        formDataToSend.append('timestamp', new Date().toISOString());
        formDataToSend.append('infoDetails', mode);
        formDataToSend.append('studentCode', formData.crmCode);
        // SMART DATA HANDLING: Only send relevant data based on Mode
        if (mode === 'With Data') {
            formDataToSend.append('studentName', formData.studentName);
            formDataToSend.append('studentNumber', formData.studentPhone);
            formDataToSend.append('parentNumber', formData.parentPhone);
            formDataToSend.append('birthday', formData.studentBirthday);
            formDataToSend.append('city', formData.city);
            formDataToSend.append('area', formData.area);
            formDataToSend.append('studentClass', formData.studentClass);
            formDataToSend.append('subtype', formData.selectedPackage); // Package
            const finalSubject = formData.selectedSubject === 'All' ? 'All' : formData.selectedSubject;
            formDataToSend.append('subjectName', finalSubject);
        } else {
            // "Without Data" Mode - Send empty strings for student details
            formDataToSend.append('studentName', '');
            formDataToSend.append('studentNumber', '');
            formDataToSend.append('parentNumber', '');
            formDataToSend.append('birthday', '');
            formDataToSend.append('city', '');
            formDataToSend.append('area', '');
            formDataToSend.append('studentClass', '');
            formDataToSend.append('subtype', '');
            formDataToSend.append('subjectName', '');
        }

        formDataToSend.append('activationDate', formData.activationDate);
        formDataToSend.append('orderCost', formData.orderCost);
        formDataToSend.append('stateOfOrder', formData.orderState);
        formDataToSend.append('note', formData.orderNote);
        formDataToSend.append('wallet', formData.walletNumber);
        formDataToSend.append('transferNumber', formData.transferNumber);
        formDataToSend.append('transferCodeStatus', formData.transferCodeOption);

        // Only send transfer code if "With Transfer Code" is selected
        const finalTransferCode = formData.transferCodeOption === 'With Transfer Code' ? formData.transferCode : '';
        formDataToSend.append('transferCode', finalTransferCode);

        formDataToSend.append('sourceOfData', finalSource);
        formDataToSend.append('agentName', user.agentName);
        formDataToSend.append('salesName', user.agentName);
        formDataToSend.append('dataMode', mode);

        try {
            const response = await fetch('/api/sales/add', {
                method: 'POST',
                body: formDataToSend,
            });

            const res = await response.json();

            if (res.success) {
                setSuccessMsg(true);
                window.scrollTo({ top: 0, behavior: 'smooth' });

                // Background refresh to get the actual row data from sheet
                setTimeout(() => {
                    const cacheKey = `mySales_${user.agentName}`;
                    // Refresh user's own cache
                    Store.fetch(cacheKey, 'getSales', { agentName: user.agentName }, { ttl: APP_SETTINGS.cache.ordersTTL, force: true, storage: 'local' });

                    // IMPORTANT: Invalidate Admin's allSales cache so they see fresh data
                    Store.invalidate('allSales', 'local');
                }, 1500);

                // Reset form logic
                if (mode === 'With Data') {
                    setFormData({
                        crmCode: '',
                        source: '',
                        sourceOther: '',
                        studentName: '',
                        studentPhone: '',
                        parentPhone: '',
                        studentBirthday: '',
                        city: '',
                        area: '',
                        studentClass: '',
                        selectedPackage: '',
                        selectedSubject: '',
                        activationDate: new Date().toISOString().split('T')[0],
                        orderCost: '',
                        orderState: 'New',
                        walletNumber: '',
                        transferNumber: '',
                        transferCode: '',
                        orderNote: '',
                        transferCodeOption: 'With Transfer Code',
                    });
                } else {
                    setFormData(prev => ({
                        ...prev,
                        crmCode: '',
                        source: '',
                        sourceOther: '',
                        orderCost: '',
                        walletNumber: '',
                        transferNumber: '',
                        transferCode: '',
                        orderNote: '',
                        transferCodeOption: 'With Transfer Code',
                    }));
                }

                setIsSubmitting(false);

                setIsSubmitting(false);

                setTimeout(() => {
                    setSuccessMsg(false);
                    if (onOrderSaved) onOrderSaved();
                }, 2000);
            } else {
                showToast('Error: ' + res.error, 'error');
                setIsSubmitting(false);
            }
        } catch (err) {
            showToast('Submission Failed: ' + err.message, 'error');
            setIsSubmitting(false);
        }
    };

    return (
        <div id="view-new-order" className="new-order">
            {/* Toast fixed at bottom of page */}
            {toast && (
                <div className="new-order__toast-wrapper">
                    <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
                </div>
            )}
            <div className="new-order__layout">

                {/* 1. Wallet Aside */}
                <aside className="new-order__aside">
                    <div className="new-order__aside-header">
                        <h2 className="new-order__aside-title">💳 اختار محفظة</h2>
                    </div>

                    <div className="new-order__wallet-stack">
                        {user.wallets && user.wallets.length > 0 ? (
                            user.wallets.map((w, i) => {
                                const isSelected = formData.walletNumber === w;
                                return (
                                    <div
                                        className={`new-order__wallet-card ${isSelected ? 'new-order__wallet-card--selected' : ''}`}
                                        key={i}
                                        onClick={() => handleWalletSelect(w)}
                                    >
                                        {isSelected && <div className="new-order__wallet-check"><CheckCircle2 size={18} /></div>}
                                        <div className="new-order__wallet-icon-wrapper">
                                            <span className="new-order__wallet-icon">💳</span>
                                        </div>
                                        <div className="new-order__wallet-info">
                                            <div className="new-order__wallet-label">Wallet {i + 1}</div>
                                            <div className="new-order__wallet-address">{w}</div>
                                        </div>
                                    </div>
                                );
                            })
                        ) : <div className="new-order__wallet-card new-order__wallet-card--empty">No wallets registered</div>}
                    </div>

                </aside>

                {/* 2. Form Main */}
                <main className="new-order__main">

                    {/* Mode Switcher */}
                    <div className="new-order__mode-switch-wrapper">
                        <div className={`new-order__mode-switch ${mode === 'Without Data' ? 'new-order__mode-switch--right' : ''}`}>
                            <div className="new-order__mode-slider"></div>
                            <button
                                type="button"
                                className={`new-order__mode-btn ${mode === 'With Data' ? 'new-order__mode-btn--active' : ''}`}
                                onClick={() => handleModeChange('With Data')}
                            >
                                With Data
                            </button>
                            <button
                                type="button"
                                className={`new-order__mode-btn ${mode === 'Without Data' ? 'new-order__mode-btn--active' : ''}`}
                                onClick={() => handleModeChange('Without Data')}
                            >
                                Without Data
                            </button>
                        </div>
                    </div>

                    <div className="new-order__card">
                        <form onSubmit={handleSubmit} className="new-order__form">

                            {/* =========================================================
                         MODE: WITH DATA (7 SECTIONS)
                         ========================================================= */}
                            {mode === 'With Data' && (
                                <>
                                    {/* 1. Basic Information */}
                                    <div className="new-order__section new-order__section--bordered">
                                        <h3 className="new-order__section-title">Basic Information</h3>
                                        <div className="new-order__grid new-order__grid--compact">
                                            <div className="new-order__group">
                                                <label className="new-order__label">CRM Code</label>
                                                <input type="text" id="crmCode" name="crmCode" value={formData.crmCode} onChange={e => updateField('crmCode', e.target.value)} placeholder="CRM Code" className="new-order__input" />
                                            </div>
                                            <div className="new-order__group">
                                                <label className="new-order__label">Source</label>
                                                <div className="new-order__chip-wrapper">
                                                    <ChipSelector
                                                        options={FORM_CONFIG.sources}
                                                        selected={formData.source}
                                                        onSelect={val => updateField('source', val)}
                                                    />
                                                </div>
                                                {formData.source === 'Other' && (
                                                    <input type="text" id="sourceOther" name="sourceOther" value={formData.sourceOther} onChange={e => updateField('sourceOther', e.target.value)} className="new-order__input new-order__input--source-other" placeholder="Source" required />
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* 2. Student Details */}
                                    <div className="new-order__section new-order__section--bordered animate-fade-in">
                                        <h3 className="new-order__section-title">Student Details</h3>
                                        <div className="new-order__grid new-order__grid--compact">
                                            <div className="new-order__group">
                                                <label className="new-order__label">Student Name <span className="req">*</span></label>
                                                <input type="text" id="studentName" name="studentName" value={formData.studentName} onChange={e => updateField('studentName', e.target.value)} placeholder="Student Name" className="new-order__input" />
                                            </div>
                                            <div className="new-order__group">
                                                <label className="new-order__label">Student Phone <span className="req">*</span></label>
                                                <input type="tel" id="studentPhone" name="studentPhone" value={formData.studentPhone} onChange={e => updateField('studentPhone', e.target.value)} placeholder="Phone Number" className="new-order__input" />
                                            </div>
                                            <div className="new-order__group">
                                                <label className="new-order__label">Parent Phone</label>
                                                <input type="tel" id="parentPhone" name="parentPhone" value={formData.parentPhone} onChange={e => updateField('parentPhone', e.target.value)} placeholder="Parent Phone" className="new-order__input" />
                                            </div>

                                            <DatePicker
                                                label="Birthday"
                                                id="studentBirthday"
                                                name="studentBirthday"
                                                value={formData.studentBirthday}
                                                onChange={val => updateField('studentBirthday', val)}
                                            />

                                            <div className="new-order__group">
                                                <label className="new-order__label">City</label>
                                                <input type="text" id="city" name="city" value={formData.city} onChange={e => updateField('city', e.target.value)} placeholder="City" className="new-order__input" />
                                            </div>
                                            <div className="new-order__group">
                                                <label className="new-order__label">Area</label>
                                                <input type="text" id="area" name="area" value={formData.area} onChange={e => updateField('area', e.target.value)} placeholder="Area" className="new-order__input" />
                                            </div>
                                        </div>
                                    </div>

                                    {/* 3. State Of The Order (NEW) */}
                                    <div className="new-order__section new-order__section--bordered">
                                        <h3 className="new-order__section-title">State Of The Order</h3>
                                        <div className="new-order__group">
                                            <div className="new-order__chip-wrapper">
                                                <ChipSelector
                                                    options={FORM_CONFIG.orderStates.filter(s => s !== 'No Data')}
                                                    selected={formData.orderState}
                                                    onSelect={val => updateField('orderState', val)}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* 4. Academic Info */}
                                    {/* 4. Academic Info (Hidden for Overpayment) */}
                                    {formData.orderState !== 'OverPayment' && (
                                        <div className="new-order__section new-order__section--bordered">
                                            <h3 className="new-order__section-title">Academic Info</h3>
                                            <div className="new-order__grid new-order__grid--compact">
                                                <div className="new-order__group">
                                                    <label className="new-order__label">Class <span className="req">*</span></label>
                                                    <div className="new-order__chip-wrapper">
                                                        <ChipSelector options={FORM_CONFIG.classes} selected={formData.studentClass} onSelect={val => updateField('studentClass', val)} />
                                                    </div>
                                                </div>
                                                {showPackage && (
                                                    <div className="new-order__group">
                                                        <label className="new-order__label">Package <span className="req">*</span></label>
                                                        <div className="new-order__chip-wrapper">
                                                            <ChipSelector options={FORM_CONFIG.packages} selected={formData.selectedPackage} onSelect={val => updateField('selectedPackage', val)} />
                                                        </div>
                                                    </div>
                                                )}
                                                {showSubject && (
                                                    <div className="new-order__group">
                                                        <label className="new-order__label">Subject</label>
                                                        <div className="new-order__chip-wrapper">
                                                            <ChipSelector options={getSubjects()} selected={formData.selectedSubject} onSelect={val => updateField('selectedSubject', val)} />
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}




                                </>
                            )}

                            {/* =========================================================
                         SHARED SECTIONS (ORDER COST & TRANSFER)
                         Appears in BOTH 'With Data' and 'Without Data' modes
                         ========================================================= */}

                            {/* 5. Order Cost Section (Bordered) */}
                            <div className="new-order__section new-order__section--bordered">
                                <h3 className="new-order__section-title">Order Cost Section</h3>
                                <div className="new-order__grid new-order__grid--compact">
                                    <DatePicker
                                        label="Activation Date"
                                        id="activationDate"
                                        name="activationDate"
                                        value={formData.activationDate}
                                        onChange={val => updateField('activationDate', val)}
                                        required={true}
                                    />
                                    <div className="new-order__group">
                                        <label className="new-order__label">Order Cost <span className="req">*</span></label>
                                        <input
                                            type="text"
                                            inputMode="decimal"
                                            value={formData.orderCost}
                                            onChange={e => updateField('orderCost', e.target.value)}
                                            placeholder="E.g. 150"
                                            className="new-order__input new-order__input--cost"
                                        />
                                    </div>
                                    <div className="new-order__group">
                                        <label className="new-order__label">Note <span className="optional">(Optional)</span></label>
                                        <input
                                            type="text"
                                            value={formData.orderNote}
                                            onChange={e => updateField('orderNote', e.target.value)}
                                            placeholder="Any comments..."
                                            className="new-order__input"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* 6. Transfer Details Section (Bordered - Shared Logic) */}
                            <div className="new-order__section new-order__section--bordered">
                                <h3 className="new-order__section-title">Transfer Details Section</h3>
                                <div className="new-order__grid new-order__grid--compact">
                                    <div className="new-order__group">
                                        <label className="new-order__label">Transfer Number <span className="req">*</span></label>
                                        <input
                                            type="text"
                                            value={formData.transferNumber}
                                            onChange={e => updateField('transferNumber', e.target.value)}
                                            placeholder="Enter Transfer Number"
                                            className="new-order__input"
                                        />
                                    </div>

                                    <div className="new-order__group">
                                        <label className="new-order__label">Transfer Code Option</label>
                                        <div className="new-order__chip-container">
                                            <div
                                                className={`chip ${formData.transferCodeOption === 'With Transfer Code' ? 'active' : ''}`}
                                                onClick={() => toggleTransferOption('With Transfer Code')}
                                            >
                                                With Transfer Code
                                            </div>
                                            <div
                                                className={`chip ${formData.transferCodeOption === 'Without Transfer Code' ? 'active' : ''}`}
                                                onClick={() => toggleTransferOption('Without Transfer Code')}
                                            >
                                                Without Transfer Code
                                            </div>
                                        </div>
                                    </div>

                                    {formData.transferCodeOption === 'With Transfer Code' && (
                                        <div className="new-order__group animate-fade-in">
                                            <label className="new-order__label">Transfer Code <span className="req">*</span></label>
                                            <input
                                                type="text"
                                                value={formData.transferCode}
                                                onChange={e => updateField('transferCode', e.target.value)}
                                                placeholder="Enter Transfer Code"
                                                className="new-order__input"
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="new-order__actions">
                                <button
                                    type="submit"
                                    id="submit-sale-btn"
                                    disabled={isSubmitting}
                                    className={`new-order__submit-btn ${successMsg ? 'new-order__submit-btn--success' : ''}`}
                                >
                                    {successMsg ? (
                                        <span className="flex items-center gap-2">Success ✅</span>
                                    ) : (
                                        isSubmitting ? (
                                            <span style={{ position: 'relative', zIndex: 2 }}>
                                                Saving...
                                            </span>
                                        ) : 'Submit Order'
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>

                </main>
            </div>
        </div>
    );
};

export default NewOrder;

