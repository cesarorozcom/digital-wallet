import { v4 as uuidv4 } from 'uuid';
import DynamoDBService from './DynamoDBService';
import {
  Transaction,
  TransactionPayload,
  TransactionUpdatePayload,
  TransactionType,
  TransactionStatus,
} from '../models/Transaction';

class TransactionService {
  private tableName = process.env.TRANSACTIONS_TABLE || 'transactions';

  private getTransactionMonth(dateString: string): string {
    const date = new Date(dateString);
    return date.toISOString().split('T')[0].substring(0, 7);
  }

  private getTransactionType(amount: number): TransactionType {
    return amount > 0 ? 'DEPOSIT' : 'PAYMENT';
  }

  private validatePayload(payload: TransactionPayload): void {
    if (!payload.categoryId?.trim()) {
      throw new Error('Category ID is required');
    }

    if (payload.amount === 0 || !payload.amount) {
      throw new Error('Transaction amount cannot be zero');
    }

    if (!Number.isFinite(payload.amount)) {
      throw new Error('Transaction amount must be a valid number');
    }

    if (Math.round(payload.amount * 100) / 100 !== payload.amount) {
      throw new Error('Transaction amount must have at most 2 decimal places');
    }

    if (!payload.merchantName?.trim()) {
      throw new Error('Merchant name is required');
    }

    if (payload.merchantName.length > 100) {
      throw new Error('Merchant name must be 100 characters or less');
    }

    const txDate = new Date(payload.transactionDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (txDate > today) {
      throw new Error('Cannot create transactions for future dates');
    }

    if (payload.notes && payload.notes.length > 200) {
      throw new Error('Notes must be 200 characters or less');
    }
  }

  async listTransactions(
    userId: string,
    month?: string,
    categoryId?: string,
  ): Promise<Transaction[]> {
    const items = await DynamoDBService.scan(this.tableName);

    let filtered = items
      .filter((item) => item.userId === userId)
      .sort((a, b) => new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime()) as Transaction[];

    if (month) {
      filtered = filtered.filter((item) => item.transactionMonth === month);
    }

    if (categoryId) {
      filtered = filtered.filter((item) => item.categoryId === categoryId);
    }

    return filtered;
  }

  async getTransactionById(transactionId: string): Promise<Transaction | null> {
    const item = await DynamoDBService.get(this.tableName, { transactionId });
    return (item as Transaction) || null;
  }

  async createTransaction(userId: string, payload: TransactionPayload): Promise<Transaction> {
    this.validatePayload(payload);

    const now = new Date().toISOString();
    const amount = Math.round(payload.amount * 100) / 100;
    const type = this.getTransactionType(amount);
    const month = this.getTransactionMonth(payload.transactionDate);

    const transaction: Transaction = {
      transactionId: uuidv4(),
      userId,
      categoryId: payload.categoryId.trim(),
      amount,
      type,
      merchantName: payload.merchantName.trim(),
      receiptImageUrl: payload.receiptImageUrl?.trim() || '',
      status: 'PENDING',
      transactionDate: payload.transactionDate,
      transactionMonth: month,
      notes: payload.notes?.trim(),
      createdAt: now,
      updatedAt: now,
    };

    await DynamoDBService.put(this.tableName, transaction);
    return transaction;
  }

  async updateTransaction(
    userId: string,
    transactionId: string,
    payload: TransactionUpdatePayload,
  ): Promise<Transaction | null> {
    const transaction = await this.getTransactionById(transactionId);

    if (!transaction || transaction.userId !== userId) {
      return null;
    }

    const updates: Partial<Transaction> = {
      updatedAt: new Date().toISOString(),
    };

    if (payload.categoryId !== undefined) {
      if (!payload.categoryId.trim()) {
        throw new Error('Category ID is required');
      }
      updates.categoryId = payload.categoryId.trim();
    }

    if (payload.merchantName !== undefined) {
      if (!payload.merchantName.trim()) {
        throw new Error('Merchant name is required');
      }
      if (payload.merchantName.length > 100) {
        throw new Error('Merchant name must be 100 characters or less');
      }
      updates.merchantName = payload.merchantName.trim();
    }

    if (payload.notes !== undefined) {
      if (payload.notes && payload.notes.length > 200) {
        throw new Error('Notes must be 200 characters or less');
      }
      updates.notes = payload.notes?.trim();
    }

    if (payload.status !== undefined) {
      if (!['PENDING', 'PENDING_REVIEW', 'CONFIRMED'].includes(payload.status)) {
        throw new Error('Invalid transaction status');
      }
      updates.status = payload.status;
    }

    if (payload.extractedData !== undefined) {
      const base = transaction.extractedData || {};
      updates.extractedData = {
        ...base,
        ...payload.extractedData,
        confidence: payload.extractedData.confidence ?? (base as any).confidence ?? 0,
        rawText: payload.extractedData.rawText ?? (base as any).rawText ?? '',
      };
    }

    const updated = await DynamoDBService.update(this.tableName, { transactionId }, updates);
    return (updated as Transaction) || null;
  }

  async deleteTransaction(userId: string, transactionId: string): Promise<boolean> {
    const transaction = await this.getTransactionById(transactionId);

    if (!transaction || transaction.userId !== userId) {
      return false;
    }

    await DynamoDBService.delete(this.tableName, { transactionId });
    return true;
  }

  async getMonthlyTransactions(userId: string, month: string): Promise<Transaction[]> {
    return this.listTransactions(userId, month);
  }

  async getTransactionsByCategory(userId: string, categoryId: string): Promise<Transaction[]> {
    return this.listTransactions(userId, undefined, categoryId);
  }

  async getMonthlyTotal(userId: string, month: string, type?: TransactionType): Promise<number> {
    const transactions = await this.getMonthlyTransactions(userId, month);

    return transactions
      .filter((tx) => (type ? tx.type === type : true) && tx.status === 'CONFIRMED')
      .reduce((sum, tx) => sum + tx.amount, 0);
  }

  async getCategoryTotal(userId: string, categoryId: string): Promise<number> {
    const transactions = await this.getTransactionsByCategory(userId, categoryId);

    return transactions
      .filter((tx) => tx.status === 'CONFIRMED')
      .reduce((sum, tx) => sum + tx.amount, 0);
  }
}

export default new TransactionService();
