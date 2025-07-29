import { Response } from 'express';
import { storage } from '../storage';
import { logIfEnabled } from '../utils/logger';
import { AuthenticatedRequest } from '../middleware/auth';
import { InsertVoucherConfig } from '@shared/schema';

export const configureVouchers = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { servicesRequired, discountPercentage, validityDays, description } = req.body;

    if (!req.user) {
      return res.status(401).json({
        error: true,
        message: 'Usuário não autenticado',
        code: 'NOT_AUTHENTICATED'
      });
    }

    // Deactivate existing configurations
    const existingConfig = await storage.getActiveVoucherConfig();
    if (existingConfig) {
      await storage.updateVoucherConfig(existingConfig.id, { isActive: false });
    }

    // Create new configuration
    const configData: InsertVoucherConfig = {
      servicesRequired,
      discountPercentage,
      validityDays,
      description,
      isActive: true
    };

    const newConfig = await storage.createVoucherConfig(configData);

    // Log configuration creation
    await logIfEnabled(
      req.user.id,
      'CREATE',
      req.ip,
      req.get('User-Agent'),
      {
        servicesRequired,
        discountPercentage,
        validityDays,
        description
      },
      newConfig.id,
      'voucher_config'
    );

    res.status(201).json(newConfig);
  } catch (error) {
    console.error('Configure vouchers error:', error);
    res.status(500).json({
      error: true,
      message: 'Erro interno do servidor',
      code: 'INTERNAL_ERROR'
    });
  }
};

export const getUserVouchers = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: true,
        message: 'Usuário não autenticado',
        code: 'NOT_AUTHENTICATED'
      });
    }

    const vouchers = await storage.getUserVouchers(req.user.id);

    // Check for expired vouchers and update them
    const now = new Date();
    for (const voucher of vouchers) {
      if (voucher.status === 'ACTIVE' && new Date(voucher.expiryDate) < now) {
        await storage.updateVoucher(voucher.id, { status: 'EXPIRED' });
        voucher.status = 'EXPIRED';
      }
    }

    // Get client service count for context
    const serviceCount = await storage.getClientServiceCount(req.user.id);
    const config = await storage.getActiveVoucherConfig();

    const response = {
      vouchers,
      clientStats: {
        completedServices: serviceCount?.completedServices || 0,
        totalSpent: serviceCount?.totalSpent || '0',
        lastServiceDate: serviceCount?.lastServiceDate,
        nextVoucherIn: config 
          ? Math.max(0, config.servicesRequired - ((serviceCount?.completedServices || 0) % config.servicesRequired))
          : null
      },
      loyaltyConfig: config
    };

    res.json(response);
  } catch (error) {
    console.error('Get user vouchers error:', error);
    res.status(500).json({
      error: true,
      message: 'Erro interno do servidor',
      code: 'INTERNAL_ERROR'
    });
  }
};

export const redeemVoucher = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { code, appointmentId } = req.body;

    if (!req.user) {
      return res.status(401).json({
        error: true,
        message: 'Usuário não autenticado',
        code: 'NOT_AUTHENTICATED'
      });
    }

    // Find voucher by code
    const voucher = await storage.getVoucherByCode(code);
    if (!voucher) {
      return res.status(404).json({
        error: true,
        message: 'Voucher não encontrado',
        code: 'VOUCHER_NOT_FOUND'
      });
    }

    // Check if voucher belongs to user
    if (voucher.userId !== req.user.id) {
      return res.status(403).json({
        error: true,
        message: 'Este voucher não pertence a você',
        code: 'VOUCHER_NOT_OWNED'
      });
    }

    // Check if voucher is active
    if (voucher.status !== 'ACTIVE') {
      return res.status(400).json({
        error: true,
        message: 'Voucher já foi usado ou está expirado',
        code: 'VOUCHER_INACTIVE'
      });
    }

    // Check if voucher is expired
    if (new Date(voucher.expiryDate) < new Date()) {
      await storage.updateVoucher(voucher.id, { status: 'EXPIRED' });
      return res.status(400).json({
        error: true,
        message: 'Voucher expirado',
        code: 'VOUCHER_EXPIRED'
      });
    }

    // Verify appointment exists and belongs to user
    if (appointmentId) {
      const appointment = await storage.getAppointment(appointmentId);
      if (!appointment) {
        return res.status(404).json({
          error: true,
          message: 'Agendamento não encontrado',
          code: 'APPOINTMENT_NOT_FOUND'
        });
      }

      if (appointment.clientId !== req.user.id) {
        return res.status(403).json({
          error: true,
          message: 'Este agendamento não pertence a você',
          code: 'APPOINTMENT_NOT_OWNED'
        });
      }
    }

    // Mark voucher as used
    const updatedVoucher = await storage.updateVoucher(voucher.id, {
      status: 'USED',
      usedAt: new Date(),
      usedAppointmentId: appointmentId || null
    });

    // Log voucher redemption
    await logIfEnabled(
      req.user.id,
      'VOUCHER_REDEEM',
      req.ip,
      req.get('User-Agent'),
      {
        voucherCode: code,
        appointmentId
      },
      voucher.id,
      'voucher'
    );

    res.json({
      message: 'Voucher resgatado com sucesso',
      voucher: updatedVoucher
    });
  } catch (error) {
    console.error('Redeem voucher error:', error);
    res.status(500).json({
      error: true,
      message: 'Erro interno do servidor',
      code: 'INTERNAL_ERROR'
    });
  }
};
