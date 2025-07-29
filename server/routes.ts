import type { Express } from "express";
import { createServer, type Server } from "http";
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger';
import { scheduleCleanupTasks } from './utils/scheduler';

// Import route modules
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import appointmentRoutes from './routes/appointments';
import financialRoutes from './routes/financial';
import loyaltyRoutes from './routes/loyalty';
import configRoutes from './routes/config';
import adminRoutes from './routes/admin';

export async function registerRoutes(app: Express): Promise<Server> {
  // Swagger UI documentation
  app.use('/api-docs', swaggerUi.serve);
  app.get('/api-docs', swaggerUi.setup(swaggerSpec, {
    explorer: true,
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Barbershop API Documentation'
  }));

  // API routes
  app.use('/api/auth', authRoutes);
  app.use('/api', userRoutes);
  app.use('/api/appointments', appointmentRoutes);
  app.use('/api', financialRoutes);
  app.use('/api', loyaltyRoutes);
  app.use('/api/config', configRoutes);
  app.use('/api/super-admin', adminRoutes);

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      services: {
        database: 'connected',
        authentication: 'active',
        scheduler: 'running'
      }
    });
  });

  // Initialize scheduled tasks
  scheduleCleanupTasks();

  const httpServer = createServer(app);
  return httpServer;
}
