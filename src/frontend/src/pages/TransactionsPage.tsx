import React, { useEffect, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useTransactionContext } from '../context/TransactionContext';
import { useCategoryContext } from '../context/CategoryContext';
import { TransactionForm } from '../components/TransactionForm';
import { TransactionList } from '../components/TransactionList';
import { ReceiptUpload } from '../components/ReceiptUpload';
import { EditTransactionModal } from '../components/EditTransactionModal';
import { Transaction, TransactionPayload, UpdateTransactionPayload, transactionService, uploadService } from '../services/api';
import { imageCompressionService } from '../services/imageCompressionService';

/**
 * TransactionsPage - Transaction Creation (Upload Receipt or Manual Entry)
 *
 * This page allows users to:
 * - Upload a receipt photo (default tab) which is compressed, uploaded to S3,
 *   and creates a PENDING transaction for OCR processing.
 * - Create transactions manually (Manual Entry tab) as a fallback.
 * - View all transactions for a selected month and category.
 *
 * The receipt-upload flow:
 * 1. User selects/photographs a receipt in the ReceiptUpload component.
 * 2. handleReceiptUpload is invoked with (file, categoryId, transactionDate).
 * 3. Image is compressed client-side via imageCompressionService.
 * 4. A presigned S3 URL is obtained via uploadService.getPresignUrl.
 * 5. The compressed blob is PUT directly to S3.
 * 6. A transaction record is created with the S3 key as receiptImageUrl.
 * 7. The transaction list is refreshed.
 *
 * Error handling:
 * - Errors at any pipeline stage propagate back to ReceiptUpload for display.
 * - Manual entry is always available via the "Manual Entry" tab.
 */

type EntryTab = 'upload' | 'manual';

export function TransactionsPage() {

  const { transactions, 
          isLoading, 
          error, 
          createTransaction, 
          deleteTransaction, 
          refreshTransactions,
          updateTransaction }= 
    useTransactionContext();
  const { categories } = useCategoryContext();

  const [activeTab, setActiveTab] = useState<EntryTab>('upload');
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(
    new Date().toISOString().split('T')[0].substring(0, 7),
  );
  const [selectedCategory, setSelectedCategory] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    void refreshTransactions(selectedMonth, selectedCategory || undefined);
  }, [selectedMonth, selectedCategory, refreshTransactions]);

  const handleCreateTransaction = async (payload: TransactionPayload) => {
    setIsCreating(true);
    try {
      await createTransaction(payload);
      setActiveTab('upload');
      setActiveTab('upload');
      setIsCreating(false);
    } catch (err) {
      setIsCreating(false);
    }
  };

  const handleReceiptUpload = async (
    file: File,
    categoryId: string,
    transactionDate: string,
  ): Promise<void> => {
    setIsCreating(true);
    try {
      const compressed = await imageCompressionService.compressImage(file);
      const transactionId = uuidv4();
      const { url, key } = await uploadService.getPresignUrl(
        file.name,
        'image/jpeg',
        transactionId,
      );
      await uploadService.uploadToS3(url, compressed.blob, 'image/jpeg');
      await transactionService.create({
        transactionId,
        categoryId,
        amount: 1,
        merchantName: 'Pending Review',
        receiptImageUrl: key,
        transactionDate: new Date(transactionDate).toISOString(),
      });
      await refreshTransactions(selectedMonth, selectedCategory || undefined);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteTransaction = async (transactionId: string) => {
    if (window.confirm('Are you sure you want to delete this transaction?')) {
      try {
        await deleteTransaction(transactionId);
      } catch (err: any) {
        alert(err.message || 'Failed to delete transaction');
      }
    }
  };

  const filteredTransactions = transactions.filter((tx) => {
    if (selectedCategory && tx.categoryId !== selectedCategory) return false;
    if (selectedMonth && tx.transactionMonth !== selectedMonth) return false;
    return true;
  });

  const handleEditTransaction = (transaction: Transaction) => {
    setEditingTransaction(transaction);
  };

  const handleSaveEdit = async (transactionId: string, payload: UpdateTransactionPayload) => {
    await updateTransaction(transactionId, payload);
    await refreshTransactions(selectedMonth, selectedCategory || undefined);
  };

  const totalDeposits = filteredTransactions
    .filter((tx) => tx.type === 'DEPOSIT' && tx.status === 'CONFIRMED')
    .reduce((sum, tx) => sum + tx.amount, 0);

  const totalPayments = filteredTransactions
    .filter((tx) => tx.type === 'PAYMENT' && tx.status === 'CONFIRMED')
    .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Transactions</h1>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-700 font-medium">{error}</p>
            <p className="text-red-600 text-sm mt-2">
              You can still create a transaction manually using the Manual Entry tab.
            </p>
          </div>
        )}

        {/* Tab Switcher */}
        <div className="flex border-b border-gray-200 mb-6">
          <button
            onClick={() => setActiveTab('upload')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'upload'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Upload Receipt
          </button>
          <button
            onClick={() => setActiveTab('manual')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'manual'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Manual Entry
          </button>
        </div>

        {/* Conditional form rendering */}
        {activeTab === 'upload' && (
          <div className="mb-8">
            <ReceiptUpload
              categories={categories}
              onUpload={handleReceiptUpload}
              isLoading={isCreating}
            />
          </div>
        )}
        {activeTab === 'manual' && (
          <div className="mb-8">
            <TransactionForm
              categories={categories}
              onSubmit={handleCreateTransaction}
              onCancel={() => setActiveTab('upload')}
              isLoading={isCreating}
            />
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Month Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Month</label>
              <div className="flex gap-2">
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
                {selectedMonth ? (
                  <button
                    onClick={() => setSelectedMonth('')}
                    title="Show all months"
                    className="px-3 py-2 text-sm text-gray-500 border border-gray-300 rounded-md hover:bg-gray-100 transition-colors whitespace-nowrap"
                  >
                    All
                  </button>
                ) : (
                  <button
                    onClick={() =>
                      setSelectedMonth(new Date().toISOString().split('T')[0].substring(0, 7))
                    }
                    title="Go to current month"
                    className="px-3 py-2 text-sm text-blue-600 border border-blue-300 rounded-md hover:bg-blue-50 transition-colors whitespace-nowrap"
                  >
                    This month
                  </button>
                )}
              </div>
              {!selectedMonth && (
                <p className="mt-1 text-xs text-gray-500">Showing all months</p>
              )}
            </div>

            {/* Category Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category (Optional)
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat.categoryId} value={cat.categoryId}>
                    {cat.icon} {cat.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-600 mb-2">Total Income</p>
            <p className="text-3xl font-bold text-green-600">${totalDeposits.toFixed(2)}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-600 mb-2">Total Expenses</p>
            <p className="text-3xl font-bold text-red-600">${totalPayments.toFixed(2)}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-600 mb-2">Net</p>
            <p
              className={`text-3xl font-bold ${totalDeposits - totalPayments >= 0 ? 'text-green-600' : 'text-red-600'}`}
            >
              ${(totalDeposits - totalPayments).toFixed(2)}
            </p>
          </div>
        </div>

        {/* Transactions List */}
        <TransactionList
          transactions={filteredTransactions}
          categories={categories}
          isLoading={isLoading}
          onEdit={handleEditTransaction}
          onDelete={handleDeleteTransaction}
        />

        {/* Edit Modal */}
        {editingTransaction && (
          <EditTransactionModal
            transaction={editingTransaction}
            categories={categories}
            onSave={handleSaveEdit}
            onClose={() => setEditingTransaction(null)}
          />
        )}
      </div>
    </div>
  );
}
