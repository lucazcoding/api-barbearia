import { storage } from '../storage';
import { InsertSystemLog } from '@shared/schema';

export const logUserAction = async (
  userId: string | null,
  action: 'LOGIN' | 'LOGOUT' | 'CREATE' | 'UPDATE' | 'DELETE' | 'APPOINTMENT_CREATE' | 'APPOINTMENT_UPDATE' | 'VOUCHER_REDEEM',
  ipAddress?: string,
  userAgent?: string,
  details?: any,
  resourceId?: string,
  resourceType?: string
) => {
  try {
    const logData: InsertSystemLog = {
      action,
      userId,
      resourceId,
      resourceType,
      ipAddress,
      userAgent,
      details
    };

    await storage.createSystemLog(logData);
  } catch (error) {
    console.error('Error creating system log:', error);
  }
};

export const isLoggingEnabled = async (): Promise<boolean> => {
  try {
    const config = await storage.getBusinessConfig('LOGGING_ENABLED');
    return config ? config.value === true : true; // Default to enabled
  } catch (error) {
    console.error('Error checking logging status:', error);
    return true; // Default to enabled on error
  }
};

export const logIfEnabled = async (
  userId: string | null,
  action: 'LOGIN' | 'LOGOUT' | 'CREATE' | 'UPDATE' | 'DELETE' | 'APPOINTMENT_CREATE' | 'APPOINTMENT_UPDATE' | 'VOUCHER_REDEEM',
  ipAddress?: string,
  userAgent?: string,
  details?: any,
  resourceId?: string,
  resourceType?: string
) => {
  const enabled = await isLoggingEnabled();
  if (enabled) {
    await logUserAction(userId, action, ipAddress, userAgent, details, resourceId, resourceType);
  }
};
