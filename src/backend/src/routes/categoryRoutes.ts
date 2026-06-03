import { Request, Response, Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import CategoryService from '../services/CategoryService';

const router = Router();

function getUserId(req: Request): string | null {
  return req.user?.sub || null;
}

router.use(authenticateToken);

router.post('/', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);

    if (!userId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const category = await CategoryService.createCategory(userId, req.body);
    res.status(201).json({ category });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Category creation failed' });
  }
});

router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);

    if (!userId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const categories = await CategoryService.listCategories(userId);
    res.json({ categories });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch categories' });
  }
});

router.put('/:categoryId', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);

    if (!userId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const category = await CategoryService.updateCategory(
      userId,
      req.params.categoryId,
      req.body,
    );

    if (!category) {
      res.status(404).json({ error: 'Category not found' });
      return;
    }

    res.json({ category });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Category update failed' });
  }
});

router.delete('/:categoryId', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);

    if (!userId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const deleted = await CategoryService.deleteCategory(userId, req.params.categoryId);

    if (!deleted) {
      res.status(404).json({ error: 'Category not found' });
      return;
    }

    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Category deletion failed' });
  }
});

export default router;

