import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  transactionService,
  Transaction,
  TransactionPayload,
  UpdateTransactionPayload,
} from '../services/api';
import { useAuthContext } from './AuthContext';

interface TransactionContextValue {
  transactions: Transaction[];
  isLoading: boolean;
  error: string;
  createTransaction: (payload: TransactionPayload) => Promise<void>;
  updateTransaction: (transactionId: string, payload: UpdateTransactionPayload) => Promise<void>;
  deleteTransaction: (transactionId: string) => Promise<void>;
  refreshTransactions: (month?: string, categoryId?: string) => Promise<void>;
}

const TransactionContext = createContext<TransactionContextValue | undefined>(undefined);

function sortTransactions(transactions: Transaction[]): Transaction[] {
  return [...transactions].sort(
    (a, b) => new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime(),
  );
}

export function TransactionProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthContext();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentMonth, setCurrentMonth] = useState<string>();
  const [currentCategoryId, setCurrentCategoryId] = useState<string>();

  const refreshTransactions = React.useCallback(
    async (month?: string, categoryId?: string) => {
      if (!isAuthenticated) {
        setTransactions([]);
        return;
      }

      setCurrentMonth(month);
      setCurrentCategoryId(categoryId);
      setIsLoading(true);
      setError('');

      try {
        const nextTransactions = await transactionService.list(month, categoryId);
        setTransactions(sortTransactions(nextTransactions));
      } catch (err: any) {
        setError(err.message || 'No se pudieron cargar las transacciones');
      } finally {
        setIsLoading(false);
      }
    },
    [isAuthenticated],
  );

  useEffect(() => {
    void refreshTransactions();
  }, [refreshTransactions]);

  const value = useMemo<TransactionContextValue>(
    () => ({
      transactions,
      isLoading,
      error,
      async createTransaction(payload: TransactionPayload) {
        const optimisticTransaction: Transaction = {
          transactionId: `temp-${Date.now()}`,
          userId: 'current-user',
          categoryId: payload.categoryId,
          amount: payload.amount,
          type: payload.amount > 0 ? 'DEPOSIT' : 'PAYMENT',
          merchantName: payload.merchantName,
          receiptImageUrl: payload.receiptImageUrl || '',
          status: 'PENDING',
          transactionDate: payload.transactionDate,
          transactionMonth: payload.transactionDate.split('T')[0].substring(0, 7),
          notes: payload.notes,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        setError('');
        setTransactions((current) => sortTransactions([...current, optimisticTransaction]));

        try {
          const created = await transactionService.create(payload);
          setTransactions((current) =>
            sortTransactions(
              current.map((tx) =>
                tx.transactionId === optimisticTransaction.transactionId ? created : tx,
              ),
            ),
          );
        } catch (err: any) {
          setTransactions((current) =>
            current.filter((tx) => tx.transactionId !== optimisticTransaction.transactionId),
          );
          setError(err.message || 'No se pudo crear la transacción');
          throw err;
        }
      },
      async updateTransaction(transactionId: string, payload: UpdateTransactionPayload) {
        const previous = transactions;

        setError('');
        setTransactions((current) =>
          sortTransactions(
            current.map((tx) => {
              if (tx.transactionId === transactionId) {
                const updated: Transaction = {
                  ...tx,
                  ...(payload.categoryId !== undefined && { categoryId: payload.categoryId }),
                  ...(payload.merchantName !== undefined && { merchantName: payload.merchantName }),
                  ...(payload.notes !== undefined && { notes: payload.notes }),
                  ...(payload.status !== undefined && { status: payload.status }),
                  updatedAt: new Date().toISOString(),
                };
                if (payload.extractedData !== undefined && tx.extractedData) {
                  updated.extractedData = {
                    ...tx.extractedData,
                    ...payload.extractedData,
                  };
                }
                return updated;
              }
              return tx;
            }),
          ),
        );

        try {
          const updated = await transactionService.update(transactionId, payload);
          setTransactions((current) =>
            sortTransactions(
              current.map((tx) => (tx.transactionId === transactionId ? updated : tx)),
            ),
          );
        } catch (err: any) {
          setTransactions(previous);
          setError(err.message || 'No se pudo actualizar la transacción');
          throw err;
        }
      },
      async deleteTransaction(transactionId: string) {
        const previous = transactions;

        setError('');
        setTransactions((current) =>
          current.filter((tx) => tx.transactionId !== transactionId),
        );

        try {
          await transactionService.remove(transactionId);
        } catch (err: any) {
          setTransactions(previous);
          setError(err.message || 'No se pudo eliminar la transacción');
          throw err;
        }
      },
      refreshTransactions,
    }),
    [transactions, error, isLoading, refreshTransactions],
  );

  return (
    <TransactionContext.Provider value={value}>{children}</TransactionContext.Provider>
  );
}

export function useTransactionContext(): TransactionContextValue {
  const context = useContext(TransactionContext);

  if (!context) {
    throw new Error('useTransactionContext must be used within a TransactionProvider');
  }

  return context;
}
