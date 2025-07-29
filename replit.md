# Barbershop API Documentation

## Overview

This is a comprehensive barbershop management system built as a RESTful API using Node.js, Express, and PostgreSQL. The system provides complete functionality for managing appointments, users, financial reports, loyalty programs, and administrative tasks in a barbershop environment.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Backend Architecture
- **Framework**: Express.js with TypeScript for type safety
- **Database**: PostgreSQL with Drizzle ORM for database operations
- **Authentication**: JWT-based authentication with role-based access control
- **API Documentation**: Swagger UI for interactive API documentation
- **Validation**: Zod schemas for request/response validation
- **Scheduling**: Node-cron for automated cleanup tasks

### Frontend Architecture
- **Framework**: React with TypeScript and Vite for development
- **UI Components**: Shadcn/ui component library with Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming
- **State Management**: TanStack Query for server state management
- **Purpose**: Minimal frontend that redirects to API documentation

## Key Components

### Authentication & Authorization
- JWT token-based authentication
- Four user roles: SUPER_ADMIN, ADMIN, BARBEIRO (barber), CLIENTE (client)
- Role-based middleware for endpoint protection
- Password hashing with bcrypt

### Database Schema
- **Users**: Core user information with roles
- **Barbeiros**: Extended barber profiles with specialties
- **Appointments**: Booking system with status tracking
- **Financial**: Expense tracking and revenue reporting
- **Loyalty**: Voucher system for client retention
- **System Logs**: Audit trail for all system actions
- **Business Config**: Configurable business hours and settings

### API Endpoints
- **Authentication**: Login, logout, user profile management
- **Users**: Registration, admin/barber creation, profile updates
- **Appointments**: Booking, status updates, scheduling
- **Financial**: Revenue reports, expense tracking
- **Loyalty**: Voucher configuration and redemption
- **Administration**: System logs, statistics, configuration

### Middleware
- Authentication token verification
- Role-based access control
- Request validation using Zod schemas
- Error handling and logging
- CORS and security headers

## Data Flow

1. **Client Registration**: Users register as clients through public endpoint
2. **Authentication**: Login returns JWT token for subsequent requests
3. **Authorization**: Each protected endpoint validates token and user role
4. **Business Logic**: Controllers handle business rules and data validation
5. **Database Operations**: Storage layer abstracts database interactions
6. **Audit Logging**: System actions are logged for compliance and debugging
7. **Scheduled Tasks**: Automated cleanup of expired appointments and voucher generation

## External Dependencies

### Database
- **Neon Database**: Serverless PostgreSQL provider
- **Drizzle ORM**: Type-safe database operations
- **Connection Pooling**: Efficient database connection management

### Authentication
- **JWT**: Stateless authentication tokens
- **bcrypt**: Secure password hashing

### Documentation
- **Swagger**: Interactive API documentation
- **OpenAPI 3.0**: API specification standard

### Development Tools
- **TypeScript**: Type safety across the stack
- **Vite**: Fast development server and build tool
- **ESLint/Prettier**: Code quality and formatting

## Deployment Strategy

### Build Process
- TypeScript compilation for type checking
- Vite builds optimized frontend assets
- ESBuild bundles server code for production
- Database migrations through Drizzle

### Environment Configuration
- Environment variables for database connection
- JWT secret configuration
- Port and host settings
- Logging level configuration

### Production Considerations
- Database connection pooling for scalability
- Error handling and logging for monitoring
- Scheduled tasks for maintenance
- Security headers and CORS configuration

### Monitoring & Maintenance
- System health check endpoint
- Comprehensive logging system
- Automated cleanup tasks
- Performance monitoring capabilities

## Key Features

- **Multi-role User Management**: Hierarchical permission system
- **Appointment Scheduling**: Complete booking workflow with status tracking
- **Financial Reporting**: Revenue analysis and expense tracking
- **Loyalty Program**: Configurable voucher system for customer retention
- **Audit Trail**: Comprehensive logging of all system actions
- **Business Configuration**: Flexible settings for operational hours
- **Automated Maintenance**: Scheduled cleanup of expired data
- **API Documentation**: Self-documenting endpoints with Swagger UI