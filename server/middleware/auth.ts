import { Request, Response, NextFunction } from 'express';
import { verifyJWT } from '../utils/jwt';
import { storage } from '../storage';
import { logUserAction } from '../utils/logger';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    name: string;
    role: 'SUPER_ADMIN' | 'ADMIN' | 'BARBEIRO' | 'CLIENTE';
  };
}

export const authenticateToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        error: true,
        message: 'Token de acesso requerido',
        code: 'MISSING_TOKEN'
      });
    }

    const decoded = verifyJWT(token);
    if (!decoded) {
      return res.status(401).json({
        error: true,
        message: 'Token inválido ou expirado',
        code: 'INVALID_TOKEN'
      });
    }

    const user = await storage.getUser(decoded.userId);
    if (!user || !user.isActive) {
      return res.status(401).json({
        error: true,
        message: 'Usuário não encontrado ou inativo',
        code: 'USER_NOT_FOUND'
      });
    }

    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role
    };

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(401).json({
      error: true,
      message: 'Erro na autenticação',
      code: 'AUTH_ERROR'
    });
  }
};

export const requireRole = (allowedRoles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        error: true,
        message: 'Usuário não autenticado',
        code: 'NOT_AUTHENTICATED'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      logUserAction(req.user.id, 'UNAUTHORIZED_ACCESS', req.ip, req.get('User-Agent'), {
        requiredRoles: allowedRoles,
        userRole: req.user.role,
        endpoint: req.path
      });

      return res.status(403).json({
        error: true,
        message: 'Acesso negado. Permissões insuficientes.',
        code: 'INSUFFICIENT_PERMISSIONS',
        details: {
          required: allowedRoles,
          current: req.user.role
        }
      });
    }

    next();
  };
};

// Helper middleware combinations
export const requireSuperAdmin = requireRole(['SUPER_ADMIN']);
export const requireAdmin = requireRole(['SUPER_ADMIN', 'ADMIN']);
export const requireBarbeiro = requireRole(['SUPER_ADMIN', 'ADMIN', 'BARBEIRO']);
export const requireCliente = requireRole(['SUPER_ADMIN', 'ADMIN', 'BARBEIRO', 'CLIENTE']);

export const requireSelfOrAdmin = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return res.status(401).json({
      error: true,
      message: 'Usuário não autenticado',
      code: 'NOT_AUTHENTICATED'
    });
  }

  const targetUserId = req.params.id || req.params.userId;
  const isAdmin = ['SUPER_ADMIN', 'ADMIN'].includes(req.user.role);
  const isSelf = req.user.id === targetUserId;

  if (!isAdmin && !isSelf) {
    return res.status(403).json({
      error: true,
      message: 'Acesso negado. Você só pode acessar seus próprios dados.',
      code: 'ACCESS_DENIED'
    });
  }

  next();
};
