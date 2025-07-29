import { Response } from 'express';
import { storage } from '../storage';
import { logIfEnabled } from '../utils/logger';
import { AuthenticatedRequest } from '../middleware/auth';
import { CreateAppointmentData, UpdateAppointmentData } from '@shared/schema';

export const createAppointment = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { barberId, serviceType, appointmentDate, appointmentTime, notes, price }: CreateAppointmentData = req.body;

    if (!req.user) {
      return res.status(401).json({
        error: true,
        message: 'Usuário não autenticado',
        code: 'NOT_AUTHENTICATED'
      });
    }

    // Verify barbeiro exists
    const barbeiro = await storage.getBarbeiro(barberId);
    if (!barbeiro) {
      return res.status(404).json({
        error: true,
        message: 'Barbeiro não encontrado',
        code: 'BARBEIRO_NOT_FOUND'
      });
    }

    // Check if barbeiro is available
    if (!barbeiro.isAvailable) {
      return res.status(400).json({
        error: true,
        message: 'Barbeiro não está disponível',
        code: 'BARBEIRO_UNAVAILABLE'
      });
    }

    // Create appointment
    const appointmentData = {
      clientId: req.user.id,
      barberId,
      serviceType,
      appointmentDate,
      appointmentTime,
      notes,
      price: price ? String(price) : null,
      status: 'SCHEDULED' as const
    };

    const newAppointment = await storage.createAppointment(appointmentData);

    // Log appointment creation
    await logIfEnabled(
      req.user.id,
      'APPOINTMENT_CREATE',
      req.ip,
      req.get('User-Agent'),
      {
        barberId,
        serviceType,
        appointmentDate,
        appointmentTime
      },
      newAppointment.id,
      'appointment'
    );

    res.status(201).json(newAppointment);
  } catch (error) {
    console.error('Create appointment error:', error);
    res.status(500).json({
      error: true,
      message: 'Erro interno do servidor',
      code: 'INTERNAL_ERROR'
    });
  }
};

export const listAppointments = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: true,
        message: 'Usuário não autenticado',
        code: 'NOT_AUTHENTICATED'
      });
    }

    let appointments;

    switch (req.user.role) {
      case 'CLIENTE':
        appointments = await storage.getAppointmentsByClient(req.user.id);
        break;
      
      case 'BARBEIRO':
        // Get barbeiro profile for the user
        const barbeiro = await storage.getBarbeiroByUserId(req.user.id);
        if (!barbeiro) {
          return res.status(404).json({
            error: true,
            message: 'Perfil de barbeiro não encontrado',
            code: 'BARBEIRO_PROFILE_NOT_FOUND'
          });
        }
        appointments = await storage.getAppointmentsByBarbeiro(barbeiro.id);
        break;
      
      case 'ADMIN':
      case 'SUPER_ADMIN':
        appointments = await storage.getAllAppointments();
        break;
      
      default:
        return res.status(403).json({
          error: true,
          message: 'Acesso negado',
          code: 'ACCESS_DENIED'
        });
    }

    res.json(appointments);
  } catch (error) {
    console.error('List appointments error:', error);
    res.status(500).json({
      error: true,
      message: 'Erro interno do servidor',
      code: 'INTERNAL_ERROR'
    });
  }
};

export const updateAppointment = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const updates: UpdateAppointmentData = req.body;

    if (!req.user) {
      return res.status(401).json({
        error: true,
        message: 'Usuário não autenticado',
        code: 'NOT_AUTHENTICATED'
      });
    }

    // Get existing appointment
    const existingAppointment = await storage.getAppointment(id);
    if (!existingAppointment) {
      return res.status(404).json({
        error: true,
        message: 'Agendamento não encontrado',
        code: 'APPOINTMENT_NOT_FOUND'
      });
    }

    // Check permissions
    const canUpdate = await checkUpdatePermissions(req.user, existingAppointment);
    if (!canUpdate) {
      return res.status(403).json({
        error: true,
        message: 'Sem permissão para atualizar este agendamento',
        code: 'UPDATE_PERMISSION_DENIED'
      });
    }

    // If appointment is being marked as completed, update client service count
    if (updates.status === 'COMPLETED' && existingAppointment.status !== 'COMPLETED') {
      const clientServiceCount = await storage.getClientServiceCount(existingAppointment.clientId);
      const newCompletedServices = (clientServiceCount?.completedServices || 0) + 1;
      const currentTotalSpent = parseFloat(clientServiceCount?.totalSpent || '0');
      const appointmentPrice = parseFloat(existingAppointment.price || '0');
      const newTotalSpent = (currentTotalSpent + appointmentPrice).toString();

      await storage.updateClientServiceCount(
        existingAppointment.clientId,
        newCompletedServices,
        newTotalSpent
      );

      // Check if client qualifies for a voucher
      await checkAndCreateVoucher(existingAppointment.clientId, newCompletedServices);
    }

    // Convert price to string if provided
    const updateData = {
      ...updates,
      price: updates.price ? String(updates.price) : undefined
    };

    // Update appointment
    const updatedAppointment = await storage.updateAppointment(id, updateData);
    if (!updatedAppointment) {
      return res.status(500).json({
        error: true,
        message: 'Erro ao atualizar agendamento',
        code: 'UPDATE_ERROR'
      });
    }

    // Log appointment update
    await logIfEnabled(
      req.user.id,
      'APPOINTMENT_UPDATE',
      req.ip,
      req.get('User-Agent'),
      {
        updatedFields: Object.keys(updates),
        newStatus: updates.status
      },
      id,
      'appointment'
    );

    res.json(updatedAppointment);
  } catch (error) {
    console.error('Update appointment error:', error);
    res.status(500).json({
      error: true,
      message: 'Erro interno do servidor',
      code: 'INTERNAL_ERROR'
    });
  }
};

