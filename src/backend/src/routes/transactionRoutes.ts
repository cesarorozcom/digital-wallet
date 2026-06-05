import { Request, Response, Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import TransactionService from '../services/TransactionService';

const router = Router();

function getUserId(req: Request): string | null {
  return req.user?.sub || null;
}

router.use(authenticateToken);

// POST /api/transactions - T056: Create transaction
router.post('/', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);

    if (!userId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const transaction = await TransactionService.createTransaction(userId, req.body);
    res.status(201).json({ transaction });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Transaction creation failed' });
  }
});

// GET /api/transactions - T057: List transactions with filtering
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);

    if (!userId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const month = req.query.month as string | undefined;
    const categoryId = req.query.categoryId as string | undefined;

    const transactions = await TransactionService.listTransactions(userId, month, categoryId);
    res.json({ transactions });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch transactions' });
  }
});

// GET /api/transactions/:transactionId - T058: Get transaction by ID
router.get('/:transactionId', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);

    if (!userId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const transaction = await TransactionService.getTransactionById(req.params.transactionId);

    if (!transaction || transaction.userId !== userId) {
      res.status(404).json({ error: 'Transaction not found' });
      return;
    }

    res.json({ transaction });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch transaction' });
  }
});

// PUT /api/transactions/:transactionId - T059: Update transaction
router.put('/:transactionId', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);

    if (!userId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const transaction = await TransactionService.updateTransaction(
      userId,
      req.params.transactionId,
      req.body,
    );

    if (!transaction) {
      res.status(404).json({ error: 'Transaction not found' });
      return;
    }

    res.json({ transaction });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Transaction update failed' });
  }
});

// DELETE /api/transactions/:transactionId - T060: Delete transaction
router.delete('/:transactionId', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);

    if (!userId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const deleted = await TransactionService.deleteTransaction(userId, req.params.transactionId);

    if (!deleted) {
      res.status(404).json({ error: 'Transaction not found' });
      return;
    }

    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Transaction deletion failed' });
  }
});

export default router;
