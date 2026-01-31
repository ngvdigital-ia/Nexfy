import {
  pgTable,
  text,
  varchar,
  integer,
  boolean,
  timestamp,
  decimal,
  jsonb,
  uniqueIndex,
  index,
  serial,
  pgEnum,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ─── Enums ───────────────────────────────────────────────
export const userRoleEnum = pgEnum("user_role", ["admin", "producer", "customer"]);
export const transactionStatusEnum = pgEnum("transaction_status", [
  "pending", "approved", "refused", "refunded", "chargeback", "cancelled", "expired",
]);
export const paymentMethodEnum = pgEnum("payment_method", [
  "pix", "credit_card", "boleto",
]);
export const couponTypeEnum = pgEnum("coupon_type", ["percentage", "fixed"]);
export const refundStatusEnum = pgEnum("refund_status", ["pending", "approved", "refused"]);

// ─── Users ───────────────────────────────────────────────
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  password: text("password").notNull(),
  role: userRoleEnum("role").notNull().default("customer"),
  phone: varchar("phone", { length: 20 }),
  cpfCnpj: varchar("cpf_cnpj", { length: 18 }),
  avatar: text("avatar"),
  emailVerifiedAt: timestamp("email_verified_at"),
  loginAttempts: integer("login_attempts").default(0),
  lockedUntil: timestamp("locked_until"),
  rememberToken: text("remember_token"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── Products ────────────────────────────────────────────
export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).default("BRL"),
  type: varchar("type", { length: 50 }).default("digital"),
  hash: varchar("hash", { length: 64 }).notNull().unique(),
  checkoutTitle: text("checkout_title"),
  checkoutDescription: text("checkout_description"),
  checkoutImage: text("checkout_image"),
  checkoutBgColor: varchar("checkout_bg_color", { length: 7 }),
  checkoutButtonColor: varchar("checkout_button_color", { length: 7 }),
  checkoutButtonText: varchar("checkout_button_text", { length: 100 }),
  deliveryType: varchar("delivery_type", { length: 50 }),
  deliveryUrl: text("delivery_url"),
  deliveryEmail: text("delivery_email"),
  thankYouPageUrl: text("thank_you_page_url"),
  gateway: varchar("gateway", { length: 50 }),
  gatewayCredentials: jsonb("gateway_credentials"),
  pixEnabled: boolean("pix_enabled").default(true),
  cardEnabled: boolean("card_enabled").default(true),
  boletoEnabled: boolean("boleto_enabled").default(false),
  maxInstallments: integer("max_installments").default(12),
  facebookPixelId: varchar("facebook_pixel_id", { length: 100 }),
  facebookAccessToken: text("facebook_access_token"),
  googleAnalyticsId: varchar("google_analytics_id", { length: 100 }),
  starfyEnabled: boolean("starfy_enabled").default(false),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── Product Offers ──────────────────────────────────────
export const productOffers = pgTable("product_offers", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull().references(() => products.id),
  name: varchar("name", { length: 255 }).notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  hash: varchar("hash", { length: 64 }).notNull().unique(),
  isDefault: boolean("is_default").default(false),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Order Bumps ─────────────────────────────────────────
export const orderBumps = pgTable("order_bumps", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull().references(() => products.id),
  bumpProductId: integer("bump_product_id").notNull().references(() => products.id),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  imageUrl: varchar("image_url", { length: 500 }),
  originalPrice: decimal("original_price", { precision: 10, scale: 2 }),
  socialProof: varchar("social_proof", { length: 255 }),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Coupons ─────────────────────────────────────────────
export const coupons = pgTable("coupons", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  productId: integer("product_id").references(() => products.id),
  code: varchar("code", { length: 50 }).notNull(),
  type: couponTypeEnum("type").notNull(),
  value: decimal("value", { precision: 10, scale: 2 }).notNull(),
  maxUses: integer("max_uses"),
  currentUses: integer("current_uses").default(0),
  validFrom: timestamp("valid_from"),
  validUntil: timestamp("valid_until"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Transactions ────────────────────────────────────────
export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  productId: integer("product_id").notNull().references(() => products.id),
  offerId: integer("offer_id").references(() => productOffers.id),
  couponId: integer("coupon_id").references(() => coupons.id),
  gateway: varchar("gateway", { length: 50 }).notNull(),
  gatewayPaymentId: varchar("gateway_payment_id", { length: 255 }),
  paymentMethod: paymentMethodEnum("payment_method").notNull(),
  status: transactionStatusEnum("status").notNull().default("pending"),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  discount: decimal("discount", { precision: 10, scale: 2 }).default("0"),
  netAmount: decimal("net_amount", { precision: 10, scale: 2 }),
  currency: varchar("currency", { length: 3 }).default("BRL"),
  customerName: varchar("customer_name", { length: 255 }),
  customerEmail: varchar("customer_email", { length: 255 }),
  customerPhone: varchar("customer_phone", { length: 20 }),
  customerCpf: varchar("customer_cpf", { length: 14 }),
  pixCode: text("pix_code"),
  pixQrCode: text("pix_qr_code"),
  boletoUrl: text("boleto_url"),
  boletoBarcode: text("boleto_barcode"),
  cardLastFour: varchar("card_last_four", { length: 4 }),
  cardBrand: varchar("card_brand", { length: 20 }),
  installments: integer("installments").default(1),
  stripeCustomerId: varchar("stripe_customer_id", { length: 255 }),
  stripePaymentMethodId: varchar("stripe_payment_method_id", { length: 255 }),
  parentTransactionId: integer("parent_transaction_id"),
  metadata: jsonb("metadata"),
  utmSource: varchar("utm_source", { length: 255 }),
  utmMedium: varchar("utm_medium", { length: 255 }),
  utmCampaign: varchar("utm_campaign", { length: 255 }),
  utmContent: varchar("utm_content", { length: 255 }),
  utmTerm: varchar("utm_term", { length: 255 }),
  paidAt: timestamp("paid_at"),
  refundedAt: timestamp("refunded_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  gatewayPaymentIdx: uniqueIndex("transactions_gateway_payment_idx").on(table.gateway, table.gatewayPaymentId),
  statusIdx: index("transactions_status_idx").on(table.status),
  userIdx: index("transactions_user_idx").on(table.userId),
  productIdx: index("transactions_product_idx").on(table.productId),
}));

// ─── Upsells ────────────────────────────────────────────
export const upsells = pgTable("upsells", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull().references(() => products.id),
  upsellProductId: integer("upsell_product_id").notNull().references(() => products.id),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  imageUrl: text("image_url"),
  videoUrl: text("video_url"),
  originalPrice: decimal("original_price", { precision: 10, scale: 2 }),
  ctaText: varchar("cta_text", { length: 255 }).default("SIM, EU QUERO!"),
  declineText: varchar("decline_text", { length: 255 }).default("Não, obrigado"),
  isActive: boolean("is_active").default(true),
  sortOrder: integer("sort_order").default(0),
  isExternal: boolean("is_external").default(false),
  externalUrl: text("external_url"),
  acceptRedirectUrl: text("accept_redirect_url"),
  declineRedirectUrl: text("decline_redirect_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const upsellTokens = pgTable("upsell_tokens", {
  id: serial("id").primaryKey(),
  token: varchar("token", { length: 64 }).unique().notNull(),
  transactionId: integer("transaction_id").notNull().references(() => transactions.id),
  upsellId: integer("upsell_id").notNull().references(() => upsells.id),
  status: varchar("status", { length: 20 }).default("pending"),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const upsellPurchases = pgTable("upsell_purchases", {
  id: serial("id").primaryKey(),
  transactionId: integer("transaction_id").notNull().references(() => transactions.id),
  upsellId: integer("upsell_id").notNull().references(() => upsells.id),
  upsellTransactionId: integer("upsell_transaction_id").notNull().references(() => transactions.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Entitlements ────────────────────────────────────────
export const entitlements = pgTable("entitlements", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  productId: integer("product_id").notNull().references(() => products.id),
  transactionId: integer("transaction_id").notNull().references(() => transactions.id),
  isActive: boolean("is_active").default(true),
  grantedAt: timestamp("granted_at").defaultNow().notNull(),
  revokedAt: timestamp("revoked_at"),
});

// ─── Refunds ─────────────────────────────────────────────
export const refunds = pgTable("refunds", {
  id: serial("id").primaryKey(),
  transactionId: integer("transaction_id").notNull().references(() => transactions.id),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  reason: text("reason"),
  status: refundStatusEnum("status").notNull().default("pending"),
  gatewayRefundId: varchar("gateway_refund_id", { length: 255 }),
  processedAt: timestamp("processed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Cart Recovery ───────────────────────────────────────
export const cartRecovery = pgTable("cart_recovery", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull().references(() => products.id),
  email: varchar("email", { length: 255 }),
  name: varchar("name", { length: 255 }),
  phone: varchar("phone", { length: 20 }),
  data: jsonb("data"),
  emailSent: boolean("email_sent").default(false),
  recovered: boolean("recovered").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Webhook Logs ────────────────────────────────────────
export const webhookLogs = pgTable("webhook_logs", {
  id: serial("id").primaryKey(),
  gateway: varchar("gateway", { length: 50 }).notNull(),
  eventType: varchar("event_type", { length: 100 }),
  payload: jsonb("payload").notNull(),
  headers: jsonb("headers"),
  statusCode: integer("status_code"),
  response: text("response"),
  processedAt: timestamp("processed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Notifications ───────────────────────────────────────
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  type: varchar("type", { length: 50 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message"),
  readAt: timestamp("read_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Courses (Area de Membros) ───────────────────────────
export const courses = pgTable("courses", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull().references(() => products.id),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  thumbnail: text("thumbnail"),
  sortOrder: integer("sort_order").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const modules = pgTable("modules", {
  id: serial("id").primaryKey(),
  courseId: integer("course_id").notNull().references(() => courses.id),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  sortOrder: integer("sort_order").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const lessons = pgTable("lessons", {
  id: serial("id").primaryKey(),
  moduleId: integer("module_id").notNull().references(() => modules.id),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  videoUrl: text("video_url"),
  content: text("content"),
  duration: integer("duration"),
  sortOrder: integer("sort_order").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const lessonFiles = pgTable("lesson_files", {
  id: serial("id").primaryKey(),
  lessonId: integer("lesson_id").notNull().references(() => lessons.id),
  name: varchar("name", { length: 255 }).notNull(),
  url: text("url").notNull(),
  size: integer("size"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const studentProgress = pgTable("student_progress", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  lessonId: integer("lesson_id").notNull().references(() => lessons.id),
  completed: boolean("completed").default(false),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  userLessonIdx: uniqueIndex("student_progress_user_lesson_idx").on(table.userId, table.lessonId),
}));

// ─── SaaS Tables ─────────────────────────────────────────
export const saasConfig = pgTable("saas_config", {
  id: serial("id").primaryKey(),
  key: varchar("key", { length: 100 }).notNull().unique(),
  value: text("value"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const saasPlans = pgTable("saas_plans", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  maxProducts: integer("max_products"),
  maxTransactions: integer("max_transactions"),
  features: jsonb("features"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const saasSubscriptions = pgTable("saas_subscriptions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  planId: integer("plan_id").notNull().references(() => saasPlans.id),
  status: varchar("status", { length: 20 }).default("active"),
  startsAt: timestamp("starts_at").notNull(),
  endsAt: timestamp("ends_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const saasMonthlyCounters = pgTable("saas_monthly_counters", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  month: varchar("month", { length: 7 }).notNull(), // YYYY-MM
  transactionCount: integer("transaction_count").default(0),
  revenue: decimal("revenue", { precision: 10, scale: 2 }).default("0"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  userMonthIdx: uniqueIndex("saas_counters_user_month_idx").on(table.userId, table.month),
}));

// ─── Integration Tables ──────────────────────────────────
export const webhooks = pgTable("webhooks", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  productId: integer("product_id").references(() => products.id),
  url: text("url").notNull(),
  events: jsonb("events"),
  secret: varchar("secret", { length: 64 }),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const utmfyIntegrations = pgTable("utmfy_integrations", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  apiToken: text("api_token").notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const starfyTrackingProducts = pgTable("starfy_tracking_products", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull().references(() => products.id),
  trackingId: varchar("tracking_id", { length: 100 }).notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const emailQueue = pgTable("email_queue", {
  id: serial("id").primaryKey(),
  to: varchar("to", { length: 255 }).notNull(),
  subject: varchar("subject", { length: 255 }).notNull(),
  body: text("body").notNull(),
  status: varchar("status", { length: 20 }).default("pending"),
  attempts: integer("attempts").default(0),
  sentAt: timestamp("sent_at"),
  error: text("error"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Relations ───────────────────────────────────────────
export const usersRelations = relations(users, ({ many }) => ({
  products: many(products),
  transactions: many(transactions),
  entitlements: many(entitlements),
  notifications: many(notifications),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  user: one(users, { fields: [products.userId], references: [users.id] }),
  offers: many(productOffers),
  orderBumps: many(orderBumps),
  upsells: many(upsells),
  transactions: many(transactions),
  courses: many(courses),
}));

export const upsellsRelations = relations(upsells, ({ one }) => ({
  product: one(products, { fields: [upsells.productId], references: [products.id] }),
  upsellProduct: one(products, { fields: [upsells.upsellProductId], references: [products.id] }),
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
  user: one(users, { fields: [transactions.userId], references: [users.id] }),
  product: one(products, { fields: [transactions.productId], references: [products.id] }),
  offer: one(productOffers, { fields: [transactions.offerId], references: [productOffers.id] }),
  coupon: one(coupons, { fields: [transactions.couponId], references: [coupons.id] }),
}));
