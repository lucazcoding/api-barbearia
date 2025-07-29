import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema } from 'zod';

export const validateBody = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = schema.safeParse(req.body);
      
      if (!result.success) {
        const errors = result.error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        }));

        return res.status(400).json({
          error: true,
          message: 'Dados de entrada inválidos',
          code: 'VALIDATION_ERROR',
          details: errors
        });
      }

      req.body = result.data;
      next();
    } catch (error) {
      console.error('Validation error:', error);
      return res.status(400).json({
        error: true,
        message: 'Erro na validação dos dados',
        code: 'VALIDATION_ERROR'
      });
    }
  };
};

export const validateParams = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = schema.safeParse(req.params);
      
      if (!result.success) {
        const errors = result.error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        }));

        return res.status(400).json({
          error: true,
          message: 'Parâmetros inválidos',
          code: 'VALIDATION_ERROR',
          details: errors
        });
      }

      req.params = result.data;
      next();
    } catch (error) {
      console.error('Params validation error:', error);
      return res.status(400).json({
        error: true,
        message: 'Erro na validação dos parâmetros',
        code: 'VALIDATION_ERROR'
      });
    }
  };
};

export const validateQuery = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = schema.safeParse(req.query);
      
      if (!result.success) {
        const errors = result.error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        }));

        return res.status(400).json({
          error: true,
          message: 'Parâmetros de consulta inválidos',
          code: 'VALIDATION_ERROR',
          details: errors
        });
      }

      req.query = result.data;
      next();
    } catch (error) {
      console.error('Query validation error:', error);
      return res.status(400).json({
        error: true,
        message: 'Erro na validação dos parâmetros de consulta',
        code: 'VALIDATION_ERROR'
      });
    }
  };
};

// Common validation schemas
export const uuidSchema = z.object({
  id: z.string().uuid('ID deve ser um UUID válido')
});

export const paginationSchema = z.object({
  page: z.string().optional().transform(val => val ? parseInt(val) : 1),
  limit: z.string().optional().transform(val => val ? parseInt(val) : 20)
});

export const dateRangeSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data de início deve estar no formato YYYY-MM-DD').optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data de fim deve estar no formato YYYY-MM-DD').optional(),
  barberId: z.string().uuid('ID do barbeiro deve ser um UUID válido').optional()
});
