import { Router } from 'express';
import { authenticateToken, requireAdmin } from '../middleware/auth';
import { validateBody, validateQuery, dateRangeSchema } from '../middleware/validation';
import { insertExpenseSchema } from '@shared/schema';
import { 
  getRevenueReport, 
  listExpenses, 
  createExpense 
} from '../controllers/financialController';

const router = Router();

/**
 * @swagger
 * /api/reports/revenue:
 *   get:
 *     summary: Relatório de receitas
 *     tags: [Financial]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Data de início (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Data de fim (YYYY-MM-DD)
 *       - in: query
 *         name: barberId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID do barbeiro para filtrar
 *     responses:
 *       200:
 *         description: Relatório de receitas
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 period:
 *                   type: object
 *                   properties:
 *                     startDate:
 *                       type: string
 *                       format: date
 *                     endDate:
 *                       type: string
 *                       format: date
 *                 summary:
 *                   type: object
 *                   properties:
 *                     totalRevenue:
 *                       type: number
 *                     totalAppointments:
 *                       type: integer
 *                     averageTicket:
 *                       type: number
 *                 serviceBreakdown:
 *                   type: object
 *                 barbeiroBreakdown:
 *                   type: object
 *       403:
 *         description: Acesso negado - ADMIN ou superior
 */
router.get('/reports/revenue', authenticateToken, requireAdmin, validateQuery(dateRangeSchema), getRevenueReport);

/**
 * @swagger
 * /api/expenses:
 *   get:
 *     summary: Listar despesas
 *     tags: [Financial]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Data de início (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Data de fim (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Lista de despesas
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 expenses:
 *                   type: array
 *                   items:
 *                     type: object
 *                 summary:
 *                   type: object
 *                   properties:
 *                     totalExpenses:
 *                       type: number
 *                     expenseCount:
 *                       type: integer
 *                     categoryTotals:
 *                       type: object
 *       403:
 *         description: Acesso negado - ADMIN ou superior
 */
router.get('/expenses', authenticateToken, requireAdmin, listExpenses);

/**
 * @swagger
 * /api/expenses:
 *   post:
 *     summary: Cadastrar nova despesa
 *     tags: [Financial]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - description
 *               - amount
 *               - category
 *             properties:
 *               description:
 *                 type: string
 *               amount:
 *                 type: number
 *               category:
 *                 type: string
 *               date:
 *                 type: string
 *                 format: date
 *     responses:
 *       201:
 *         description: Despesa criada com sucesso
 *       400:
 *         description: Dados inválidos
 *       403:
 *         description: Acesso negado - ADMIN ou superior
 */
router.post('/expenses', authenticateToken, requireAdmin, validateBody(insertExpenseSchema), createExpense);

export default router;
