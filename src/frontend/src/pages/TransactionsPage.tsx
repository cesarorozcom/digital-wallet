import React, { useEffect, useState } from 'react';
import { useTransactionContext } from '../context/TransactionContext';
import { useCategoryContext } from '../context/CategoryContext';
import { TransactionForm } from '../components/TransactionForm';
import { TransactionList } from '../components/TransactionList';
import { TransactionPayload } from '../services/api';

export function TransactionsPage() {
  const { transactions, isLoading, error, createTransaction, deleteTransaction, refreshTransactions } =
    useTransactionContext();
  const { categories } = useCategoryContext();

  const [showForm, setShowForm] = useState(false);
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
      setShowForm(false);
      setIsCreating(false);
    } catch (err) {
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
    if (selectedCategory && tx.categoryId !== selectedCategory) {
      return false;
    }
    return tx.transactionMonth === selectedMonth;
  });

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
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 transition-colors"
          >
            {showForm ? 'Cancel' : 'New Transaction'}
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md text-red-700">
            {error}
          </div>
        )}

        {/* Form Section */}
        {showForm && (
          <div className="mb-8">
            <TransactionForm
              categories={categories}
              onSubmit={handleCreateTransaction}
              onCancel={() => setShowForm(false)}
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
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
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
          onDelete={handleDeleteTransaction}
        />
      </div>
    </div>
  );
}
