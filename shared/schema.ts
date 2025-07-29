import { sql, relations } from "drizzle-orm";
import { 
  pgTable, 
  varchar, 
  text, 
  timestamp, 
  boolean, 
  decimal, 
  integer,
  jsonb,
  pgEnum
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

// Enums
export const userRoleEnum = pgEnum('user_role', ['SUPER_ADMIN', 'ADMIN', 'BARBEIRO', 'CLIENTE']);
export const appointmentStatusEnum = pgEnum('appointment_status', ['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']);
export const voucherStatusEnum = pgEnum('voucher_status', ['ACTIVE', 'USED', 'EXPIRED']);
export const logActionEnum = pgEnum('log_action', ['LOGIN', 'LOGOUT', 'CREATE', 'UPDATE', 'DELETE', 'APPOINTMENT_CREATE', 'APPOINTMENT_UPDATE', 'VOUCHER_REDEEM']);

// Users table
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  phone: text("phone"),
  role: userRoleEnum("role").notNull().default('CLIENTE'),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`)
});

// Barbeiros table (extends user info for barbers)
export const barbeiros = pgTable("barbeiros", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  specialty: text("specialty"),
  experience: integer("experience"), // years of experience
  isAvailable: boolean("is_available").notNull().default(true),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`)
});

// Appointments table
export const appointments = pgTable("appointments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  barberId: varchar("barber_id").notNull().references(() => barbeiros.id, { onDelete: 'cascade' }),
  serviceType: text("service_type").notNull(),
  appointmentDate: text("appointment_date").notNull(), // YYYY-MM-DD format
  appointmentTime: text("appointment_time").notNull(), // HH:MM format
  status: appointmentStatusEnum("status").notNull().default('SCHEDULED'),
  notes: text("notes"),
  price: decimal("price", { precision: 10, scale: 2 }),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`)
});

// Expenses table
export const expenses = pgTable("expenses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  description: text("description").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  category: text("category").notNull(),
  date: text("date").notNull(), // YYYY-MM-DD format
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").notNull().default(sql`now()`)
});

// Voucher configurations
export const voucherConfigs = pgTable("voucher_configs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  servicesRequired: integer("services_required").notNull(),
  discountPercentage: integer("discount_percentage").notNull(),
  validityDays: integer("validity_days").notNull(),
  description: text("description").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`)
});

// User vouchers
export const vouchers = pgTable("vouchers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  configId: varchar("config_id").notNull().references(() => voucherConfigs.id),
  code: text("code").notNull().unique(),
  status: voucherStatusEnum("status").notNull().default('ACTIVE'),
  expiryDate: timestamp("expiry_date").notNull(),
  usedAt: timestamp("used_at"),
  usedAppointmentId: varchar("used_appointment_id").references(() => appointments.id),
  createdAt: timestamp("created_at").notNull().default(sql`now()`)
});

// System logs
export const systemLogs = pgTable("system_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  action: logActionEnum("action").notNull(),
  userId: varchar("user_id").references(() => users.id),
  resourceId: varchar("resource_id"), // ID of the affected resource
  resourceType: text("resource_type"), // Type of resource (user, appointment, etc.)
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  details: jsonb("details"), // Additional details about the action
  createdAt: timestamp("created_at").notNull().default(sql`now()`)
});

// Business configuration
export const businessConfig = pgTable("business_config", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  key: text("key").notNull().unique(),
  value: jsonb("value").notNull(),
  description: text("description"),
  updatedBy: varchar("updated_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`)
});

