import { Response } from 'express';
import bcrypt from 'bcrypt';
import { storage } from '../storage';
import { logIfEnabled } from '../utils/logger';
import { AuthenticatedRequest } from '../middleware/auth';
import { RegisterClientData, InsertUser, InsertBarbeiro } from '@shared/schema';

export const registerClient = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, email, password, phone }: RegisterClientData = req.body;

    // Check if user already exists
    const existingUser = await storage.getUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({
        error: true,
        message: 'Email já está em uso',
        code: 'EMAIL_EXISTS'
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const userData: InsertUser = {
      name,
      email,
      password: hashedPassword,
      phone,
      role: 'CLIENTE'
    };

    const newUser = await storage.createUser(userData);

    // Initialize client service count
    await storage.updateClientServiceCount(newUser.id, 0, '0');

    // Log user creation
    await logIfEnabled(
      newUser.id,
      'CREATE',
      req.ip,
      req.get('User-Agent'),
      { email: newUser.email, role: 'CLIENTE' },
      newUser.id,
      'user'
    );

    // Return user data (without password)
    const { password: _, ...userWithoutPassword } = newUser;
    
    res.status(201).json(userWithoutPassword);
  } catch (error) {
    console.error('Register client error:', error);
    res.status(500).json({
      error: true,
      message: 'Erro interno do servidor',
      code: 'INTERNAL_ERROR'
    });
  }
};

export const createAdmin = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, email, password, phone } = req.body;

    // Check if user already exists
    const existingUser = await storage.getUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({
        error: true,
        message: 'Email já está em uso',
        code: 'EMAIL_EXISTS'
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create admin user
    const userData: InsertUser = {
      name,
      email,
      password: hashedPassword,
      phone,
      role: 'ADMIN'
    };

    const newAdmin = await storage.createUser(userData);

    // Log admin creation
    await logIfEnabled(
      req.user?.id || null,
      'CREATE',
      req.ip,
      req.get('User-Agent'),
      { 
        email: newAdmin.email, 
        role: 'ADMIN',
        createdBy: req.user?.email 
      },
      newAdmin.id,
      'user'
    );

    // Return user data (without password)
    const { password: _, ...userWithoutPassword } = newAdmin;
    
    res.status(201).json(userWithoutPassword);
  } catch (error) {
    console.error('Create admin error:', error);
    res.status(500).json({
      error: true,
      message: 'Erro interno do servidor',
      code: 'INTERNAL_ERROR'
    });
  }
};

export const listAdmins = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const admins = await storage.listAdmins();
    
    // Remove passwords from response
    const adminsWithoutPasswords = admins.map(admin => {
      const { password: _, ...adminWithoutPassword } = admin;
      return adminWithoutPassword;
    });

    res.json(adminsWithoutPasswords);
  } catch (error) {
    console.error('List admins error:', error);
    res.status(500).json({
      error: true,
      message: 'Erro interno do servidor',
      code: 'INTERNAL_ERROR'
    });
  }
};

export const deleteAdmin = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Get admin to be deleted
    const admin = await storage.getUser(id);
    if (!admin) {
      return res.status(404).json({
        error: true,
        message: 'Administrador não encontrado',
        code: 'ADMIN_NOT_FOUND'
      });
    }

    if (admin.role !== 'ADMIN') {
      return res.status(400).json({
        error: true,
        message: 'Usuário não é um administrador',
        code: 'NOT_ADMIN'
      });
    }

    // Prevent self-deletion
    if (admin.id === req.user?.id) {
      return res.status(400).json({
        error: true,
        message: 'Você não pode deletar sua própria conta',
        code: 'CANNOT_DELETE_SELF'
      });
    }

    // Delete admin
    const deleted = await storage.deleteUser(id);
    if (!deleted) {
      return res.status(500).json({
        error: true,
        message: 'Erro ao deletar administrador',
        code: 'DELETE_ERROR'
      });
    }

    // Log admin deletion
    await logIfEnabled(
      req.user?.id || null,
      'DELETE',
      req.ip,
      req.get('User-Agent'),
      { 
        deletedEmail: admin.email,
        deletedRole: admin.role,
        deletedBy: req.user?.email 
      },
      admin.id,
      'user'
    );

    res.status(204).send();
  } catch (error) {
    console.error('Delete admin error:', error);
    res.status(500).json({
      error: true,
      message: 'Erro interno do servidor',
      code: 'INTERNAL_ERROR'
    });
  }
};

