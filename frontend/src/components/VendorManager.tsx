'use client';

import { useState, useEffect } from 'react';
import {
  Vendor,
  VendorCreateData,
  VendorPayment,
  VendorPaymentCreateData,
  VendorSummary,
  VENDOR_CATEGORIES,
  VENDOR_STATUSES,
  PAYMENT_TYPES,
  PAYMENT_STATUSES,
  getVendors,
  getVendorSummary,
  createVendor,
  updateVendor,
  deleteVendor,
  createVendorPayment,
  updateVendorPayment,
  deleteVendorPayment,
} from '@/lib/api';

interface VendorManagerProps {
  token: string;
  weddingId: string;
}

type ModalType = 'addVendor' | 'editVendor' | 'viewVendor' | 'addPayment' | 'editPayment' | null;

const initialVendorForm: VendorCreateData = {
  business_name: '',
  category: 'venue',
  contact_name: '',
  email: '',
  phone: '',
  website: '',
  instagram_handle: '',
  status: 'inquiry',
  contract_amount: undefined,
  notes: '',
  service_description: '',
  service_date: '',
  service_start_time: '',
  service_end_time: '',
};

const initialPaymentForm: VendorPaymentCreateData = {
  payment_type: 'deposit',
  amount: 0,
  due_date: '',
  paid_date: '',
  status: 'pending',
  payment_method: '',
  notes: '',
};

