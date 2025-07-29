import { Response } from 'express';
import { storage } from '../storage';
import { logIfEnabled } from '../utils/logger';
import { AuthenticatedRequest } from '../middleware/auth';
import { InsertExpense } from '@shared/schema';

export const getRevenueReport = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { startDate, endDate, barberId } = req.query as {
      startDate?: string;
      endDate?: string;
      barberId?: string;
    };

    // Default to current month if no dates provided
    const now = new Date();
    const defaultStartDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const defaultEndDate = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

    const finalStartDate = startDate || defaultStartDate;
    const finalEndDate = endDate || defaultEndDate;

    // Get revenue data
    const revenueData = await storage.getRevenueByDateRange(finalStartDate, finalEndDate, barberId);

    // Get appointments for detailed breakdown
    const appointments = await storage.getAppointmentsByDateRange(finalStartDate, finalEndDate);
    
    // Filter by barbeiro if specified
    const filteredAppointments = barberId 
      ? appointments.filter(apt => apt.barberId === barberId && apt.status === 'COMPLETED')
      : appointments.filter(apt => apt.status === 'COMPLETED');

    // Group by service type
    const serviceBreakdown = filteredAppointments.reduce((acc, appointment) => {
      const serviceType = appointment.serviceType;
      const price = parseFloat(appointment.price || '0');
      
      if (!acc[serviceType]) {
        acc[serviceType] = { count: 0, total: 0 };
      }
      
      acc[serviceType].count++;
      acc[serviceType].total += price;
      
      return acc;
    }, {} as Record<string, { count: number; total: number }>);

    // Group by barbeiro if not filtered by one
    let barbeiroBreakdown = {};
    if (!barberId) {
      barbeiroBreakdown = filteredAppointments.reduce((acc, appointment) => {
        const barberId = appointment.barberId;
        const price = parseFloat(appointment.price || '0');
        
        if (!acc[barberId]) {
          acc[barberId] = { count: 0, total: 0 };
        }
        
        acc[barberId].count++;
        acc[barberId].total += price;
        
        return acc;
      }, {} as Record<string, { count: number; total: number }>);
    }

    const report = {
      period: {
        startDate: finalStartDate,
        endDate: finalEndDate
      },
      summary: {
        totalRevenue: parseFloat(revenueData.total),
        totalAppointments: revenueData.count,
        averageTicket: revenueData.count > 0 ? parseFloat(revenueData.total) / revenueData.count : 0
      },
      serviceBreakdown,
      ...(Object.keys(barbeiroBreakdown).length > 0 && { barbeiroBreakdown })
    };

    res.json(report);
  } catch (error) {
    console.error('Get revenue report error:', error);
    res.status(500).json({
      error: true,
      message: 'Erro interno do servidor',
      code: 'INTERNAL_ERROR'
    });
  }
};

export const listExpenses = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { startDate, endDate } = req.query as {
      startDate?: string;
      endDate?: string;
    };

    let expenses;
    if (startDate && endDate) {
      expenses = await storage.getExpensesByDateRange(startDate, endDate);
    } else {
      expenses = await storage.getExpenses();
    }

    // Calculate totals by category
    const categoryTotals = expenses.reduce((acc, expense) => {
      const category = expense.category;
      const amount = parseFloat(expense.amount);
      
      if (!acc[category]) {
        acc[category] = 0;
      }
      
      acc[category] += amount;
      
      return acc;
    }, {} as Record<string, number>);

    const totalExpenses = expenses.reduce((sum, expense) => sum + parseFloat(expense.amount), 0);

    const response = {
      expenses,
      summary: {
        totalExpenses,
        expenseCount: expenses.length,
        categoryTotals
      }
    };

    res.json(response);
  } catch (error) {
    console.error('List expenses error:', error);
    res.status(500).json({
      error: true,
      message: 'Erro interno do servidor',
      code: 'INTERNAL_ERROR'
    });
  }
};

export const createExpense = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { description, amount, category, date } = req.body;

    if (!req.user) {
      return res.status(401).json({
        error: true,
        message: 'Usuário não autenticado',
        code: 'NOT_AUTHENTICATED'
      });
    }

    const expenseData: InsertExpense = {
      description,
      amount: String(amount),
      category,
      date: date || new Date().toISOString().split('T')[0],
      createdBy: req.user.id
    };

    const newExpense = await storage.createExpense(expenseData);

    // Log expense creation
    await logIfEnabled(
      req.user.id,
      'CREATE',
      req.ip,
      req.get('User-Agent'),
      {
        description,
        amount,
        category,
        date: expenseData.date
      },
      newExpense.id,
      'expense'
    );

    res.status(201).json(newExpense);
  } catch (error) {
    console.error('Create expense error:', error);
    res.status(500).json({
      error: true,
      message: 'Erro interno do servidor',
      code: 'INTERNAL_ERROR'
    });
  }
};
