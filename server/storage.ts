import { 
  users, 
  barbeiros, 
  appointments, 
  expenses, 
  vouchers, 
  voucherConfigs, 
  systemLogs, 
  businessConfig, 
  clientServiceCounts,
  type User, 
  type InsertUser,
  type Barbeiro,
  type InsertBarbeiro,
  type Appointment,
  type InsertAppointment,
  type Expense,
  type InsertExpense,
  type Voucher,
  type VoucherConfig,
  type InsertVoucherConfig,
  type SystemLog,
  type InsertSystemLog,
  type BusinessConfig,
  type InsertBusinessConfig,
  type ClientServiceCount
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, asc, gte, lte, count, sql } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<InsertUser>): Promise<User | undefined>;
  deleteUser(id: string): Promise<boolean>;
  listAdmins(): Promise<User[]>;

  // Barbeiros
  getBarbeiro(id: string): Promise<Barbeiro | undefined>;
  getBarbeiroByUserId(userId: string): Promise<Barbeiro | undefined>;
  createBarbeiro(barbeiro: InsertBarbeiro): Promise<Barbeiro>;
  listBarbeiros(): Promise<(Barbeiro & { user: User })[]>;
  updateBarbeiro(id: string, updates: Partial<InsertBarbeiro>): Promise<Barbeiro | undefined>;

  // Appointments
  getAppointment(id: string): Promise<Appointment | undefined>;
  createAppointment(appointment: InsertAppointment): Promise<Appointment>;
  updateAppointment(id: string, updates: Partial<InsertAppointment>): Promise<Appointment | undefined>;
  deleteAppointment(id: string): Promise<boolean>;
  getAppointmentsByClient(clientId: string): Promise<Appointment[]>;
  getAppointmentsByBarbeiro(barberId: string): Promise<Appointment[]>;
  getAllAppointments(): Promise<(Appointment & { client: User; barbeiro: Barbeiro & { user: User } })[]>;
  getPendingAppointments(): Promise<Appointment[]>;
  getAppointmentsByDateRange(startDate: string, endDate: string): Promise<Appointment[]>;
  getOldPendingAppointments(): Promise<Appointment[]>;

  // Expenses
  createExpense(expense: InsertExpense): Promise<Expense>;
  getExpenses(): Promise<Expense[]>;
  getExpensesByDateRange(startDate: string, endDate: string): Promise<Expense[]>;

  // Vouchers
  createVoucherConfig(config: InsertVoucherConfig): Promise<VoucherConfig>;
  getActiveVoucherConfig(): Promise<VoucherConfig | undefined>;
  updateVoucherConfig(id: string, updates: Partial<InsertVoucherConfig>): Promise<VoucherConfig | undefined>;
  createVoucher(voucher: Omit<Voucher, 'id' | 'createdAt'>): Promise<Voucher>;
  getUserVouchers(userId: string): Promise<Voucher[]>;
  getVoucherByCode(code: string): Promise<Voucher | undefined>;
  updateVoucher(id: string, updates: Partial<Voucher>): Promise<Voucher | undefined>;

  // Client service tracking
  getClientServiceCount(userId: string): Promise<ClientServiceCount | undefined>;
  updateClientServiceCount(userId: string, completedServices: number, totalSpent: string): Promise<ClientServiceCount>;

  // System logs
  createSystemLog(log: InsertSystemLog): Promise<SystemLog>;
  getSystemLogs(limit?: number): Promise<SystemLog[]>;

  // Business config
  getBusinessConfig(key: string): Promise<BusinessConfig | undefined>;
  setBusinessConfig(config: InsertBusinessConfig): Promise<BusinessConfig>;
  updateBusinessConfig(key: string, value: any, updatedBy: string): Promise<BusinessConfig | undefined>;

  // Revenue reports
  getRevenueByDateRange(startDate: string, endDate: string, barberId?: string): Promise<{ total: string; count: number }>;
}

