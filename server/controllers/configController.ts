import { Response } from 'express';
import { storage } from '../storage';
import { logIfEnabled } from '../utils/logger';
import { AuthenticatedRequest } from '../middleware/auth';
import { BusinessHours } from '@shared/schema';

export const setBusinessHours = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const businessHours: BusinessHours = req.body;

    if (!req.user) {
      return res.status(401).json({
        error: true,
        message: 'Usuário não autenticado',
        code: 'NOT_AUTHENTICATED'
      });
    }

    const config = await storage.setBusinessConfig({
      key: 'BUSINESS_HOURS',
      value: businessHours,
      description: 'Horários de funcionamento da barbearia',
      updatedBy: req.user.id
    });

    // Log configuration update
    await logIfEnabled(
      req.user.id,
      'UPDATE',
      req.ip,
      req.get('User-Agent'),
      {
        configKey: 'BUSINESS_HOURS',
        newValue: businessHours
      },
      config.id,
      'business_config'
    );

    res.json({
      message: 'Horários de funcionamento atualizados com sucesso',
      config
    });
  } catch (error) {
    console.error('Set business hours error:', error);
    res.status(500).json({
      error: true,
      message: 'Erro interno do servidor',
      code: 'INTERNAL_ERROR'
    });
  }
};

export const getBusinessHours = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const config = await storage.getBusinessConfig('BUSINESS_HOURS');
    
    if (!config) {
      // Return default business hours if none configured
      const defaultHours: BusinessHours = {
        monday: { start: '08:00', end: '18:00' },
        tuesday: { start: '08:00', end: '18:00' },
        wednesday: { start: '08:00', end: '18:00' },
        thursday: { start: '08:00', end: '18:00' },
        friday: { start: '08:00', end: '18:00' },
        saturday: { start: '08:00', end: '16:00' },
        sunday: null
      };

      return res.json({
        businessHours: defaultHours,
        isDefault: true
      });
    }

    res.json({
      businessHours: config.value,
      isDefault: false,
      lastUpdated: config.updatedAt
    });
  } catch (error) {
    console.error('Get business hours error:', error);
    res.status(500).json({
      error: true,
      message: 'Erro interno do servidor',
      code: 'INTERNAL_ERROR'
    });
  }
};

export const getAvailableTimeSlots = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { date, barberId } = req.query as {
      date?: string;
      barberId?: string;
    };

    if (!date) {
      return res.status(400).json({
        error: true,
        message: 'Data é obrigatória',
        code: 'MISSING_DATE'
      });
    }

    // Get business hours
    const businessHoursConfig = await storage.getBusinessConfig('BUSINESS_HOURS');
    if (!businessHoursConfig) {
      return res.status(500).json({
        error: true,
        message: 'Horários de funcionamento não configurados',
        code: 'BUSINESS_HOURS_NOT_CONFIGURED'
      });
    }

    const businessHours = businessHoursConfig.value as BusinessHours;
    
    // Get day of week
    const requestedDate = new Date(date);
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayName = dayNames[requestedDate.getDay()] as keyof BusinessHours;
    
    const dayHours = businessHours[dayName];
    if (!dayHours) {
      return res.json({
        date,
        availableSlots: [],
        message: 'Barbearia fechada neste dia'
      });
    }

    // Generate time slots (30-minute intervals)
    const slots = generateTimeSlots(dayHours.start, dayHours.end);

    // Get existing appointments for the date and barbeiro
    const appointments = await storage.getAppointmentsByDateRange(date, date);
    const busySlots = appointments
      .filter(apt => !barberId || apt.barberId === barberId)
      .filter(apt => ['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS'].includes(apt.status))
      .map(apt => apt.appointmentTime);

    // Filter out busy slots
    const availableSlots = slots.filter(slot => !busySlots.includes(slot));

    res.json({
      date,
      dayOfWeek: dayName,
      businessHours: dayHours,
      availableSlots,
      busySlots
    });
  } catch (error) {
    console.error('Get available time slots error:', error);
    res.status(500).json({
      error: true,
      message: 'Erro interno do servidor',
      code: 'INTERNAL_ERROR'
    });
  }
};

// Helper function to generate time slots
function generateTimeSlots(startTime: string, endTime: string): string[] {
  const slots: string[] = [];
  const start = parseTime(startTime);
  const end = parseTime(endTime);
  
  let current = start;
  while (current < end) {
    slots.push(formatTime(current));
    current += 30; // 30-minute intervals
  }
  
  return slots;
}

function parseTime(timeString: string): number {
  const [hours, minutes] = timeString.split(':').map(Number);
  return hours * 60 + minutes;
}

function formatTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}
