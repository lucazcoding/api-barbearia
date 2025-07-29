import swaggerJsdoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Barbershop API',
      version: '1.0.0',
      description: 'Sistema completo de agendamento para barbearia com autenticação JWT e controle de permissões.',
      contact: {
        name: 'API Support',
        email: 'support@barbershop.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: process.env.NODE_ENV === 'production' 
          ? 'https://api.barbershop.com'
          : `http://localhost:${process.env.PORT || 5000}`,
        description: process.env.NODE_ENV === 'production' ? 'Production server' : 'Development server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Token JWT obtido através do endpoint /api/auth/login'
        }
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'boolean',
              example: true
            },
            message: {
              type: 'string',
              example: 'Descrição do erro'
            },
            code: {
              type: 'string',
              example: 'ERROR_CODE'
            },
            details: {
              type: 'object',
              description: 'Detalhes específicos do erro'
            }
          }
        },
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid'
            },
            name: {
              type: 'string'
            },
            email: {
              type: 'string',
              format: 'email'
            },
            phone: {
              type: 'string'
            },
            role: {
              type: 'string',
              enum: ['SUPER_ADMIN', 'ADMIN', 'BARBEIRO', 'CLIENTE']
            },
            isActive: {
              type: 'boolean'
            },
            createdAt: {
              type: 'string',
              format: 'date-time'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time'
            }
          }
        },
        Appointment: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid'
            },
            clientId: {
              type: 'string',
              format: 'uuid'
            },
            barberId: {
              type: 'string',
              format: 'uuid'
            },
            serviceType: {
              type: 'string'
            },
            appointmentDate: {
              type: 'string',
              format: 'date'
            },
            appointmentTime: {
              type: 'string',
              pattern: '^\\d{2}:\\d{2}$'
            },
            status: {
              type: 'string',
              enum: ['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']
            },
            notes: {
              type: 'string'
            },
            price: {
              type: 'string'
            },
            createdAt: {
              type: 'string',
              format: 'date-time'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time'
            }
          }
        },
        Voucher: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid'
            },
            userId: {
              type: 'string',
              format: 'uuid'
            },
            configId: {
              type: 'string',
              format: 'uuid'
            },
            code: {
              type: 'string'
            },
            status: {
              type: 'string',
              enum: ['ACTIVE', 'USED', 'EXPIRED']
            },
            expiryDate: {
              type: 'string',
              format: 'date-time'
            },
            usedAt: {
              type: 'string',
              format: 'date-time',
              nullable: true
            },
            usedAppointmentId: {
              type: 'string',
              format: 'uuid',
              nullable: true
            },
            createdAt: {
              type: 'string',
              format: 'date-time'
            }
          }
        }
      }
    },
    tags: [
      {
        name: 'Authentication',
        description: 'Endpoints para autenticação (login, logout, informações do usuário)'
      },
      {
        name: 'Users',
        description: 'Gerenciamento de usuários, administradores e barbeiros'
      },
      {
        name: 'Appointments',
        description: 'Sistema de agendamentos com controle de status e permissões'
      },
      {
        name: 'Financial',
        description: 'Relatórios de receita e controle de despesas'
      },
      {
        name: 'Loyalty',
        description: 'Sistema de fidelidade com vouchers de desconto'
      },
      {
        name: 'Configuration',
        description: 'Configurações de horários de funcionamento e disponibilidade'
      },
      {
        name: 'Super Admin',
        description: 'Logs do sistema e auditoria para super administradores'
      }
    ]
  },
  apis: [
    './server/routes/*.ts',
    './server/controllers/*.ts'
  ]
};

export const swaggerSpec = swaggerJsdoc(options);
