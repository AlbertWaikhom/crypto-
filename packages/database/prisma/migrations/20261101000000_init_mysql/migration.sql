-- CreateTable
CREATE TABLE `users` (
    `id` CHAR(36) NOT NULL,
    `public_uid` VARCHAR(32) NOT NULL,
    `name` VARCHAR(120) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(32) NULL,
    `password_hash` VARCHAR(255) NULL,
    `google_id` VARCHAR(191) NULL,
    `avatar_url` VARCHAR(512) NULL,
    `role` ENUM('USER', 'ADMIN', 'SUPER_ADMIN', 'MASTER_ADMIN') NOT NULL DEFAULT 'USER',
    `status` ENUM('ACTIVE', 'SUSPENDED', 'PENDING_VERIFICATION') NOT NULL DEFAULT 'ACTIVE',
    `email_verified` BOOLEAN NOT NULL DEFAULT false,
    `email_verified_at` DATETIME(3) NULL,
    `failed_login_count` INTEGER NOT NULL DEFAULT 0,
    `locked_until` DATETIME(3) NULL,
    `two_factor_enabled` BOOLEAN NOT NULL DEFAULT false,
    `two_factor_secret_enc` VARCHAR(255) NULL,
    `last_login_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `users_public_uid_key`(`public_uid`),
    UNIQUE INDEX `users_email_key`(`email`),
    UNIQUE INDEX `users_google_id_key`(`google_id`),
    INDEX `users_role_status_idx`(`role`, `status`),
    INDEX `users_created_at_idx`(`created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_sessions` (
    `id` CHAR(36) NOT NULL,
    `user_id` CHAR(36) NOT NULL,
    `refresh_token_hash` VARCHAR(128) NOT NULL,
    `family_id` CHAR(36) NOT NULL,
    `ip_address` VARCHAR(64) NULL,
    `user_agent` VARCHAR(512) NULL,
    `expires_at` DATETIME(3) NOT NULL,
    `revoked_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `user_sessions_refresh_token_hash_key`(`refresh_token_hash`),
    INDEX `user_sessions_user_id_revoked_at_idx`(`user_id`, `revoked_at`),
    INDEX `user_sessions_family_id_idx`(`family_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `auth_tokens` (
    `id` CHAR(36) NOT NULL,
    `user_id` CHAR(36) NOT NULL,
    `token_type` VARCHAR(32) NOT NULL,
    `token_hash` VARCHAR(128) NOT NULL,
    `expires_at` DATETIME(3) NOT NULL,
    `used_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `auth_tokens_token_hash_key`(`token_hash`),
    INDEX `auth_tokens_user_id_token_type_idx`(`user_id`, `token_type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `compliance_profiles` (
    `id` CHAR(36) NOT NULL,
    `user_id` CHAR(36) NOT NULL,
    `kyc_status` ENUM('NOT_SUBMITTED', 'PENDING_REVIEW', 'VERIFIED', 'REJECTED') NOT NULL DEFAULT 'NOT_SUBMITTED',
    `country` VARCHAR(80) NULL,
    `tax_residency` VARCHAR(80) NULL,
    `tax_id_masked` VARCHAR(40) NULL,
    `terms_accepted_at` DATETIME(3) NULL,
    `privacy_accepted_at` DATETIME(3) NULL,
    `risk_disclosure_accepted_at` DATETIME(3) NULL,
    `investment_agreement_accepted_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `compliance_profiles_user_id_key`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `wallets` (
    `id` CHAR(36) NOT NULL,
    `user_id` CHAR(36) NOT NULL,
    `asset` VARCHAR(16) NOT NULL DEFAULT 'USDT',
    `available_balance` DECIMAL(24, 8) NOT NULL DEFAULT 0,
    `locked_balance` DECIMAL(24, 8) NOT NULL DEFAULT 0,
    `invested_balance` DECIMAL(24, 8) NOT NULL DEFAULT 0,
    `pending_withdrawal` DECIMAL(24, 8) NOT NULL DEFAULT 0,
    `version` INTEGER NOT NULL DEFAULT 1,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `wallets_user_id_asset_key`(`user_id`, `asset`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ledger_entries` (
    `id` CHAR(36) NOT NULL,
    `ledger_uid` VARCHAR(40) NOT NULL,
    `user_id` CHAR(36) NOT NULL,
    `wallet_id` CHAR(36) NOT NULL,
    `transaction_type` ENUM('DEPOSIT', 'INTEREST', 'WITHDRAWAL', 'WITHDRAWAL_REVERSAL', 'ADJUSTMENT', 'FEE', 'REFUND') NOT NULL,
    `direction` ENUM('CREDIT', 'DEBIT') NOT NULL,
    `asset` VARCHAR(16) NOT NULL DEFAULT 'USDT',
    `amount` DECIMAL(24, 8) NOT NULL,
    `balance_before` DECIMAL(24, 8) NOT NULL,
    `balance_after` DECIMAL(24, 8) NOT NULL,
    `reference_type` VARCHAR(40) NOT NULL,
    `reference_id` VARCHAR(64) NOT NULL,
    `idempotency_key` VARCHAR(128) NOT NULL,
    `description` VARCHAR(500) NOT NULL,
    `created_by_id` CHAR(36) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `ledger_entries_ledger_uid_key`(`ledger_uid`),
    UNIQUE INDEX `ledger_entries_idempotency_key_key`(`idempotency_key`),
    INDEX `ledger_entries_user_id_created_at_idx`(`user_id`, `created_at`),
    INDEX `ledger_entries_reference_type_reference_id_idx`(`reference_type`, `reference_id`),
    INDEX `ledger_entries_transaction_type_created_at_idx`(`transaction_type`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `deposits` (
    `id` CHAR(36) NOT NULL,
    `deposit_uid` VARCHAR(40) NOT NULL,
    `user_id` CHAR(36) NOT NULL,
    `requested_amount` DECIMAL(24, 8) NOT NULL,
    `verified_amount` DECIMAL(24, 8) NULL,
    `token` VARCHAR(16) NOT NULL DEFAULT 'USDT',
    `network` VARCHAR(32) NOT NULL DEFAULT 'BNB_SMART_CHAIN',
    `receiving_address` VARCHAR(64) NOT NULL,
    `plan_code` VARCHAR(64) NULL,
    `status` ENUM('PENDING_PAYMENT', 'PAYMENT_SUBMITTED', 'BLOCKCHAIN_DETECTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'EXPIRED', 'CANCELLED') NOT NULL DEFAULT 'PENDING_PAYMENT',
    `fiat_amount` DECIMAL(24, 8) NULL,
    `fiat_currency` VARCHAR(8) NULL,
    `tax_amount` DECIMAL(24, 8) NULL,
    `tax_currency` VARCHAR(8) NULL,
    `crypto_amount` DECIMAL(24, 8) NULL,
    `crypto_currency` VARCHAR(16) NULL,
    `exchange_rate` DECIMAL(24, 8) NULL,
    `rate_timestamp` DATETIME(3) NULL,
    `submitted_at` DATETIME(3) NULL,
    `review_deadline` DATETIME(3) NULL,
    `reviewed_at` DATETIME(3) NULL,
    `reviewed_by_id` CHAR(36) NULL,
    `rejection_reason` VARCHAR(500) NULL,
    `expires_at` DATETIME(3) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `deposits_deposit_uid_key`(`deposit_uid`),
    INDEX `deposits_user_id_status_idx`(`user_id`, `status`),
    INDEX `deposits_status_created_at_idx`(`status`, `created_at`),
    INDEX `deposits_review_deadline_idx`(`review_deadline`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `payment_submissions` (
    `id` CHAR(36) NOT NULL,
    `deposit_id` CHAR(36) NOT NULL,
    `user_id` CHAR(36) NOT NULL,
    `transaction_hash` VARCHAR(80) NOT NULL,
    `screenshot_storage_key` VARCHAR(255) NULL,
    `screenshot_mime_type` VARCHAR(64) NULL,
    `screenshot_size_bytes` INTEGER NULL,
    `notes` VARCHAR(500) NULL,
    `submitted_ip` VARCHAR(64) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `payment_submissions_deposit_id_key`(`deposit_id`),
    UNIQUE INDEX `payment_submissions_transaction_hash_key`(`transaction_hash`),
    INDEX `payment_submissions_user_id_idx`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `blockchain_transactions` (
    `id` CHAR(36) NOT NULL,
    `transaction_hash` VARCHAR(80) NOT NULL,
    `deposit_id` CHAR(36) NULL,
    `withdrawal_id` CHAR(36) NULL,
    `direction` VARCHAR(16) NOT NULL DEFAULT 'INBOUND',
    `verification_mode` VARCHAR(16) NOT NULL DEFAULT 'MOCK',
    `network` VARCHAR(32) NOT NULL DEFAULT 'BNB_SMART_CHAIN',
    `chain_id` INTEGER NOT NULL DEFAULT 56,
    `block_number` BIGINT NULL,
    `block_timestamp` DATETIME(3) NULL,
    `from_address` VARCHAR(64) NULL,
    `to_address` VARCHAR(64) NULL,
    `token_contract` VARCHAR(64) NULL,
    `token_amount` DECIMAL(24, 8) NULL,
    `confirmation_count` INTEGER NOT NULL DEFAULT 0,
    `tx_succeeded` BOOLEAN NOT NULL DEFAULT false,
    `is_valid` BOOLEAN NOT NULL DEFAULT false,
    `failure_code` VARCHAR(64) NULL,
    `failure_reason` VARCHAR(500) NULL,
    `verified_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `blockchain_transactions_transaction_hash_key`(`transaction_hash`),
    UNIQUE INDEX `blockchain_transactions_deposit_id_key`(`deposit_id`),
    UNIQUE INDEX `blockchain_transactions_withdrawal_id_key`(`withdrawal_id`),
    INDEX `blockchain_transactions_to_address_idx`(`to_address`),
    INDEX `blockchain_transactions_from_address_idx`(`from_address`),
    INDEX `blockchain_transactions_is_valid_created_at_idx`(`is_valid`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `investment_plans` (
    `id` CHAR(36) NOT NULL,
    `code` VARCHAR(64) NOT NULL,
    `name` VARCHAR(120) NOT NULL,
    `description` VARCHAR(500) NULL,
    `interest_model` ENUM('FIXED_AMOUNT', 'PERCENTAGE', 'DAILY', 'WEEKLY', 'MONTHLY', 'MATURITY') NOT NULL,
    `interest_rate` DECIMAL(12, 4) NOT NULL,
    `calculation_frequency` VARCHAR(32) NOT NULL,
    `duration_days` INTEGER NOT NULL,
    `min_amount` DECIMAL(24, 8) NOT NULL,
    `max_amount` DECIMAL(24, 8) NOT NULL,
    `start_date` DATETIME(3) NULL,
    `end_date` DATETIME(3) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `investment_plans_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `investments` (
    `id` CHAR(36) NOT NULL,
    `investment_uid` VARCHAR(40) NOT NULL,
    `user_id` CHAR(36) NOT NULL,
    `deposit_id` CHAR(36) NOT NULL,
    `plan_id` CHAR(36) NULL,
    `principal_amount` DECIMAL(24, 8) NOT NULL,
    `asset` VARCHAR(16) NOT NULL DEFAULT 'USDT',
    `start_date` DATETIME(3) NOT NULL,
    `maturity_date` DATETIME(3) NOT NULL,
    `interest_model` ENUM('FIXED_AMOUNT', 'PERCENTAGE', 'DAILY', 'WEEKLY', 'MONTHLY', 'MATURITY') NOT NULL,
    `interest_rate` DECIMAL(12, 4) NOT NULL,
    `interest_amount` DECIMAL(24, 8) NOT NULL DEFAULT 0,
    `status` ENUM('ACTIVE', 'MATURED', 'COMPLETED', 'PAUSED', 'CANCELLED') NOT NULL DEFAULT 'ACTIVE',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `investments_investment_uid_key`(`investment_uid`),
    UNIQUE INDEX `investments_deposit_id_key`(`deposit_id`),
    INDEX `investments_user_id_status_idx`(`user_id`, `status`),
    INDEX `investments_maturity_date_idx`(`maturity_date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `interest_records` (
    `id` CHAR(36) NOT NULL,
    `interest_uid` VARCHAR(40) NOT NULL,
    `investment_id` CHAR(36) NOT NULL,
    `user_id` CHAR(36) NOT NULL,
    `period_key` VARCHAR(64) NOT NULL,
    `calculation_model` ENUM('FIXED_AMOUNT', 'PERCENTAGE', 'DAILY', 'WEEKLY', 'MONTHLY', 'MATURITY') NOT NULL,
    `rate_applied` DECIMAL(12, 4) NOT NULL,
    `principal_snapshot` DECIMAL(24, 8) NOT NULL,
    `amount` DECIMAL(24, 8) NOT NULL,
    `ledger_entry_id` CHAR(36) NULL,
    `status` VARCHAR(24) NOT NULL DEFAULT 'CREDITED',
    `description` VARCHAR(300) NULL,
    `created_by_id` CHAR(36) NULL,
    `credited_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `interest_records_interest_uid_key`(`interest_uid`),
    UNIQUE INDEX `interest_records_ledger_entry_id_key`(`ledger_entry_id`),
    INDEX `interest_records_user_id_credited_at_idx`(`user_id`, `credited_at`),
    UNIQUE INDEX `interest_records_investment_id_period_key_key`(`investment_id`, `period_key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `withdrawals` (
    `id` CHAR(36) NOT NULL,
    `withdrawal_uid` VARCHAR(40) NOT NULL,
    `user_id` CHAR(36) NOT NULL,
    `amount` DECIMAL(24, 8) NOT NULL,
    `fee_amount` DECIMAL(24, 8) NOT NULL DEFAULT 0,
    `net_amount` DECIMAL(24, 8) NOT NULL,
    `asset` VARCHAR(16) NOT NULL DEFAULT 'USDT',
    `network` VARCHAR(32) NOT NULL DEFAULT 'BNB_SMART_CHAIN',
    `destination_address` VARCHAR(64) NOT NULL,
    `transaction_hash` VARCHAR(80) NULL,
    `admin_id` CHAR(36) NULL,
    `status` ENUM('PENDING_REVIEW', 'APPROVED', 'PROCESSING', 'COMPLETED', 'REJECTED', 'FAILED') NOT NULL DEFAULT 'PENDING_REVIEW',
    `rejection_reason` VARCHAR(500) NULL,
    `reviewed_at` DATETIME(3) NULL,
    `completed_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `withdrawals_withdrawal_uid_key`(`withdrawal_uid`),
    UNIQUE INDEX `withdrawals_transaction_hash_key`(`transaction_hash`),
    INDEX `withdrawals_user_id_status_idx`(`user_id`, `status`),
    INDEX `withdrawals_status_created_at_idx`(`status`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `notifications` (
    `id` CHAR(36) NOT NULL,
    `user_id` CHAR(36) NOT NULL,
    `event_type` VARCHAR(64) NOT NULL,
    `channel` ENUM('IN_APP', 'EMAIL', 'SMS', 'PUSH') NOT NULL DEFAULT 'IN_APP',
    `title` VARCHAR(160) NOT NULL,
    `message` VARCHAR(1000) NOT NULL,
    `metadata` JSON NULL,
    `is_read` BOOLEAN NOT NULL DEFAULT false,
    `read_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `notifications_user_id_is_read_created_at_idx`(`user_id`, `is_read`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `audit_logs` (
    `id` CHAR(36) NOT NULL,
    `admin_id` CHAR(36) NULL,
    `actor_role` VARCHAR(32) NULL,
    `action` VARCHAR(64) NOT NULL,
    `target_type` VARCHAR(64) NOT NULL,
    `target_id` VARCHAR(64) NOT NULL,
    `old_value` JSON NULL,
    `new_value` JSON NULL,
    `ip_address` VARCHAR(64) NULL,
    `user_agent` VARCHAR(512) NULL,
    `request_id` VARCHAR(64) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `audit_logs_admin_id_created_at_idx`(`admin_id`, `created_at`),
    INDEX `audit_logs_action_created_at_idx`(`action`, `created_at`),
    INDEX `audit_logs_target_type_target_id_idx`(`target_type`, `target_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `system_settings` (
    `id` CHAR(36) NOT NULL,
    `key` VARCHAR(100) NOT NULL,
    `value` TEXT NOT NULL,
    `category` VARCHAR(48) NOT NULL DEFAULT 'GENERAL',
    `is_public` BOOLEAN NOT NULL DEFAULT false,
    `description` VARCHAR(500) NULL,
    `updated_by_id` CHAR(36) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `system_settings_key_key`(`key`),
    INDEX `system_settings_category_idx`(`category`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `uid_sequences` (
    `prefix` VARCHAR(32) NOT NULL,
    `last_value` INTEGER NOT NULL DEFAULT 0,
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`prefix`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `idempotency_records` (
    `key` VARCHAR(160) NOT NULL,
    `user_id` CHAR(36) NULL,
    `route` VARCHAR(191) NOT NULL,
    `status_code` INTEGER NOT NULL,
    `response_body` JSON NOT NULL,
    `expires_at` DATETIME(3) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idempotency_records_expires_at_idx`(`expires_at`),
    PRIMARY KEY (`key`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `user_sessions` ADD CONSTRAINT `user_sessions_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `auth_tokens` ADD CONSTRAINT `auth_tokens_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `compliance_profiles` ADD CONSTRAINT `compliance_profiles_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `wallets` ADD CONSTRAINT `wallets_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ledger_entries` ADD CONSTRAINT `ledger_entries_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ledger_entries` ADD CONSTRAINT `ledger_entries_wallet_id_fkey` FOREIGN KEY (`wallet_id`) REFERENCES `wallets`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `deposits` ADD CONSTRAINT `deposits_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `deposits` ADD CONSTRAINT `deposits_reviewed_by_id_fkey` FOREIGN KEY (`reviewed_by_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payment_submissions` ADD CONSTRAINT `payment_submissions_deposit_id_fkey` FOREIGN KEY (`deposit_id`) REFERENCES `deposits`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payment_submissions` ADD CONSTRAINT `payment_submissions_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `blockchain_transactions` ADD CONSTRAINT `blockchain_transactions_deposit_id_fkey` FOREIGN KEY (`deposit_id`) REFERENCES `deposits`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `blockchain_transactions` ADD CONSTRAINT `blockchain_transactions_withdrawal_id_fkey` FOREIGN KEY (`withdrawal_id`) REFERENCES `withdrawals`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `investments` ADD CONSTRAINT `investments_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `investments` ADD CONSTRAINT `investments_deposit_id_fkey` FOREIGN KEY (`deposit_id`) REFERENCES `deposits`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `investments` ADD CONSTRAINT `investments_plan_id_fkey` FOREIGN KEY (`plan_id`) REFERENCES `investment_plans`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `interest_records` ADD CONSTRAINT `interest_records_investment_id_fkey` FOREIGN KEY (`investment_id`) REFERENCES `investments`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `interest_records` ADD CONSTRAINT `interest_records_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `interest_records` ADD CONSTRAINT `interest_records_ledger_entry_id_fkey` FOREIGN KEY (`ledger_entry_id`) REFERENCES `ledger_entries`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `withdrawals` ADD CONSTRAINT `withdrawals_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `withdrawals` ADD CONSTRAINT `withdrawals_admin_id_fkey` FOREIGN KEY (`admin_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_admin_id_fkey` FOREIGN KEY (`admin_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

