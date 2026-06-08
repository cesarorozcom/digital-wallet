import { Request, Response, Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import TransactionService from '../services/TransactionService';

const router = Router();

function getUserId(req: Request): string | null {
  return req.user?.sub || null;
}

router.use(authenticateToken);

// PUT /api/receipts/:receiptId/confirm - T081: Confirm receipt after user review
router.put('/:receiptId/confirm', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);

    if (!userId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const { receiptId } = req.params;
    const { reviewNotes, status = 'CONFIRMED' } = req.body;

    // Validate status
    const validStatuses = ['PENDING', 'PENDING_REVIEW', 'CONFIRMED'];
    if (!validStatuses.includes(status)) {
      res.status(400).json({ error: 'Invalid transaction status' });
      return;
    }

    // Get existing transaction to verify ownership and check current status
    const transaction = await TransactionService.getTransactionById(receiptId);

    if (!transaction || transaction.userId !== userId) {
      res.status(404).json({ error: 'Receipt not found' });
      return;
    }

    // Validate state transition
    const validTransitions: Record<string, string[]> = {
      PENDING: ['PENDING_REVIEW', 'CONFIRMED'],
      PENDING_REVIEW: ['CONFIRMED', 'PENDING'],
      CONFIRMED: ['PENDING_REVIEW', 'PENDING'],
    };

    if (!validTransitions[transaction.status]?.includes(status)) {
      res.status(400).json({
        error: 'INVALID_STATE_TRANSITION',
        message: `Cannot transition from ${transaction.status} to ${status}`,
        currentStatus: transaction.status,
        requestedStatus: status,
      });
      return;
    }

    // Prepare update payload
    const updatePayload: any = {
      status,
      updatedAt: new Date().toISOString(),
    };

    // Add review notes if provided
    if (reviewNotes !== undefined) {
      updatePayload.extractedData = {
        ...(transaction.extractedData || {}),
        reviewNotes: reviewNotes || undefined,
      };
    }

    // Update transaction
    const updatedTransaction = await TransactionService.updateTransaction(
      userId,
      receiptId,
      updatePayload,
    );

    if (!updatedTransaction) {
      res.status(404).json({ error: 'Failed to update receipt' });
      return;
    }

    res.json({
      transactionId: updatedTransaction.transactionId,
      status: updatedTransaction.status,
      message: `Receipt confirmed with status: ${updatedTransaction.status}`,
      transaction: updatedTransaction,
    });
  } catch (error: any) {
    console.error('Receipt confirmation error:', error);
    res.status(400).json({ error: error.message || 'Failed to confirm receipt' });
  }
});

export default router;