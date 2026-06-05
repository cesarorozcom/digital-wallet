export type TransactionType = 'DEPOSIT' | 'PAYMENT';
export type TransactionStatus = 'PENDING' | 'PENDING_REVIEW' | 'CONFIRMED';

export interface ExtractedData {
  confidence: number;
  rawText: string;
  reviewNotes?: string;
}

export interface Transaction {
  transactionId: string;
  userId: string;
  categoryId: string;
  amount: number;
  type: TransactionType;
  merchantName: string;
  receiptImageUrl: string;
  status: TransactionStatus;
  transactionDate: string;
  transactionMonth: string;
  notes?: string;
  extractedData?: ExtractedData;
  createdAt: string;
  updatedAt: string;
}

export interface TransactionPayload {
  categoryId: string;
  amount: number;
  merchantName: string;
  receiptImageUrl?: string;
  transactionDate: string;
  notes?: string;
}

export interface TransactionUpdatePayload {
  categoryId?: string;
  merchantName?: string;
  notes?: string;
  status?: TransactionStatus;
  extractedData?: Partial<ExtractedData>;
}
