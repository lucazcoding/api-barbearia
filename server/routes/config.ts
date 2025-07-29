import { Router } from 'express';
import { authenticateToken, requireAdmin } from '../middleware/auth';
import { validateBody, validateQuery } from '../middleware/validation';
import { businessHoursSchema } from '@shared/schema';
import { z } from 'zod';
import { 
  setBusinessHours, 
  getBusinessHours, 
  getAvailableTimeSlots 
} from '../controllers/configController';

const router = Router();

const timeSlotsQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data deve estar no formato YYYY-MM-DD'),
  barberId: z.string().uuid('ID do barbeiro deve ser um UUID válido').optional()
});

/**
 * @swagger
 * /api/config/hours:
 *   post:
 *     summary: Configurar horários de funcionamento
 *     tags: [Configuration]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               monday:
 *                 type: object
 *                 properties:
 *                   start:
 *                     type: string
 *                     pattern: ^\d{2}:\d{2}$
 *                   end:
 *                     type: string
 *                     pattern: ^\d{2}:\d{2}$
 *                 nullable: true
 *               tuesday:
 *                 type: object
 *                 properties:
 *                   start:
 *                     type: string
 *                     pattern: ^\d{2}:\d{2}$
 *                   end:
 *                     type: string
 *                     pattern: ^\d{2}:\d{2}$
 *                 nullable: true
 *               wednesday:
 *                 type: object
 *                 properties:
 *                   start:
 *                     type: string
 *                     pattern: ^\d{2}:\d{2}$
 *                   end:
 *                     type: string
 *                     pattern: ^\d{2}:\d{2}$
 *                 nullable: true
 *               thursday:
 *                 type: object
 *                 properties:
 *                   start:
 *                     type: string
 *                     pattern: ^\d{2}:\d{2}$
 *                   end:
 *                     type: string
 *                     pattern: ^\d{2}:\d{2}$
 *                 nullable: true
 *               friday:
 *                 type: object
 *                 properties:
 *                   start:
 *                     type: string
 *                     pattern: ^\d{2}:\d{2}$
 *                   end:
 *                     type: string
 *                     pattern: ^\d{2}:\d{2}$
 *                 nullable: true
 *               saturday:
 *                 type: object
 *                 properties:
 *                   start:
 *                     type: string
 *                     pattern: ^\d{2}:\d{2}$
 *                   end:
 *                     type: string
 *                     pattern: ^\d{2}:\d{2}$
 *                 nullable: true
 *               sunday:
 *                 type: object
 *                 properties:
 *                   start:
 *                     type: string
 *                     pattern: ^\d{2}:\d{2}$
 *                   end:
 *                     type: string
 *                     pattern: ^\d{2}:\d{2}$
 *                 nullable: true
 *             example:
 *               monday: { start: "08:00", end: "18:00" }
 *               tuesday: { start: "08:00", end: "18:00" }
 *               wednesday: { start: "08:00", end: "18:00" }
 *               thursday: { start: "08:00", end: "18:00" }
 *               friday: { start: "08:00", end: "18:00" }
 *               saturday: { start: "08:00", end: "16:00" }
 *               sunday: null
 *     responses:
 *       200:
 *         description: Horários configurados com sucesso
 *       400:
 *         description: Dados inválidos
 *       403:
 *         description: Acesso negado - ADMIN ou superior
 */
router.post('/hours', authenticateToken, requireAdmin, validateBody(businessHoursSchema), setBusinessHours);

/**
 * @swagger
 * /api/config/hours:
 *   get:
 *     summary: Consultar horários de funcionamento
 *     tags: [Configuration]
 *     responses:
 *       200:
 *         description: Horários de funcionamento
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 businessHours:
 *                   type: object
 *                 isDefault:
 *                   type: boolean
 *                 lastUpdated:
 *                   type: string
 *                   format: date-time
 */
router.get('/hours', getBusinessHours);

/**
 * @swagger
 * /api/config/available-slots:
 *   get:
 *     summary: Horários disponíveis para agendamento
 *     tags: [Configuration]
 *     parameters:
 *       - in: query
 *         name: date
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Data para consultar horários (YYYY-MM-DD)
 *       - in: query
 *         name: barberId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID do barbeiro para filtrar horários
 *     responses:
 *       200:
 *         description: Horários disponíveis
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 date:
 *                   type: string
 *                   format: date
 *                 dayOfWeek:
 *                   type: string
 *                 businessHours:
 *                   type: object
 *                   properties:
 *                     start:
 *                       type: string
 *                     end:
 *                       type: string
 *                 availableSlots:
 *                   type: array
 *                   items:
 *                     type: string
 *                 busySlots:
 *                   type: array
 *                   items:
 *                     type: string
 *       400:
 *         description: Data não fornecida ou inválida
 */
router.get('/available-slots', validateQuery(timeSlotsQuerySchema), getAvailableTimeSlots);

export default router;