export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [newUser] = await db.insert(users).values(user).returning();
    return newUser;
  }

  async updateUser(id: string, updates: Partial<InsertUser>): Promise<User | undefined> {
    const [updatedUser] = await db
      .update(users)
      .set({ ...updates, updatedAt: sql`now()` })
      .where(eq(users.id, id))
      .returning();
    return updatedUser || undefined;
  }

  async deleteUser(id: string): Promise<boolean> {
    const result = await db.delete(users).where(eq(users.id, id));
    return result.rowCount > 0;
  }

  async listAdmins(): Promise<User[]> {
    return await db.select().from(users).where(eq(users.role, 'ADMIN'));
  }

  // Barbeiros
  async getBarbeiro(id: string): Promise<Barbeiro | undefined> {
    const [barbeiro] = await db.select().from(barbeiros).where(eq(barbeiros.id, id));
    return barbeiro || undefined;
  }

  async getBarbeiroByUserId(userId: string): Promise<Barbeiro | undefined> {
    const [barbeiro] = await db.select().from(barbeiros).where(eq(barbeiros.userId, userId));
    return barbeiro || undefined;
  }

  async createBarbeiro(barbeiro: InsertBarbeiro): Promise<Barbeiro> {
    const [newBarbeiro] = await db.insert(barbeiros).values(barbeiro).returning();
    return newBarbeiro;
  }

  async listBarbeiros(): Promise<(Barbeiro & { user: User })[]> {
    return await db
      .select()
      .from(barbeiros)
      .innerJoin(users, eq(barbeiros.userId, users.id));
  }

  async updateBarbeiro(id: string, updates: Partial<InsertBarbeiro>): Promise<Barbeiro | undefined> {
    const [updatedBarbeiro] = await db
      .update(barbeiros)
      .set({ ...updates, updatedAt: sql`now()` })
      .where(eq(barbeiros.id, id))
      .returning();
    return updatedBarbeiro || undefined;
  }

  // Appointments
  async getAppointment(id: string): Promise<Appointment | undefined> {
    const [appointment] = await db.select().from(appointments).where(eq(appointments.id, id));
    return appointment || undefined;
  }

  async createAppointment(appointment: InsertAppointment): Promise<Appointment> {
    const [newAppointment] = await db.insert(appointments).values(appointment).returning();
    return newAppointment;
  }

  async updateAppointment(id: string, updates: Partial<InsertAppointment>): Promise<Appointment | undefined> {
    const [updatedAppointment] = await db
      .update(appointments)
      .set({ ...updates, updatedAt: sql`now()` })
      .where(eq(appointments.id, id))
      .returning();
    return updatedAppointment || undefined;
  }

  async deleteAppointment(id: string): Promise<boolean> {
    const result = await db.delete(appointments).where(eq(appointments.id, id));
    return result.rowCount > 0;
  }

  async getAppointmentsByClient(clientId: string): Promise<Appointment[]> {
    return await db
      .select()
      .from(appointments)
      .where(eq(appointments.clientId, clientId))
      .orderBy(desc(appointments.createdAt));
  }

  async getAppointmentsByBarbeiro(barberId: string): Promise<Appointment[]> {
    return await db
      .select()
      .from(appointments)
      .where(eq(appointments.barberId, barberId))
      .orderBy(desc(appointments.createdAt));
  }

  async getAllAppointments(): Promise<(Appointment & { client: User; barbeiro: Barbeiro & { user: User } })[]> {
    return await db
      .select()
      .from(appointments)
      .innerJoin(users, eq(appointments.clientId, users.id))
      .innerJoin(barbeiros, eq(appointments.barberId, barbeiros.id))
      .innerJoin(users, eq(barbeiros.userId, users.id))
      .orderBy(desc(appointments.createdAt));
  }

  async getPendingAppointments(): Promise<Appointment[]> {
    return await db
      .select()
      .from(appointments)
      .where(eq(appointments.status, 'SCHEDULED'))
      .orderBy(asc(appointments.appointmentDate), asc(appointments.appointmentTime));
  }

  async getAppointmentsByDateRange(startDate: string, endDate: string): Promise<Appointment[]> {
    return await db
      .select()
      .from(appointments)
      .where(
        and(
          gte(appointments.appointmentDate, startDate),
          lte(appointments.appointmentDate, endDate)
        )
      )
      .orderBy(asc(appointments.appointmentDate), asc(appointments.appointmentTime));
  }

  async getOldPendingAppointments(): Promise<Appointment[]> {
    const today = new Date().toISOString().split('T')[0];
    return await db
      .select()
      .from(appointments)
      .where(
        and(
          eq(appointments.status, 'SCHEDULED'),
          sql`${appointments.appointmentDate} < ${today}`
        )
      );
  }

  // Expenses
  async createExpense(expense: InsertExpense): Promise<Expense> {
    const [newExpense] = await db.insert(expenses).values(expense).returning();
    return newExpense;
  }

  async getExpenses(): Promise<Expense[]> {
    return await db.select().from(expenses).orderBy(desc(expenses.date));
  }

  async getExpensesByDateRange(startDate: string, endDate: string): Promise<Expense[]> {
    return await db
      .select()
      .from(expenses)
      .where(
        and(
          gte(expenses.date, startDate),
          lte(expenses.date, endDate)
        )
      )
      .orderBy(desc(expenses.date));
  }

  // Vouchers
  async createVoucherConfig(config: InsertVoucherConfig): Promise<VoucherConfig> {
    const [newConfig] = await db.insert(voucherConfigs).values(config).returning();
    return newConfig;
  }

  async getActiveVoucherConfig(): Promise<VoucherConfig | undefined> {
    const [config] = await db
      .select()
      .from(voucherConfigs)
      .where(eq(voucherConfigs.isActive, true))
      .orderBy(desc(voucherConfigs.createdAt))
      .limit(1);
    return config || undefined;
  }

  async updateVoucherConfig(id: string, updates: Partial<InsertVoucherConfig>): Promise<VoucherConfig | undefined> {
    const [updatedConfig] = await db
      .update(voucherConfigs)
      .set({ ...updates, updatedAt: sql`now()` })
      .where(eq(voucherConfigs.id, id))
      .returning();
    return updatedConfig || undefined;
  }

  async createVoucher(voucher: Omit<Voucher, 'id' | 'createdAt'>): Promise<Voucher> {
    const [newVoucher] = await db.insert(vouchers).values(voucher).returning();
    return newVoucher;
  }

  async getUserVouchers(userId: string): Promise<Voucher[]> {
    return await db
      .select()
      .from(vouchers)
      .where(eq(vouchers.userId, userId))
      .orderBy(desc(vouchers.createdAt));
  }

  async getVoucherByCode(code: string): Promise<Voucher | undefined> {
    const [voucher] = await db.select().from(vouchers).where(eq(vouchers.code, code));
    return voucher || undefined;
  }

  async updateVoucher(id: string, updates: Partial<Voucher>): Promise<Voucher | undefined> {
    const [updatedVoucher] = await db
      .update(vouchers)
      .set(updates)
      .where(eq(vouchers.id, id))
      .returning();
    return updatedVoucher || undefined;
  }

  // Client service tracking
  async getClientServiceCount(userId: string): Promise<ClientServiceCount | undefined> {
    const [serviceCount] = await db
      .select()
      .from(clientServiceCounts)
      .where(eq(clientServiceCounts.userId, userId));
    return serviceCount || undefined;
  }

  async updateClientServiceCount(userId: string, completedServices: number, totalSpent: string): Promise<ClientServiceCount> {
    const existing = await this.getClientServiceCount(userId);
    
    if (existing) {
      const [updated] = await db
        .update(clientServiceCounts)
        .set({
          completedServices,
          totalSpent,
          lastServiceDate: sql`now()`,
          updatedAt: sql`now()`
        })
        .where(eq(clientServiceCounts.userId, userId))
        .returning();
      return updated;
    } else {
      const [newRecord] = await db
        .insert(clientServiceCounts)
        .values({
          userId,
          completedServices,
          totalSpent,
          lastServiceDate: sql`now()`
        })
        .returning();
      return newRecord;
    }
  }

  // System logs
  async createSystemLog(log: InsertSystemLog): Promise<SystemLog> {
    const [newLog] = await db.insert(systemLogs).values(log).returning();
    return newLog;
  }

  async getSystemLogs(limit: number = 100): Promise<SystemLog[]> {
    return await db
      .select()
      .from(systemLogs)
      .orderBy(desc(systemLogs.createdAt))
      .limit(limit);
  }

  // Business config
  async getBusinessConfig(key: string): Promise<BusinessConfig | undefined> {
    const [config] = await db
      .select()
      .from(businessConfig)
      .where(eq(businessConfig.key, key));
    return config || undefined;
  }

  async setBusinessConfig(config: InsertBusinessConfig): Promise<BusinessConfig> {
    const existing = await this.getBusinessConfig(config.key);
    
    if (existing) {
      const [updated] = await db
        .update(businessConfig)
        .set({
          value: config.value,
          description: config.description,
          updatedBy: config.updatedBy,
          updatedAt: sql`now()`
        })
        .where(eq(businessConfig.key, config.key))
        .returning();
      return updated;
    } else {
      const [newConfig] = await db.insert(businessConfig).values(config).returning();
      return newConfig;
    }
  }

  async updateBusinessConfig(key: string, value: any, updatedBy: string): Promise<BusinessConfig | undefined> {
    const [updated] = await db
      .update(businessConfig)
      .set({
        value,
        updatedBy,
        updatedAt: sql`now()`
      })
      .where(eq(businessConfig.key, key))
      .returning();
    return updated || undefined;
  }

  // Revenue reports
  async getRevenueByDateRange(startDate: string, endDate: string, barberId?: string): Promise<{ total: string; count: number }> {
    let query = db
      .select({
        total: sql<string>`COALESCE(SUM(${appointments.price}), 0)`,
        count: count()
      })
      .from(appointments)
      .where(
        and(
          eq(appointments.status, 'COMPLETED'),
          gte(appointments.appointmentDate, startDate),
          lte(appointments.appointmentDate, endDate),
          barberId ? eq(appointments.barberId, barberId) : undefined
        )
      );

    const [result] = await query;
    return result || { total: '0', count: 0 };
  }
}

export const storage = new DatabaseStorage();
