import React, { useState } from 'react';
import { Transaction, Category } from '../services/api';

const PAGE_SIZE = 10;

interface TransactionListProps {
  transactions: Transaction[];
  categories: Category[];
  isLoading?: boolean;
  onEdit?: (transaction: Transaction) => void;
  onDelete?: (transactionId: string) => void;
}

export function TransactionList({
  transactions,
  categories,
  isLoading = false,
  onEdit,
  onDelete,
}: TransactionListProps) {
  const [page, setPage] = useState(1);

  // Reset to page 1 whenever the transaction list changes (filter/month change)
  React.useEffect(() => { setPage(1); }, [transactions]);
  const totalPages = Math.max(1, Math.ceil(transactions.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * PAGE_SIZE;
  const pageEnd = pageStart + PAGE_SIZE;
  const visibleTransactions = transactions.slice(pageStart, pageEnd);
  const getCategoryName = (categoryId: string): string => {
    return categories.find((c) => c.categoryId === categoryId)?.name || 'Unknown';
  };

  const getCategoryIcon = (categoryId: string): string => {
    return categories.find((c) => c.categoryId === categoryId)?.icon || '📁';
  };

  const getCategoryColor = (categoryId: string): string => {
    return categories.find((c) => c.categoryId === categoryId)?.color || '#808080';
  };

  const formatAmount = (amount: number): string => {
    return amount > 0 ? `+$${amount.toFixed(2)}` : `-$${Math.abs(amount).toFixed(2)}`;
  };

  const getStatusBadgeClass = (status: string): string => {
    switch (status) {
      case 'CONFIRMED':
        return 'bg-green-100 text-green-800';
      case 'PENDING_REVIEW':
        return 'bg-yellow-100 text-yellow-800';
      case 'PENDING':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getAmountColor = (amount: number): string => {
    return amount > 0 ? 'text-green-600' : 'text-red-600';
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-center text-gray-500 py-8">No transactions found</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                Category
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                Merchant
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                Amount
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {visibleTransactions.map((transaction) => (
              <tr key={transaction.transactionId} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                  {new Date(transaction.transactionDate).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{getCategoryIcon(transaction.categoryId)}</span>
                    <span className="text-sm font-medium text-gray-900">
                      {getCategoryName(transaction.categoryId)}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                  {transaction.merchantName}
                </td>
                <td
                  className={`px-6 py-4 whitespace-nowrap text-right text-sm font-semibold ${getAmountColor(transaction.amount)}`}
                >
                  {formatAmount(transaction.amount)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  <span
                    className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeClass(transaction.status)}`}
                  >
                    {transaction.status.replace(/_/g, ' ')}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  <div className="flex gap-2 justify-center">
                    {onEdit && (
                      <button
                        onClick={() => onEdit(transaction)}
                        className="text-blue-600 hover:text-blue-900 font-medium text-sm"
                      >
                        Edit
                      </button>
                    )}
                    {onDelete && (
                      <button
                        onClick={() => onDelete(transaction.transactionId)}
                        className="text-red-600 hover:text-red-900 font-medium text-sm"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination footer */}
      <div className="flex items-center justify-between px-6 py-3 border-t bg-gray-50">
        <p className="text-sm text-gray-600">
          {transactions.length === 0
            ? 'No transactions'
            : `${pageStart + 1}–${Math.min(pageEnd, transactions.length)} of ${transactions.length}`}
        </p>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setPage(1)}
            disabled={safePage === 1}
            className="px-2 py-1 text-sm rounded border border-gray-300 text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            aria-label="First page"
          >
            «
          </button>
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={safePage === 1}
            className="px-2 py-1 text-sm rounded border border-gray-300 text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            aria-label="Previous page"
          >
            ‹
          </button>

          {/* Page number pills — show up to 5 around current page */}
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter((p) => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1)
            .reduce<(number | '…')[]>((acc, p, i, arr) => {
              if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push('…');
              acc.push(p);
              return acc;
            }, [])
            .map((p, i) =>
              p === '…' ? (
                <span key={`ellipsis-${i}`} className="px-2 py-1 text-sm text-gray-400">
                  …
                </span>
              ) : (
                <button
                  key={p}
                  onClick={() => setPage(p as number)}
                  className={`px-3 py-1 text-sm rounded border transition-colors ${
                    safePage === p
                      ? 'bg-blue-600 border-blue-600 text-white'
                      : 'border-gray-300 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {p}
                </button>
              ),
            )}

          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={safePage === totalPages}
            className="px-2 py-1 text-sm rounded border border-gray-300 text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            aria-label="Next page"
          >
            ›
          </button>
          <button
            onClick={() => setPage(totalPages)}
            disabled={safePage === totalPages}
            className="px-2 py-1 text-sm rounded border border-gray-300 text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            aria-label="Last page"
          >
            »
          </button>
        </div>
      </div>
    </div>
  );
}
