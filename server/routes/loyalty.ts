import { Router } from 'express';
import { authenticateToken, requireAdmin, requireCliente } from '../middleware/auth';
import { validateBody } from '../middleware/validation';
import { insertVoucherConfigSchema } from '@shared/schema';
import { z } from 'zod';
import { 
  configureVouchers, 
  getUserVouchers, 
  redeemVoucher 
} from '../controllers/loyaltyController';

const router = Router();

const redeemVoucherSchema = z.object({
  code: z.string().min(1, 'Código do voucher é obrigatório'),
  appointmentId: z.string().uuid('ID do agendamento deve ser um UUID válido').optional()
});

/**
 * @swagger
 * /api/vouchers/config:
 *   post:
 *     summary: Configurar regras de fidelidade
 *     tags: [Loyalty]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - servicesRequired
 *               - discountPercentage
 *               - validityDays
 *               - description
 *             properties:
 *               servicesRequired:
 *                 type: integer
 *                 minimum: 1
 *                 description: Quantidade de serviços necessários para ganhar voucher
 *               discountPercentage:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 100
 *                 description: Porcentagem de desconto do voucher
 *               validityDays:
 *                 type: integer
 *                 minimum: 1
 *                 description: Dias de validade do voucher
 *               description:
 *                 type: string
 *                 description: Descrição do programa de fidelidade
 *     responses:
 *       201:
 *         description: Configuração criada com sucesso
 *       400:
 *         description: Dados inválidos
 *       403:
 *         description: Acesso negado - ADMIN ou superior
 */
router.post('/vouchers/config', authenticateToken, requireAdmin, validateBody(insertVoucherConfigSchema), configureVouchers);

/**
 * @swagger
 * /api/vouchers:
 *   get:
 *     summary: Vouchers do cliente
 *     tags: [Loyalty]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de vouchers do cliente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 vouchers:
 *                   type: array
 *                   items:
 *                     type: object
 *                 clientStats:
 *                   type: object
 *                   properties:
 *                     completedServices:
 *                       type: integer
 *                     totalSpent:
 *                       type: string
 *                     lastServiceDate:
 *                       type: string
 *                       format: date-time
 *                     nextVoucherIn:
 *                       type: integer
 *                 loyaltyConfig:
 *                   type: object
 *       401:
 *         description: Token inválido
 */
router.get('/vouchers', authenticateToken, requireCliente, getUserVouchers);

/**
 * @swagger
 * /api/vouchers/redeem:
 *   post:
 *     summary: Resgatar voucher
 *     tags: [Loyalty]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - code
 *             properties:
 *               code:
 *                 type: string
 *                 description: Código do voucher
 *               appointmentId:
 *                 type: string
 *                 format: uuid
 *                 description: ID do agendamento onde o voucher será usado
 *     responses:
 *       200:
 *         description: Voucher resgatado com sucesso
 *       400:
 *         description: Voucher inválido, usado ou expirado
 *       403:
 *         description: Voucher não pertence ao usuário
 *       404:
 *         description: Voucher ou agendamento não encontrado
 */
router.post('/vouchers/redeem', authenticateToken, requireCliente, validateBody(redeemVoucherSchema), redeemVoucher);

export default router;