export const createBarbeiro = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, email, password, phone, specialty, experience } = req.body;

    // Check if user already exists
    const existingUser = await storage.getUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({
        error: true,
        message: 'Email já está em uso',
        code: 'EMAIL_EXISTS'
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user first
    const userData: InsertUser = {
      name,
      email,
      password: hashedPassword,
      phone,
      role: 'BARBEIRO'
    };

    const newUser = await storage.createUser(userData);

    // Create barbeiro profile
    const barbeiroData: InsertBarbeiro = {
      userId: newUser.id,
      specialty,
      experience
    };

    const newBarbeiro = await storage.createBarbeiro(barbeiroData);

    // Log barbeiro creation
    await logIfEnabled(
      req.user?.id || null,
      'CREATE',
      req.ip,
      req.get('User-Agent'),
      { 
        email: newUser.email, 
        role: 'BARBEIRO',
        specialty,
        createdBy: req.user?.email 
      },
      newUser.id,
      'barbeiro'
    );

    // Return combined data
    const { password: _, ...userWithoutPassword } = newUser;
    
    res.status(201).json({
      ...userWithoutPassword,
      barbeiroProfile: newBarbeiro
    });
  } catch (error) {
    console.error('Create barbeiro error:', error);
    res.status(500).json({
      error: true,
      message: 'Erro interno do servidor',
      code: 'INTERNAL_ERROR'
    });
  }
};

export const listBarbeiros = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const barbeiros = await storage.listBarbeiros();
    
    // Format response to include user data with barbeiro profile
    const formattedBarbeiros = barbeiros.map(({ barbeiros: barbeiroProfile, users: user }) => {
      const { password: _, ...userWithoutPassword } = user;
      return {
        ...userWithoutPassword,
        barbeiroProfile
      };
    });

    res.json(formattedBarbeiros);
  } catch (error) {
    console.error('List barbeiros error:', error);
    res.status(500).json({
      error: true,
      message: 'Erro interno do servidor',
      code: 'INTERNAL_ERROR'
    });
  }
};

export const updateUser = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Get existing user
    const existingUser = await storage.getUser(id);
    if (!existingUser) {
      return res.status(404).json({
        error: true,
        message: 'Usuário não encontrado',
        code: 'USER_NOT_FOUND'
      });
    }

    // If password is being updated, hash it
    if (updates.password) {
      updates.password = await bcrypt.hash(updates.password, 12);
    }

    // Update user
    const updatedUser = await storage.updateUser(id, updates);
    if (!updatedUser) {
      return res.status(500).json({
        error: true,
        message: 'Erro ao atualizar usuário',
        code: 'UPDATE_ERROR'
      });
    }

    // Log user update
    await logIfEnabled(
      req.user?.id || null,
      'UPDATE',
      req.ip,
      req.get('User-Agent'),
      { 
        updatedFields: Object.keys(updates),
        updatedBy: req.user?.email 
      },
      id,
      'user'
    );

    // Return updated user (without password)
    const { password: _, ...userWithoutPassword } = updatedUser;
    res.json(userWithoutPassword);
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      error: true,
      message: 'Erro interno do servidor',
      code: 'INTERNAL_ERROR'
    });
  }
};

export const deleteUser = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Get user to be deleted
    const user = await storage.getUser(id);
    if (!user) {
      return res.status(404).json({
        error: true,
        message: 'Usuário não encontrado',
        code: 'USER_NOT_FOUND'
      });
    }

    // Prevent self-deletion
    if (user.id === req.user?.id) {
      return res.status(400).json({
        error: true,
        message: 'Você não pode deletar sua própria conta',
        code: 'CANNOT_DELETE_SELF'
      });
    }

    // Delete user
    const deleted = await storage.deleteUser(id);
    if (!deleted) {
      return res.status(500).json({
        error: true,
        message: 'Erro ao deletar usuário',
        code: 'DELETE_ERROR'
      });
    }

    // Log user deletion
    await logIfEnabled(
      req.user?.id || null,
      'DELETE',
      req.ip,
      req.get('User-Agent'),
      { 
        deletedEmail: user.email,
        deletedRole: user.role,
        deletedBy: req.user?.email 
      },
      user.id,
      'user'
    );

    res.status(204).send();
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      error: true,
      message: 'Erro interno do servidor',
      code: 'INTERNAL_ERROR'
    });
  }
};