// Client service count for loyalty tracking
export const clientServiceCounts = pgTable("client_service_counts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  completedServices: integer("completed_services").notNull().default(0),
  totalSpent: decimal("total_spent", { precision: 10, scale: 2 }).notNull().default('0'),
  lastServiceDate: timestamp("last_service_date"),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`)
});

// Relations
export const usersRelations = relations(users, ({ many, one }) => ({
  barbeiro: one(barbeiros, {
    fields: [users.id],
    references: [barbeiros.userId]
  }),
  clientAppointments: many(appointments, { relationName: "clientAppointments" }),
  vouchers: many(vouchers),
  logs: many(systemLogs),
  expenses: many(expenses),
  serviceCount: one(clientServiceCounts, {
    fields: [users.id],
    references: [clientServiceCounts.userId]
  })
}));

export const barbeirosRelations = relations(barbeiros, ({ one, many }) => ({
  user: one(users, {
    fields: [barbeiros.userId],
    references: [users.id]
  }),
  appointments: many(appointments)
}));

export const appointmentsRelations = relations(appointments, ({ one }) => ({
  client: one(users, {
    fields: [appointments.clientId],
    references: [users.id],
    relationName: "clientAppointments"
  }),
  barbeiro: one(barbeiros, {
    fields: [appointments.barberId],
    references: [barbeiros.id]
  }),
  voucherUsed: one(vouchers, {
    fields: [appointments.id],
    references: [vouchers.usedAppointmentId]
  })
}));

export const vouchersRelations = relations(vouchers, ({ one }) => ({
  user: one(users, {
    fields: [vouchers.userId],
    references: [users.id]
  }),
  config: one(voucherConfigs, {
    fields: [vouchers.configId],
    references: [voucherConfigs.id]
  }),
  usedAppointment: one(appointments, {
    fields: [vouchers.usedAppointmentId],
    references: [appointments.id]
  })
}));

export const voucherConfigsRelations = relations(voucherConfigs, ({ many }) => ({
  vouchers: many(vouchers)
}));

export const expensesRelations = relations(expenses, ({ one }) => ({
  createdByUser: one(users, {
    fields: [expenses.createdBy],
    references: [users.id]
  })
}));

export const systemLogsRelations = relations(systemLogs, ({ one }) => ({
  user: one(users, {
    fields: [systemLogs.userId],
    references: [users.id]
  })
}));

export const businessConfigRelations = relations(businessConfig, ({ one }) => ({
  updatedByUser: one(users, {
    fields: [businessConfig.updatedBy],
    references: [users.id]
  })
}));

export const clientServiceCountsRelations = relations(clientServiceCounts, ({ one }) => ({
  user: one(users, {
    fields: [clientServiceCounts.userId],
    references: [users.id]
  })
}));

// Schemas for validation
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertBarbeiroSchema = createInsertSchema(barbeiros).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertAppointmentSchema = createInsertSchema(appointments).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertExpenseSchema = createInsertSchema(expenses).omit({
  id: true,
  createdAt: true
});

export const insertVoucherConfigSchema = createInsertSchema(voucherConfigs).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertSystemLogSchema = createInsertSchema(systemLogs).omit({
  id: true,
  createdAt: true
});

export const insertBusinessConfigSchema = createInsertSchema(businessConfig).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Barbeiro = typeof barbeiros.$inferSelect;
export type InsertBarbeiro = z.infer<typeof insertBarbeiroSchema>;
export type Appointment = typeof appointments.$inferSelect;
export type InsertAppointment = z.infer<typeof insertAppointmentSchema>;
export type Expense = typeof expenses.$inferSelect;
export type InsertExpense = z.infer<typeof insertExpenseSchema>;
export type VoucherConfig = typeof voucherConfigs.$inferSelect;
export type InsertVoucherConfig = z.infer<typeof insertVoucherConfigSchema>;
export type Voucher = typeof vouchers.$inferSelect;
export type SystemLog = typeof systemLogs.$inferSelect;
export type InsertSystemLog = z.infer<typeof insertSystemLogSchema>;
export type BusinessConfig = typeof businessConfig.$inferSelect;
export type InsertBusinessConfig = z.infer<typeof insertBusinessConfigSchema>;
export type ClientServiceCount = typeof clientServiceCounts.$inferSelect;

// Additional validation schemas
export const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres")
});

export const registerClientSchema = insertUserSchema.extend({
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
  confirmPassword: z.string()
}).refine(data => data.password === data.confirmPassword, {
  message: "Senhas não coincidem",
  path: ["confirmPassword"]
});

export const createAppointmentSchema = insertAppointmentSchema.extend({
  appointmentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data deve estar no formato YYYY-MM-DD"),
  appointmentTime: z.string().regex(/^\d{2}:\d{2}$/, "Hora deve estar no formato HH:MM")
});

export const updateAppointmentSchema = z.object({
  status: z.enum(['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional(),
  notes: z.string().optional(),
  price: z.string().optional()
});

export const businessHoursSchema = z.object({
  monday: z.object({ start: z.string(), end: z.string() }).nullable(),
  tuesday: z.object({ start: z.string(), end: z.string() }).nullable(),
  wednesday: z.object({ start: z.string(), end: z.string() }).nullable(),
  thursday: z.object({ start: z.string(), end: z.string() }).nullable(),
  friday: z.object({ start: z.string(), end: z.string() }).nullable(),
  saturday: z.object({ start: z.string(), end: z.string() }).nullable(),
  sunday: z.object({ start: z.string(), end: z.string() }).nullable()
});

export type LoginData = z.infer<typeof loginSchema>;
export type RegisterClientData = z.infer<typeof registerClientSchema>;
export type CreateAppointmentData = z.infer<typeof createAppointmentSchema>;
export type UpdateAppointmentData = z.infer<typeof updateAppointmentSchema>;
export type BusinessHours = z.infer<typeof businessHoursSchema>;
