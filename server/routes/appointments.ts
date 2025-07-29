import { Router } from 'express';
import { authenticateToken, requireBarbeiro, requireAdmin } from '../middleware/auth';
import { validateBody, validateParams, uuidSchema } from '../middleware/validation';
import { createAppointmentSchema, updateAppointmentSchema } from '@shared/schema';
import { 
  createAppointment, 
  listAppointments, 
  updateAppointment, 
  getPendingAppointments,
  deleteAppointment
} from '../controllers/appointmentController';

const router = Router();

/**
 * @swagger
 * /api/appointments:
 *   post:
 *     summary: Criar agendamento
 *     tags: [Appointments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - barberId
 *               - serviceType
 *               - appointmentDate
 *               - appointmentTime
 *             properties:
 *               barberId:
 *                 type: string
 *                 format: uuid
 *               serviceType:
 *                 type: string
 *               appointmentDate:
 *                 type: string
 *                 format: date
 *                 pattern: ^\d{4}-\d{2}-\d{2}$
 *               appointmentTime:
 *                 type: string
 *                 pattern: ^\d{2}:\d{2}$
 *               notes:
 *                 type: string
 *               price:
 *                 type: number
 *     responses:
 *       201:
 *         description: Agendamento criado com sucesso
 *       400:
 *         description: Dados inválidos
 *       404:
 *         description: Barbeiro não encontrado
 */
router.post('/', authenticateToken, validateBody(createAppointmentSchema), createAppointment);

/**
 * @swagger
 * /api/appointments:
 *   get:
 *     summary: Listar agendamentos
 *     description: |
 *       Retorna agendamentos baseado no papel do usuário:
 *       - CLIENTE: apenas seus próprios agendamentos
 *       - BARBEIRO: agendamentos atribuídos a ele
 *       - ADMIN/SUPER_ADMIN: todos os agendamentos
 *     tags: [Appointments]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de agendamentos
 *       401:
 *         description: Token inválido
 */
router.get('/', authenticateToken, listAppointments);

/**
 * @swagger
 * /api/appointments/{id}:
 *   put:
 *     summary: Atualizar status do agendamento
 *     tags: [Appointments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [SCHEDULED, CONFIRMED, IN_PROGRESS, COMPLETED, CANCELLED]
 *               notes:
 *                 type: string
 *               price:
 *                 type: string
 *     responses:
 *       200:
 *         description: Agendamento atualizado com sucesso
 *       403:
 *         description: Sem permissão para atualizar
 *       404:
 *         description: Agendamento não encontrado
 */
router.put('/:id', authenticateToken, validateParams(uuidSchema), validateBody(updateAppointmentSchema), updateAppointment);

/**
 * @swagger
 * /api/appointments/pending:
 *   get:
 *     summary: Visualizar agendamentos pendentes
 *     tags: [Appointments]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de agendamentos pendentes
 *       403:
 *         description: Acesso negado - BARBEIRO ou superior
 */
router.get('/pending', authenticateToken, requireBarbeiro, getPendingAppointments);

/**
 * @swagger
 * /api/appointments/{id}:
 *   delete:
 *     summary: Excluir agendamento
 *     tags: [Appointments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       204:
 *         description: Agendamento excluído com sucesso
 *       403:
 *         description: Acesso negado - ADMIN ou superior
 *       404:
 *         description: Agendamento não encontrado
 */
router.delete('/:id', authenticateToken, requireAdmin, validateParams(uuidSchema), deleteAppointment);

export default router;
