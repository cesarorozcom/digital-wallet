import React, { useEffect, useState } from 'react';
import { Category, Transaction, UpdateTransactionPayload } from '../services/api';

interface EditTransactionModalProps {
  transaction: Transaction;
  categories: Category[];
  onSave: (transactionId: string, payload: UpdateTransactionPayload) => Promise<void>;
  onClose: () => void;
}

export function EditTransactionModal({
  transaction,
  categories,
  onSave,
  onClose,
}: EditTransactionModalProps) {
  const [categoryId, setCategoryId] = useState(transaction.categoryId);
  const [merchantName, setMerchantName] = useState(transaction.merchantName);
  const [amount, setAmount] = useState(Math.abs(transaction.amount).toFixed(2));
  const [type, setType] = useState<'DEPOSIT' | 'PAYMENT'>(transaction.type);
  const [transactionDate, setTransactionDate] = useState(
    transaction.transactionDate.split('T')[0],
  );
  const [notes, setNotes] = useState(transaction.notes || '');
  const [status, setStatus] = useState<Transaction['status']>(transaction.status);
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Close on Escape key
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const parsedAmount = parseFloat(amount);
    if (!categoryId) { setError('Category is required'); return; }
    if (isNaN(parsedAmount) || parsedAmount <= 0) { setError('Valid amount is required'); return; }
    if (!merchantName.trim()) { setError('Merchant name is required'); return; }
    if (!transactionDate) { setError('Transaction date is required'); return; }

    const finalAmount = type === 'DEPOSIT' ? Math.abs(parsedAmount) : -Math.abs(parsedAmount);

    setIsSaving(true);
    try {
      await onSave(transaction.transactionId, {
        categoryId,
        merchantName: merchantName.trim(),
        amount: finalAmount,
        transactionDate: new Date(transactionDate).toISOString(),
        notes: notes.trim() || undefined,
        status,
      } as UpdateTransactionPayload);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save changes');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    // Backdrop
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Edit Transaction</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl font-bold leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select a category</option>
              {categories.map((cat) => (
                <option key={cat.categoryId} value={cat.categoryId}>
                  {cat.icon} {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Type + Amount */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as 'DEPOSIT' | 'PAYMENT')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="PAYMENT">Payment</option>
                <option value="DEPOSIT">Deposit</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-gray-500 font-medium">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Merchant */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Merchant Name</label>
            <input
              type="text"
              value={merchantName}
              onChange={(e) => setMerchantName(e.target.value)}
              maxLength={100}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Transaction Date</label>
            <input
              type="date"
              value={transactionDate}
              onChange={(e) => setTransactionDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as Transaction['status'])}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="PENDING">Pending</option>
              <option value="PENDING_REVIEW">Pending Review</option>
              <option value="CONFIRMED">Confirmed</option>
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={200}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="mt-1 text-xs text-gray-500">{notes.length}/200 characters</p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2 pb-2">
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-md font-medium hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
