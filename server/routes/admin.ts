import { Router } from 'express';
import { authenticateToken, requireSuperAdmin } from '../middleware/auth';
import { validateBody, validateQuery } from '../middleware/validation';
import { z } from 'zod';
import { 
  getSystemLogs, 
  toggleLogging, 
  getSystemStats 
} from '../controllers/adminController';

const router = Router();

const logsQuerySchema = z.object({
  limit: z.string().optional().transform(val => val ? parseInt(val) : 100)
});

const toggleLoggingSchema = z.object({
  enabled: z.boolean()
});

/**
 * @swagger
 * /api/super-admin/logs:
 *   get:
 *     summary: Ver logs do sistema
 *     description: Visualizar logs de auditoria do sistema incluindo ações de usuários, logins, exclusões, etc.
 *     tags: [Super Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 100
 *         description: Número máximo de logs para retornar
 *     responses:
 *       200:
 *         description: Logs do sistema
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 logs:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                       action:
 *                         type: string
 *                         enum: [LOGIN, LOGOUT, CREATE, UPDATE, DELETE, APPOINTMENT_CREATE, APPOINTMENT_UPDATE, VOUCHER_REDEEM]
 *                       userId:
 *                         type: string
 *                         format: uuid
 *                       resourceId:
 *                         type: string
 *                       resourceType:
 *                         type: string
 *                       ipAddress:
 *                         type: string
 *                       userAgent:
 *                         type: string
 *                       details:
 *                         type: object
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                 logsByDate:
 *                   type: object
 *                 summary:
 *                   type: object
 *                   properties:
 *                     totalLogs:
 *                       type: integer
 *                     uniqueUsers:
 *                       type: integer
 *                     uniqueIPs:
 *                       type: integer
 *                     actionCounts:
 *                       type: object
 *                     dateRange:
 *                       type: object
 *                       properties:
 *                         oldest:
 *                           type: string
 *                           format: date-time
 *                         newest:
 *                           type: string
 *                           format: date-time
 *       403:
 *         description: Acesso negado - apenas SUPER_ADMIN
 */
router.get('/logs', authenticateToken, requireSuperAdmin, validateQuery(logsQuerySchema), getSystemLogs);

/**
 * @swagger
 * /api/super-admin/toggle-logs:
 *   post:
 *     summary: Ativar/desativar rastreamento de logs
 *     tags: [Super Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - enabled
 *             properties:
 *               enabled:
 *                 type: boolean
 *                 description: true para ativar, false para desativar
 *     responses:
 *       200:
 *         description: Configuração de logging atualizada
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 loggingEnabled:
 *                   type: boolean
 *                 config:
 *                   type: object
 *       403:
 *         description: Acesso negado - apenas SUPER_ADMIN
 */
router.post('/toggle-logs', authenticateToken, requireSuperAdmin, validateBody(toggleLoggingSchema), toggleLogging);

/**
 * @swagger
 * /api/super-admin/stats:
 *   get:
 *     summary: Estatísticas gerais do sistema
 *     tags: [Super Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Estatísticas do sistema
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 users:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: string
 *                     barbeiros:
 *                       type: string
 *                 appointments:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: string
 *                     pending:
 *                       type: integer
 *                     completed:
 *                       type: string
 *                 vouchers:
 *                   type: object
 *                   properties:
 *                     active:
 *                       type: string
 *                 revenue:
 *                   type: object
 *                   properties:
 *                     last30Days:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: number
 *                         appointmentCount:
 *                           type: integer
 *                 system:
 *                   type: object
 *                   properties:
 *                     logsCount:
 *                       type: integer
 *                     lastLogActivity:
 *                       type: string
 *                       format: date-time
 *       403:
 *         description: Acesso negado - apenas SUPER_ADMIN
 */
router.get('/stats', authenticateToken, requireSuperAdmin, getSystemStats);

export default router;
