import React, { useState } from 'react';
import { Category, TransactionPayload } from '../services/api';

interface TransactionFormProps {
  categories: Category[];
  onSubmit: (payload: TransactionPayload) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export function TransactionForm({
  categories,
  onSubmit,
  onCancel,
  isLoading = false,
}: TransactionFormProps) {
  const [categoryId, setCategoryId] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'DEPOSIT' | 'PAYMENT'>('PAYMENT');
  const [merchantName, setMerchantName] = useState('');
  const [transactionDate, setTransactionDate] = useState(
    new Date().toISOString().split('T')[0],
  );
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const amountValue = parseFloat(amount);
  const displayAmount = type === 'DEPOSIT' ? Math.abs(amountValue) : -Math.abs(amountValue);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!categoryId) {
      setError('Category is required');
      return;
    }

    if (!amount || isNaN(displayAmount) || displayAmount === 0) {
      setError('Valid amount is required');
      return;
    }

    if (!merchantName.trim()) {
      setError('Merchant name is required');
      return;
    }

    if (!transactionDate) {
      setError('Transaction date is required');
      return;
    }

    try {
      await onSubmit({
        categoryId,
        amount: displayAmount,
        merchantName: merchantName.trim(),
        transactionDate: new Date(transactionDate).toISOString(),
        notes: notes.trim() || undefined,
      });
      // Reset form
      setCategoryId('');
      setAmount('');
      setMerchantName('');
      setNotes('');
      setType('PAYMENT');
    } catch (err: any) {
      setError(err.message || 'Failed to create transaction');
    }
  };

  const handleBlur = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const getCategoryColor = (catId: string): string => {
    const category = categories.find((c) => c.categoryId === catId);
    return category?.color || '#808080';
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold mb-4">Create Transaction</h3>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Category Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
          <div className="flex gap-2">
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              onBlur={() => handleBlur('categoryId')}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select a category</option>
              {categories.map((cat) => (
                <option key={cat.categoryId} value={cat.categoryId}>
                  {cat.icon} {cat.name}
                </option>
              ))}
            </select>
            {categoryId && (
              <div
                className="w-10 h-10 rounded-md border-2"
                style={{ borderColor: getCategoryColor(categoryId) }}
              />
            )}
          </div>
        </div>

        {/* Type and Amount */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
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
            <label className="block text-sm font-medium text-gray-700 mb-2">Amount</label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-gray-500 font-medium">$</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                onBlur={() => handleBlur('amount')}
                placeholder="0.00"
                className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Merchant Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Merchant Name
          </label>
          <input
            type="text"
            value={merchantName}
            onChange={(e) => setMerchantName(e.target.value)}
            onBlur={() => handleBlur('merchantName')}
            placeholder="e.g., Whole Foods Market"
            maxLength={100}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Transaction Date
          </label>
          <input
            type="date"
            value={transactionDate}
            onChange={(e) => setTransactionDate(e.target.value)}
            onBlur={() => handleBlur('transactionDate')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={() => handleBlur('notes')}
            placeholder="Add any additional notes"
            maxLength={200}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
          <p className="mt-1 text-xs text-gray-500">{notes.length}/200 characters</p>
        </div>

        {/* Buttons */}
        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={isLoading}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? 'Creating...' : 'Create Transaction'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-md font-medium hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
