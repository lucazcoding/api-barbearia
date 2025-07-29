import cron from 'node-cron';
import { storage } from '../storage';
import { logUserAction } from './logger';

// Clean up old pending appointments (runs daily at 2 AM)
export const scheduleCleanupTasks = () => {
  cron.schedule('0 2 * * *', async () => {
    try {
      console.log('Running scheduled cleanup of old pending appointments...');
      
      const oldAppointments = await storage.getOldPendingAppointments();
      
      for (const appointment of oldAppointments) {
        await storage.updateAppointment(appointment.id, { 
          status: 'CANCELLED',
          notes: (appointment.notes || '') + ' [Auto-cancelado por prazo expirado]'
        });
        
        await logUserAction(
          null,
          'UPDATE',
          'system',
          'scheduler',
          {
            reason: 'Auto-cancelled due to expired date',
            originalDate: appointment.appointmentDate,
            originalTime: appointment.appointmentTime
          },
          appointment.id,
          'appointment'
        );
      }
      
      console.log(`Cleaned up ${oldAppointments.length} old pending appointments`);
    } catch (error) {
      console.error('Error in scheduled cleanup:', error);
    }
  });

  // Check for loyalty program voucher generation (runs daily at 1 AM)
  cron.schedule('0 1 * * *', async () => {
    try {
      console.log('Checking for loyalty voucher generation...');
      
      const config = await storage.getActiveVoucherConfig();
      if (!config) {
        console.log('No active voucher config found');
        return;
      }

      // This would require more complex logic to track completed services
      // and generate vouchers based on the loyalty program rules
      // For now, we'll just log that the check ran
      console.log('Loyalty voucher check completed');
    } catch (error) {
      console.error('Error in loyalty voucher check:', error);
    }
  });

  console.log('Scheduled tasks initialized');
};
