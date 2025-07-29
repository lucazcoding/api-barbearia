import { Response } from 'express';
import { storage } from '../storage';
import { logIfEnabled } from '../utils/logger';
import { AuthenticatedRequest } from '../middleware/auth';

export const getSystemLogs = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { limit = '100' } = req.query as { limit?: string };
    const limitNumber = parseInt(limit) || 100;

    const logs = await storage.getSystemLogs(limitNumber);

    // Group logs by date for better organization
    const logsByDate = logs.reduce((acc, log) => {
      const date = log.createdAt.toISOString().split('T')[0];
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(log);
      return acc;
    }, {} as Record<string, typeof logs>);

    // Calculate summary statistics
    const actionCounts = logs.reduce((acc, log) => {
      acc[log.action] = (acc[log.action] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const uniqueUsers = new Set(logs.filter(log => log.userId).map(log => log.userId)).size;
    const uniqueIPs = new Set(logs.filter(log => log.ipAddress).map(log => log.ipAddress)).size;

    const response = {
      logs,
      logsByDate,
      summary: {
        totalLogs: logs.length,
        uniqueUsers,
        uniqueIPs,
        actionCounts,
        dateRange: logs.length > 0 ? {
          oldest: logs[logs.length - 1].createdAt,
          newest: logs[0].createdAt
        } : null
      }
    };

    res.json(response);
  } catch (error) {
    console.error('Get system logs error:', error);
    res.status(500).json({
      error: true,
      message: 'Erro interno do servidor',
      code: 'INTERNAL_ERROR'
    });
  }
};

export const toggleLogging = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { enabled } = req.body;

    if (!req.user) {
      return res.status(401).json({
        error: true,
        message: 'Usuário não autenticado',
        code: 'NOT_AUTHENTICATED'
      });
    }

    if (typeof enabled !== 'boolean') {
      return res.status(400).json({
        error: true,
        message: 'Campo "enabled" deve ser um boolean',
        code: 'INVALID_ENABLED_VALUE'
      });
    }

    const config = await storage.setBusinessConfig({
      key: 'LOGGING_ENABLED',
      value: enabled,
      description: 'Controla se o sistema deve registrar logs de auditoria',
      updatedBy: req.user.id
    });

    // Always log this action regardless of the logging setting
    await logUserAction(
      req.user.id,
      'UPDATE',
      req.ip,
      req.get('User-Agent'),
      {
        configKey: 'LOGGING_ENABLED',
        newValue: enabled,
        previousValue: !enabled
      },
      config.id,
      'system_config'
    );

    res.json({
      message: `Logging ${enabled ? 'ativado' : 'desativado'} com sucesso`,
      loggingEnabled: enabled,
      config
    });
  } catch (error) {
    console.error('Toggle logging error:', error);
    res.status(500).json({
      error: true,
      message: 'Erro interno do servidor',
      code: 'INTERNAL_ERROR'
    });
  }
};

export const getSystemStats = async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Get various system statistics
    const [
      totalUsers,
      totalBarbeiros,
      totalAppointments,
      pendingAppointments,
      completedAppointments,
      activeVouchers,
      systemLogs
    ] = await Promise.all([
      // These would need to be implemented in storage
      // For now, we'll use basic queries
      storage.getSystemLogs(1).then(() => 'N/A'), // Placeholder
      storage.getSystemLogs(1).then(() => 'N/A'), // Placeholder
      storage.getSystemLogs(1).then(() => 'N/A'), // Placeholder
      storage.getPendingAppointments().then(apts => apts.length),
      storage.getSystemLogs(1).then(() => 'N/A'), // Placeholder
      storage.getSystemLogs(1).then(() => 'N/A'), // Placeholder
      storage.getSystemLogs(10)
    ]);

    // Get recent revenue (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const startDate = thirtyDaysAgo.toISOString().split('T')[0];
    const endDate = new Date().toISOString().split('T')[0];
    
    const recentRevenue = await storage.getRevenueByDateRange(startDate, endDate);

    const stats = {
      users: {
        total: totalUsers,
        barbeiros: totalBarbeiros
      },
      appointments: {
        total: totalAppointments,
        pending: pendingAppointments,
        completed: completedAppointments
      },
      vouchers: {
        active: activeVouchers
      },
      revenue: {
        last30Days: {
          total: parseFloat(recentRevenue.total),
          appointmentCount: recentRevenue.count
        }
      },
      system: {
        logsCount: systemLogs.length,
        lastLogActivity: systemLogs[0]?.createdAt || null
      }
    };

    res.json(stats);
  } catch (error) {
    console.error('Get system stats error:', error);
    res.status(500).json({
      error: true,
      message: 'Erro interno do servidor',
      code: 'INTERNAL_ERROR'
    });
  }
};

// Import logUserAction directly for the toggle logging function
import { logUserAction } from '../utils/logger';
