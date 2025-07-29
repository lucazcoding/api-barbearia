import { Response } from 'express';
import bcrypt from 'bcrypt';
import { storage } from '../storage';
import { generateJWT } from '../utils/jwt';
import { logIfEnabled } from '../utils/logger';
import { AuthenticatedRequest } from '../middleware/auth';
import { LoginData } from '@shared/schema';

export const login = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { email, password }: LoginData = req.body;

    // Find user by email
    const user = await storage.getUserByEmail(email);
    if (!user) {
      return res.status(401).json({
        error: true,
        message: 'Email ou senha inválidos',
        code: 'INVALID_CREDENTIALS'
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({
        error: true,
        message: 'Conta desativada. Entre em contato com o administrador.',
        code: 'ACCOUNT_DISABLED'
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        error: true,
        message: 'Email ou senha inválidos',
        code: 'INVALID_CREDENTIALS'
      });
    }

    // Generate JWT token
    const token = generateJWT({
      userId: user.id,
      email: user.email,
      role: user.role
    });

    // Log successful login
    await logIfEnabled(
      user.id,
      'LOGIN',
      req.ip,
      req.get('User-Agent'),
      { email: user.email }
    );

    // Return user data (without password) and token
    const { password: _, ...userWithoutPassword } = user;
    
    res.json({
      token,
      user: userWithoutPassword
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      error: true,
      message: 'Erro interno do servidor',
      code: 'INTERNAL_ERROR'
    });
  }
};

export const logout = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (req.user) {
      await logIfEnabled(
        req.user.id,
        'LOGOUT',
        req.ip,
        req.get('User-Agent'),
        { email: req.user.email }
      );
    }

    res.status(204).send();
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      error: true,
      message: 'Erro interno do servidor',
      code: 'INTERNAL_ERROR'
    });
  }
};

export const me = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: true,
        message: 'Usuário não autenticado',
        code: 'NOT_AUTHENTICATED'
      });
    }

    const user = await storage.getUser(req.user.id);
    if (!user) {
      return res.status(404).json({
        error: true,
        message: 'Usuário não encontrado',
        code: 'USER_NOT_FOUND'
      });
    }

    const { password: _, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  } catch (error) {
    console.error('Get user info error:', error);
    res.status(500).json({
      error: true,
      message: 'Erro interno do servidor',
      code: 'INTERNAL_ERROR'
    });
  }
};
