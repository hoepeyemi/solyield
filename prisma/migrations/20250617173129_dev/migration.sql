-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "wallet_address" TEXT NOT NULL,
    "username" TEXT,
    "email" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_login" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_preferences" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "telegram_chat_id" TEXT,
    "telegram_username" TEXT,
    "risk_tolerance" TEXT NOT NULL DEFAULT 'medium',
    "preferred_chains" TEXT[],
    "preferred_tokens" TEXT[],
    "notifications_enabled" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "user_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "yield_opportunities" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "protocol" TEXT NOT NULL,
    "apy" DECIMAL(6,2) NOT NULL,
    "base_apy" DECIMAL(6,2) NOT NULL,
    "reward_apy" DECIMAL(6,2) NOT NULL,
    "risk_level" TEXT NOT NULL,
    "tvl" DECIMAL(20,2) NOT NULL,
    "asset_type" TEXT NOT NULL,
    "token_pair" TEXT[],
    "deposit_fee" DECIMAL(6,2) NOT NULL DEFAULT 0,
    "withdrawal_fee" DECIMAL(6,2) NOT NULL DEFAULT 0,
    "last_updated" TIMESTAMP(3) NOT NULL,
    "link" TEXT,

    CONSTRAINT "yield_opportunities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_portfolios" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "opportunity_id" INTEGER NOT NULL,
    "amount" DECIMAL(20,2) NOT NULL,
    "deposit_date" TIMESTAMP(3) NOT NULL,
    "token" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "user_portfolios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "opportunity_id" INTEGER NOT NULL,
    "transaction_type" TEXT NOT NULL,
    "amount" DECIMAL(20,2) NOT NULL,
    "token" TEXT NOT NULL,
    "transaction_date" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL,
    "transaction_hash" TEXT,
    "details" JSONB,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "solana_subscriptions" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "subscription_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "transaction_hash" TEXT,
    "amount" DECIMAL(20,9) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USDC',
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "solana_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_wallet_address_key" ON "users"("wallet_address");

-- CreateIndex
CREATE UNIQUE INDEX "user_preferences_user_id_key" ON "user_preferences"("user_id");

-- AddForeignKey
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_portfolios" ADD CONSTRAINT "user_portfolios_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_portfolios" ADD CONSTRAINT "user_portfolios_opportunity_id_fkey" FOREIGN KEY ("opportunity_id") REFERENCES "yield_opportunities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_opportunity_id_fkey" FOREIGN KEY ("opportunity_id") REFERENCES "yield_opportunities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solana_subscriptions" ADD CONSTRAINT "solana_subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