export const getPendingAppointments = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const appointments = await storage.getPendingAppointments();
    res.json(appointments);
  } catch (error) {
    console.error('Get pending appointments error:', error);
    res.status(500).json({
      error: true,
      message: 'Erro interno do servidor',
      code: 'INTERNAL_ERROR'
    });
  }
};

export const deleteAppointment = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    if (!req.user) {
      return res.status(401).json({
        error: true,
        message: 'Usuário não autenticado',
        code: 'NOT_AUTHENTICATED'
      });
    }

    // Get existing appointment
    const appointment = await storage.getAppointment(id);
    if (!appointment) {
      return res.status(404).json({
        error: true,
        message: 'Agendamento não encontrado',
        code: 'APPOINTMENT_NOT_FOUND'
      });
    }

    // Only ADMIN and SUPER_ADMIN can delete appointments
    if (!['ADMIN', 'SUPER_ADMIN'].includes(req.user.role)) {
      return res.status(403).json({
        error: true,
        message: 'Apenas administradores podem deletar agendamentos',
        code: 'DELETE_PERMISSION_DENIED'
      });
    }

    // Delete appointment
    const deleted = await storage.deleteAppointment(id);
    if (!deleted) {
      return res.status(500).json({
        error: true,
        message: 'Erro ao deletar agendamento',
        code: 'DELETE_ERROR'
      });
    }

    // Log appointment deletion
    await logIfEnabled(
      req.user.id,
      'DELETE',
      req.ip,
      req.get('User-Agent'),
      {
        appointmentDate: appointment.appointmentDate,
        appointmentTime: appointment.appointmentTime,
        clientId: appointment.clientId,
        barberId: appointment.barberId
      },
      appointment.id,
      'appointment'
    );

    res.status(204).send();
  } catch (error) {
    console.error('Delete appointment error:', error);
    res.status(500).json({
      error: true,
      message: 'Erro interno do servidor',
      code: 'INTERNAL_ERROR'
    });
  }
};

// Helper functions
async function checkUpdatePermissions(user: any, appointment: any): Promise<boolean> {
  switch (user.role) {
    case 'SUPER_ADMIN':
    case 'ADMIN':
      return true;
    
    case 'BARBEIRO':
      // Barbeiro can only update appointments assigned to them
      const barbeiro = await storage.getBarbeiroByUserId(user.id);
      return barbeiro?.id === appointment.barberId;
    
    case 'CLIENTE':
      // Cliente can only update their own appointments and only if not completed
      return appointment.clientId === user.id && appointment.status !== 'COMPLETED';
    
    default:
      return false;
  }
}

async function checkAndCreateVoucher(clientId: string, completedServices: number): Promise<void> {
  try {
    const config = await storage.getActiveVoucherConfig();
    if (!config) return;

    // Check if client qualifies for a voucher
    if (completedServices % config.servicesRequired === 0) {
      // Generate voucher code
      const voucherCode = `FIDELIDADE${Date.now()}`;
      
      // Calculate expiry date
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + config.validityDays);

      // Create voucher
      await storage.createVoucher({
        userId: clientId,
        configId: config.id,
        code: voucherCode,
        status: 'ACTIVE',
        expiryDate,
        usedAt: null,
        usedAppointmentId: null
      });

      console.log(`Voucher created for client ${clientId}: ${voucherCode}`);
    }
  } catch (error) {
    console.error('Error checking/creating voucher:', error);
  }
}
