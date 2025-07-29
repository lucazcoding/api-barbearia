import { Router } from 'express';
import { authenticateToken, requireSuperAdmin, requireAdmin, requireSelfOrAdmin } from '../middleware/auth';
import { validateBody, validateParams, uuidSchema } from '../middleware/validation';
import { registerClientSchema, insertUserSchema } from '@shared/schema';
import { 
  registerClient, 
  createAdmin, 
  listAdmins, 
  deleteAdmin, 
  createBarbeiro, 
  listBarbeiros,
  updateUser,
  deleteUser
} from '../controllers/userController';
import { z } from 'zod';

const router = Router();

const createAdminSchema = insertUserSchema.extend({
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres")
});

const createBarbeiroSchema = insertUserSchema.extend({
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
  specialty: z.string().optional(),
  experience: z.number().int().min(0).optional()
});

const updateUserSchema = insertUserSchema.partial().extend({
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres").optional()
});

/**
 * @swagger
 * /api/register:
 *   post:
 *     summary: Cadastro de cliente
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - password
 *               - confirmPassword
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 minLength: 6
 *               confirmPassword:
 *                 type: string
 *               phone:
 *                 type: string
 *     responses:
 *       201:
 *         description: Cliente criado com sucesso
 *       400:
 *         description: Dados inválidos ou email já existe
 */
router.post('/register', validateBody(registerClientSchema), registerClient);

/**
 * @swagger
 * /api/admins:
 *   post:
 *     summary: Criar administrador
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - password
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 minLength: 6
 *               phone:
 *                 type: string
 *     responses:
 *       201:
 *         description: Administrador criado com sucesso
 *       403:
 *         description: Acesso negado - apenas SUPER_ADMIN
 */
router.post('/admins', authenticateToken, requireSuperAdmin, validateBody(createAdminSchema), createAdmin);

/**
 * @swagger
 * /api/admins:
 *   get:
 *     summary: Listar administradores
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de administradores
 *       403:
 *         description: Acesso negado - apenas SUPER_ADMIN
 */
router.get('/admins', authenticateToken, requireSuperAdmin, listAdmins);

/**
 * @swagger
 * /api/admins/{id}:
 *   delete:
 *     summary: Excluir administrador
 *     tags: [Users]
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
 *         description: Administrador excluído com sucesso
 *       403:
 *         description: Acesso negado - apenas SUPER_ADMIN
 *       404:
 *         description: Administrador não encontrado
 */
router.delete('/admins/:id', authenticateToken, requireSuperAdmin, validateParams(uuidSchema), deleteAdmin);

/**
 * @swagger
 * /api/barbeiros:
 *   post:
 *     summary: Cadastrar barbeiro
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - password
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 minLength: 6
 *               phone:
 *                 type: string
 *               specialty:
 *                 type: string
 *               experience:
 *                 type: integer
 *                 minimum: 0
 *     responses:
 *       201:
 *         description: Barbeiro criado com sucesso
 *       403:
 *         description: Acesso negado - ADMIN ou superior
 */
router.post('/barbeiros', authenticateToken, requireAdmin, validateBody(createBarbeiroSchema), createBarbeiro);

/**
 * @swagger
 * /api/barbeiros:
 *   get:
 *     summary: Listar barbeiros
 *     tags: [Users]
 *     responses:
 *       200:
 *         description: Lista de barbeiros
 */
router.get('/barbeiros', listBarbeiros);

/**
 * @swagger
 * /api/users/{id}:
 *   put:
 *     summary: Atualizar perfil do usuário
 *     tags: [Users]
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
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 minLength: 6
 *               phone:
 *                 type: string
 *     responses:
 *       200:
 *         description: Usuário atualizado com sucesso
 *       403:
 *         description: Acesso negado
 *       404:
 *         description: Usuário não encontrado
 */
router.put('/users/:id', authenticateToken, requireSelfOrAdmin, validateParams(uuidSchema), validateBody(updateUserSchema), updateUser);

/**
 * @swagger
 * /api/users/{id}:
 *   delete:
 *     summary: Excluir usuário
 *     tags: [Users]
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
 *         description: Usuário excluído com sucesso
 *       403:
 *         description: Acesso negado - ADMIN ou superior
 *       404:
 *         description: Usuário não encontrado
 */
router.delete('/users/:id', authenticateToken, requireAdmin, validateParams(uuidSchema), deleteUser);

export default router;