export default function VendorManager({ token, weddingId }: VendorManagerProps) {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [summary, setSummary] = useState<VendorSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalType, setModalType] = useState<ModalType>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Filters
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');

  // Form states
  const [vendorForm, setVendorForm] = useState<VendorCreateData>(initialVendorForm);
  const [editingVendorId, setEditingVendorId] = useState<string | null>(null);
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);

  // Payment form
  const [paymentForm, setPaymentForm] = useState<VendorPaymentCreateData>(initialPaymentForm);
  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null);

  // Load data
  useEffect(() => {
    loadData();
  }, [token, weddingId, filterCategory, filterStatus]);

  const loadData = async () => {
    try {
      const [vendorsData, summaryData] = await Promise.all([
        getVendors(token, weddingId, filterCategory || undefined, filterStatus || undefined),
        getVendorSummary(token, weddingId),
      ]);
      setVendors(vendorsData);
      setSummary(summaryData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load vendors');
    } finally {
      setIsLoading(false);
    }
  };

  const closeModal = () => {
    setModalType(null);
    setModalError(null);
    setVendorForm(initialVendorForm);
    setEditingVendorId(null);
    setSelectedVendor(null);
    setPaymentForm(initialPaymentForm);
    setEditingPaymentId(null);
  };

  // Vendor handlers
  const handleAddVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setModalError(null);
    try {
      await createVendor(token, weddingId, vendorForm);
      await loadData();
      closeModal();
    } catch (err) {
      setModalError(err instanceof Error ? err.message : 'Failed to add vendor');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVendorId) return;
    setIsSaving(true);
    setModalError(null);
    try {
      await updateVendor(token, editingVendorId, vendorForm);
      await loadData();
      closeModal();
    } catch (err) {
      setModalError(err instanceof Error ? err.message : 'Failed to update vendor');
    } finally {
      setIsSaving(false);
    }
  };

  const openEditVendor = (vendor: Vendor) => {
    setVendorForm({
      business_name: vendor.business_name,
      category: vendor.category,
      contact_name: vendor.contact_name || '',
      email: vendor.email || '',
      phone: vendor.phone || '',
      website: vendor.website || '',
      instagram_handle: vendor.instagram_handle || '',
      status: vendor.status,
      contract_amount: vendor.contract_amount || undefined,
      notes: vendor.notes || '',
      service_description: vendor.service_description || '',
      service_date: vendor.service_date || '',
      service_start_time: vendor.service_start_time || '',
      service_end_time: vendor.service_end_time || '',
    });
    setEditingVendorId(vendor.id);
    setModalType('editVendor');
  };

  const handleDeleteVendor = async (vendorId: string) => {
    if (!confirm('Are you sure you want to delete this vendor? This will also delete all payments and communications.')) return;
    try {
      await deleteVendor(token, vendorId);
      await loadData();
      if (selectedVendor?.id === vendorId) {
        closeModal();
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete vendor');
    }
  };

  const openViewVendor = (vendor: Vendor) => {
    setSelectedVendor(vendor);
    setModalType('viewVendor');
  };

  // Payment handlers
  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVendor) return;
    setIsSaving(true);
    setModalError(null);
    try {
      await createVendorPayment(token, selectedVendor.id, paymentForm);
      await loadData();
      // Refresh the selected vendor
      const updatedVendors = await getVendors(token, weddingId);
      const updated = updatedVendors.find(v => v.id === selectedVendor.id);
      if (updated) setSelectedVendor(updated);
      setPaymentForm(initialPaymentForm);
      setModalType('viewVendor');
    } catch (err) {
      setModalError(err instanceof Error ? err.message : 'Failed to add payment');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVendor || !editingPaymentId) return;
    setIsSaving(true);
    setModalError(null);
    try {
      await updateVendorPayment(token, selectedVendor.id, editingPaymentId, paymentForm);
      await loadData();
      // Refresh the selected vendor
      const updatedVendors = await getVendors(token, weddingId);
      const updated = updatedVendors.find(v => v.id === selectedVendor.id);
      if (updated) setSelectedVendor(updated);
      setPaymentForm(initialPaymentForm);
      setEditingPaymentId(null);
      setModalType('viewVendor');
    } catch (err) {
      setModalError(err instanceof Error ? err.message : 'Failed to update payment');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeletePayment = async (paymentId: string) => {
    if (!selectedVendor || !confirm('Delete this payment?')) return;
    try {
      await deleteVendorPayment(token, selectedVendor.id, paymentId);
      await loadData();
      // Refresh the selected vendor
      const updatedVendors = await getVendors(token, weddingId);
      const updated = updatedVendors.find(v => v.id === selectedVendor.id);
      if (updated) setSelectedVendor(updated);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete payment');
    }
  };

  const openEditPayment = (payment: VendorPayment) => {
    setPaymentForm({
      payment_type: payment.payment_type,
      amount: payment.amount,
      due_date: payment.due_date || '',
      paid_date: payment.paid_date || '',
      status: payment.status,
      payment_method: payment.payment_method || '',
      notes: payment.notes || '',
    });
    setEditingPaymentId(payment.id);
    setModalType('editPayment');
  };

  const formatCurrency = (amount: number | null | undefined) => {
    if (amount === null || amount === undefined) return '-';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString();
  };

  const getCategoryLabel = (value: string) => {
    return VENDOR_CATEGORIES.find(c => c.value === value)?.label || value;
  };

  const getStatusLabel = (value: string) => {
    return VENDOR_STATUSES.find(s => s.value === value)?.label || value;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'inquiry': return 'bg-gray-100 text-gray-700';
      case 'quoted': return 'bg-blue-100 text-blue-700';
      case 'deposit_paid': return 'bg-yellow-100 text-yellow-700';
      case 'booked': return 'bg-green-100 text-green-700';
      case 'completed': return 'bg-purple-100 text-purple-700';
      case 'cancelled': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-700';
      case 'paid': return 'bg-green-100 text-green-700';
      case 'overdue': return 'bg-red-100 text-red-700';
      case 'cancelled': return 'bg-gray-100 text-gray-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-32 bg-gray-200 rounded-xl"></div>
        <div className="h-64 bg-gray-200 rounded-xl"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 overflow-hidden">
      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-xl break-words">{error}</div>
      )}

      {/* Summary Section */}
      {summary && (
        <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
            <svg className="w-5 h-5 mr-2 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Budget Overview
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-500">Total Vendors</p>
              <p className="text-2xl font-bold text-gray-800">{summary.total_vendors}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-500">Total Budget</p>
              <p className="text-2xl font-bold text-gray-800">{formatCurrency(summary.total_contract_value)}</p>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <p className="text-sm text-green-600">Paid</p>
              <p className="text-2xl font-bold text-green-700">{formatCurrency(summary.total_paid)}</p>
            </div>
            <div className="bg-yellow-50 rounded-lg p-4">
              <p className="text-sm text-yellow-600">Pending</p>
              <p className="text-2xl font-bold text-yellow-700">{formatCurrency(summary.total_pending)}</p>
            </div>
          </div>

          {summary.upcoming_payments.length > 0 && (
            <div className="mt-4">
              <h3 className="text-sm font-medium text-gray-600 mb-2">Upcoming Payments</h3>
              <div className="space-y-2">
                {summary.upcoming_payments.slice(0, 3).map((payment, idx) => (
                  <div key={idx} className="flex justify-between items-center text-sm bg-rose-50 p-2 rounded-lg">
                    <span className="text-gray-700">{payment.vendor_name} - {payment.payment_type}</span>
                    <span className="font-medium text-rose-600">{formatCurrency(payment.amount)} due {formatDate(payment.due_date)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Vendors List */}
      <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-6 overflow-hidden">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h2 className="text-lg font-semibold text-gray-800 flex items-center">
            <svg className="w-5 h-5 mr-2 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            Vendors ({vendors.length})
          </h2>
          <button
            onClick={() => setModalType('addVendor')}
            className="text-sm bg-rose-600 text-white px-4 py-2 rounded-lg hover:bg-rose-700 flex items-center"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Vendor
          </button>
        </div>

        {/* Filters */}
        <div className="flex gap-3 mb-4 flex-wrap">
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
          >
            <option value="">All Categories</option>
            {VENDOR_CATEGORIES.map(cat => (
              <option key={cat.value} value={cat.value}>{cat.label}</option>
            ))}
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
          >
            <option value="">All Statuses</option>
            {VENDOR_STATUSES.map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>

        {vendors.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No vendors yet. Add your first vendor to get started!</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 font-medium text-gray-600">Vendor</th>
                  <th className="text-left py-2 font-medium text-gray-600 hidden sm:table-cell">Category</th>
                  <th className="text-left py-2 font-medium text-gray-600">Status</th>
                  <th className="text-right py-2 font-medium text-gray-600 hidden md:table-cell">Contract</th>
                  <th className="w-20"></th>
                </tr>
              </thead>
              <tbody>
                {vendors.map((vendor) => (
                  <tr key={vendor.id} className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer" onClick={() => openViewVendor(vendor)}>
                    <td className="py-3">
                      <p className="font-medium text-gray-800">{vendor.business_name}</p>
                      {vendor.contact_name && <p className="text-gray-500 text-xs">{vendor.contact_name}</p>}
                    </td>
                    <td className="py-3 text-gray-600 hidden sm:table-cell">{getCategoryLabel(vendor.category)}</td>
                    <td className="py-3">
                      <span className={`text-xs px-2 py-1 rounded ${getStatusColor(vendor.status)}`}>
                        {getStatusLabel(vendor.status)}
                      </span>
                    </td>
                    <td className="py-3 text-right text-gray-700 hidden md:table-cell">{formatCurrency(vendor.contract_amount)}</td>
                    <td className="py-3">
                      <div className="flex gap-2 justify-end" onClick={e => e.stopPropagation()}>
                        <button
                          onClick={() => openEditVendor(vendor)}
                          className="text-gray-400 hover:text-gray-600"
                          title="Edit vendor"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDeleteVendor(vendor.id)}
                          className="text-gray-400 hover:text-red-600"
                          title="Delete vendor"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      {modalType && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-4 sm:p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Add/Edit Vendor Modal */}
            {(modalType === 'addVendor' || modalType === 'editVendor') && (
              <>
                <h3 className="text-xl font-semibold text-gray-800 mb-4">
                  {modalType === 'addVendor' ? 'Add Vendor' : 'Edit Vendor'}
                </h3>
                <form onSubmit={modalType === 'addVendor' ? handleAddVendor : handleEditVendor} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Business Name *</label>
                      <input
                        type="text"
                        value={vendorForm.business_name}
                        onChange={(e) => setVendorForm({ ...vendorForm, business_name: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-rose-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                      <select
                        value={vendorForm.category}
                        onChange={(e) => setVendorForm({ ...vendorForm, category: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-rose-500"
                        required
                      >
                        {VENDOR_CATEGORIES.map(cat => (
                          <option key={cat.value} value={cat.value}>{cat.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                      <select
                        value={vendorForm.status}
                        onChange={(e) => setVendorForm({ ...vendorForm, status: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-rose-500"
                      >
                        {VENDOR_STATUSES.map(s => (
                          <option key={s.value} value={s.value}>{s.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Contact Name</label>
                      <input
                        type="text"
                        value={vendorForm.contact_name}
                        onChange={(e) => setVendorForm({ ...vendorForm, contact_name: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-rose-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                      <input
                        type="email"
                        value={vendorForm.email}
                        onChange={(e) => setVendorForm({ ...vendorForm, email: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-rose-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                      <input
                        type="tel"
                        value={vendorForm.phone}
                        onChange={(e) => setVendorForm({ ...vendorForm, phone: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-rose-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
                      <input
                        type="url"
                        value={vendorForm.website}
                        onChange={(e) => setVendorForm({ ...vendorForm, website: e.target.value })}
                        placeholder="https://"
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-rose-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Instagram</label>
                      <input
                        type="text"
                        value={vendorForm.instagram_handle}
                        onChange={(e) => setVendorForm({ ...vendorForm, instagram_handle: e.target.value })}
                        placeholder="@handle"
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-rose-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Contract Amount</label>
                      <input
                        type="number"
                        step="0.01"
                        value={vendorForm.contract_amount || ''}
                        onChange={(e) => setVendorForm({ ...vendorForm, contract_amount: e.target.value ? parseFloat(e.target.value) : undefined })}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-rose-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Service Date</label>
                      <input
                        type="date"
                        value={vendorForm.service_date}
                        onChange={(e) => setVendorForm({ ...vendorForm, service_date: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-rose-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                      <input
                        type="time"
                        value={vendorForm.service_start_time}
                        onChange={(e) => setVendorForm({ ...vendorForm, service_start_time: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-rose-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                      <input
                        type="time"
                        value={vendorForm.service_end_time}
                        onChange={(e) => setVendorForm({ ...vendorForm, service_end_time: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-rose-500"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Service Description</label>
                      <textarea
                        value={vendorForm.service_description}
                        onChange={(e) => setVendorForm({ ...vendorForm, service_description: e.target.value })}
                        rows={2}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-rose-500"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                      <textarea
                        value={vendorForm.notes}
                        onChange={(e) => setVendorForm({ ...vendorForm, notes: e.target.value })}
                        rows={2}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-rose-500"
                      />
                    </div>
                  </div>
                  {modalError && <p className="text-red-600 text-sm">{modalError}</p>}
                  <div className="flex gap-3 pt-2">
                    <button type="button" onClick={closeModal} className="flex-1 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
                      Cancel
                    </button>
                    <button type="submit" disabled={isSaving} className="flex-1 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 disabled:opacity-50">
                      {isSaving ? 'Saving...' : modalType === 'addVendor' ? 'Add Vendor' : 'Save Changes'}
                    </button>
                  </div>
                </form>
              </>
            )}

            {/* View Vendor Modal */}
            {modalType === 'viewVendor' && selectedVendor && (
              <>
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-800">{selectedVendor.business_name}</h3>
                    <p className="text-gray-500">{getCategoryLabel(selectedVendor.category)}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded ${getStatusColor(selectedVendor.status)}`}>
                    {getStatusLabel(selectedVendor.status)}
                  </span>
                </div>

                {/* Contact Info */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  {selectedVendor.contact_name && (
                    <div>
                      <p className="text-xs text-gray-500">Contact</p>
                      <p className="text-gray-800">{selectedVendor.contact_name}</p>
                    </div>
                  )}
                  {selectedVendor.email && (
                    <div>
                      <p className="text-xs text-gray-500">Email</p>
                      <a href={`mailto:${selectedVendor.email}`} className="text-rose-600 hover:underline">{selectedVendor.email}</a>
                    </div>
                  )}
                  {selectedVendor.phone && (
                    <div>
                      <p className="text-xs text-gray-500">Phone</p>
                      <a href={`tel:${selectedVendor.phone}`} className="text-rose-600 hover:underline">{selectedVendor.phone}</a>
                    </div>
                  )}
                  {selectedVendor.website && (
                    <div>
                      <p className="text-xs text-gray-500">Website</p>
                      <a href={selectedVendor.website} target="_blank" rel="noopener noreferrer" className="text-rose-600 hover:underline">Visit</a>
                    </div>
                  )}
                  {selectedVendor.contract_amount && (
                    <div>
                      <p className="text-xs text-gray-500">Contract</p>
                      <p className="text-gray-800 font-medium">{formatCurrency(selectedVendor.contract_amount)}</p>
                    </div>
                  )}
                  {selectedVendor.service_date && (
                    <div>
                      <p className="text-xs text-gray-500">Service Date</p>
                      <p className="text-gray-800">{formatDate(selectedVendor.service_date)}</p>
                    </div>
                  )}
                </div>

                {/* Payments Section */}
                <div className="border-t pt-4">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="font-medium text-gray-800">Payments</h4>
                    <button
                      onClick={() => setModalType('addPayment')}
                      className="text-sm text-rose-600 hover:text-rose-700 flex items-center"
                    >
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Add Payment
                    </button>
                  </div>
                  {selectedVendor.payments.length === 0 ? (
                    <p className="text-gray-500 text-sm">No payments recorded yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {selectedVendor.payments.map((payment) => (
                        <div key={payment.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                          <div>
                            <p className="font-medium text-gray-800">{formatCurrency(payment.amount)}</p>
                            <p className="text-xs text-gray-500">
                              {PAYMENT_TYPES.find(t => t.value === payment.payment_type)?.label || payment.payment_type}
                              {payment.due_date && ` - Due ${formatDate(payment.due_date)}`}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`text-xs px-2 py-1 rounded ${getPaymentStatusColor(payment.status)}`}>
                              {PAYMENT_STATUSES.find(s => s.value === payment.status)?.label || payment.status}
                            </span>
                            <button onClick={() => openEditPayment(payment)} className="text-gray-400 hover:text-gray-600">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button onClick={() => handleDeletePayment(payment.id)} className="text-gray-400 hover:text-red-600">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Notes Section */}
                {selectedVendor.notes && (
                  <div className="border-t pt-4 mt-4">
                    <h4 className="font-medium text-gray-800 mb-2">Notes</h4>
                    <p className="text-gray-600 text-sm whitespace-pre-wrap">{selectedVendor.notes}</p>
                  </div>
                )}

                <div className="flex gap-3 pt-4 mt-4 border-t">
                  <button onClick={closeModal} className="flex-1 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
                    Close
                  </button>
                  <button onClick={() => openEditVendor(selectedVendor)} className="flex-1 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700">
                    Edit Vendor
                  </button>
                </div>
              </>
            )}

            {/* Add/Edit Payment Modal */}
            {(modalType === 'addPayment' || modalType === 'editPayment') && (
              <>
                <h3 className="text-xl font-semibold text-gray-800 mb-4">
                  {modalType === 'addPayment' ? 'Add Payment' : 'Edit Payment'}
                </h3>
                <form onSubmit={modalType === 'addPayment' ? handleAddPayment : handleEditPayment} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Payment Type *</label>
                      <select
                        value={paymentForm.payment_type}
                        onChange={(e) => setPaymentForm({ ...paymentForm, payment_type: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-rose-500"
                        required
                      >
                        {PAYMENT_TYPES.map(t => (
                          <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Amount *</label>
                      <input
                        type="number"
                        step="0.01"
                        value={paymentForm.amount || ''}
                        onChange={(e) => setPaymentForm({ ...paymentForm, amount: parseFloat(e.target.value) || 0 })}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-rose-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                      <input
                        type="date"
                        value={paymentForm.due_date}
                        onChange={(e) => setPaymentForm({ ...paymentForm, due_date: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-rose-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                      <select
                        value={paymentForm.status}
                        onChange={(e) => setPaymentForm({ ...paymentForm, status: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-rose-500"
                      >
                        {PAYMENT_STATUSES.map(s => (
                          <option key={s.value} value={s.value}>{s.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Paid Date</label>
                      <input
                        type="date"
                        value={paymentForm.paid_date}
                        onChange={(e) => setPaymentForm({ ...paymentForm, paid_date: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-rose-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
                      <input
                        type="text"
                        value={paymentForm.payment_method}
                        onChange={(e) => setPaymentForm({ ...paymentForm, payment_method: e.target.value })}
                        placeholder="e.g., Credit Card, Check"
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-rose-500"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                      <textarea
                        value={paymentForm.notes}
                        onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                        rows={2}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-rose-500"
                      />
                    </div>
                  </div>
                  {modalError && <p className="text-red-600 text-sm">{modalError}</p>}
                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setPaymentForm(initialPaymentForm);
                        setEditingPaymentId(null);
                        setModalType('viewVendor');
                      }}
                      className="flex-1 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button type="submit" disabled={isSaving} className="flex-1 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 disabled:opacity-50">
                      {isSaving ? 'Saving...' : modalType === 'addPayment' ? 'Add Payment' : 'Save Changes'}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
