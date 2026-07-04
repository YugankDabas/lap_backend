-- CreateEnum
CREATE TYPE "Role" AS ENUM ('LEGAL', 'FINANCE', 'BUSINESS', 'COMPLIANCE');

-- CreateEnum
CREATE TYPE "Team" AS ENUM ('LEGAL', 'FINANCE', 'BUSINESS', 'COMPLIANCE');

-- CreateEnum
CREATE TYPE "AgreementType" AS ENUM ('API_DIRECT', 'WHITE_LABEL', 'RESELLER', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "TeamStatusValue" AS ENUM ('PENDING', 'UNDER_REVIEW', 'APPROVED');

-- CreateEnum
CREATE TYPE "ClauseOutcome" AS ENUM ('PENDING', 'ACCEPTED', 'HELD', 'PARTIAL');

-- CreateEnum
CREATE TYPE "HistoryEventType" AS ENUM ('STATUS_CHANGE', 'REMARK_ADDED', 'REMINDER_SENT', 'SIGN_OFF', 'VERSION_ADDED', 'CLAUSE_OUTCOME_CHANGED', 'AGREEMENT_CREATED', 'AGREEMENT_UPDATED', 'COMPLIANCE_QUERY_RAISED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agreements" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "client_name" TEXT NOT NULL,
    "type" "AgreementType" NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "last_updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_demo" BOOLEAN NOT NULL DEFAULT false,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agreements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agreement_spocs" (
    "id" TEXT NOT NULL,
    "agreement_id" TEXT NOT NULL,
    "team" "Team" NOT NULL,
    "user_id" TEXT NOT NULL,

    CONSTRAINT "agreement_spocs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_statuses" (
    "id" TEXT NOT NULL,
    "agreement_id" TEXT NOT NULL,
    "team" "Team" NOT NULL,
    "status" "TeamStatusValue" NOT NULL DEFAULT 'PENDING',
    "my_status_note" TEXT,
    "updated_by" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "team_statuses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_versions" (
    "id" TEXT NOT NULL,
    "agreement_id" TEXT NOT NULL,
    "version_label" TEXT NOT NULL,
    "version_number" INTEGER NOT NULL,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clauses" (
    "id" TEXT NOT NULL,
    "version_id" TEXT NOT NULL,
    "clause_key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body_text" TEXT NOT NULL,
    "outcome" "ClauseOutcome" NOT NULL DEFAULT 'PENDING',
    "order_index" INTEGER NOT NULL,

    CONSTRAINT "clauses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clause_comments" (
    "id" TEXT NOT NULL,
    "clause_id" TEXT NOT NULL,
    "author_id" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "is_resolved" BOOLEAN NOT NULL DEFAULT false,
    "resolved_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clause_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "remarks" (
    "id" TEXT NOT NULL,
    "agreement_id" TEXT NOT NULL,
    "author_id" TEXT NOT NULL,
    "author_role" "Role" NOT NULL,
    "body" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "remarks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "history_log" (
    "id" TEXT NOT NULL,
    "agreement_id" TEXT NOT NULL,
    "actor_id" TEXT NOT NULL,
    "actor_role" "Role" NOT NULL,
    "event_type" "HistoryEventType" NOT NULL,
    "payload" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "history_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reminders" (
    "id" TEXT NOT NULL,
    "agreement_id" TEXT NOT NULL,
    "sender_id" TEXT NOT NULL,
    "target_team" "Team" NOT NULL,
    "message" TEXT NOT NULL,
    "acknowledged_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reminders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "signoffs" (
    "id" TEXT NOT NULL,
    "agreement_id" TEXT NOT NULL,
    "signatory_id" TEXT NOT NULL,
    "signatory_name" TEXT NOT NULL,
    "signatory_role" "Role" NOT NULL,
    "disclaimer_version" TEXT NOT NULL,
    "signed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "signoffs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compliance_queries" (
    "id" TEXT NOT NULL,
    "agreement_id" TEXT NOT NULL,
    "raised_by" TEXT NOT NULL,
    "raised_by_name" TEXT NOT NULL,
    "query_text" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "compliance_queries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "agreement_spocs_agreement_id_team_key" ON "agreement_spocs"("agreement_id", "team");

-- CreateIndex
CREATE UNIQUE INDEX "team_statuses_agreement_id_team_key" ON "team_statuses"("agreement_id", "team");

-- CreateIndex
CREATE UNIQUE INDEX "document_versions_agreement_id_version_number_key" ON "document_versions"("agreement_id", "version_number");

-- CreateIndex
CREATE UNIQUE INDEX "signoffs_agreement_id_signatory_role_key" ON "signoffs"("agreement_id", "signatory_role");

-- AddForeignKey
ALTER TABLE "agreements" ADD CONSTRAINT "agreements_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agreement_spocs" ADD CONSTRAINT "agreement_spocs_agreement_id_fkey" FOREIGN KEY ("agreement_id") REFERENCES "agreements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agreement_spocs" ADD CONSTRAINT "agreement_spocs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_statuses" ADD CONSTRAINT "team_statuses_agreement_id_fkey" FOREIGN KEY ("agreement_id") REFERENCES "agreements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_statuses" ADD CONSTRAINT "team_statuses_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_versions" ADD CONSTRAINT "document_versions_agreement_id_fkey" FOREIGN KEY ("agreement_id") REFERENCES "agreements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_versions" ADD CONSTRAINT "document_versions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clauses" ADD CONSTRAINT "clauses_version_id_fkey" FOREIGN KEY ("version_id") REFERENCES "document_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clause_comments" ADD CONSTRAINT "clause_comments_clause_id_fkey" FOREIGN KEY ("clause_id") REFERENCES "clauses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clause_comments" ADD CONSTRAINT "clause_comments_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clause_comments" ADD CONSTRAINT "clause_comments_resolved_by_fkey" FOREIGN KEY ("resolved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "remarks" ADD CONSTRAINT "remarks_agreement_id_fkey" FOREIGN KEY ("agreement_id") REFERENCES "agreements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "remarks" ADD CONSTRAINT "remarks_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "history_log" ADD CONSTRAINT "history_log_agreement_id_fkey" FOREIGN KEY ("agreement_id") REFERENCES "agreements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "history_log" ADD CONSTRAINT "history_log_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reminders" ADD CONSTRAINT "reminders_agreement_id_fkey" FOREIGN KEY ("agreement_id") REFERENCES "agreements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reminders" ADD CONSTRAINT "reminders_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "signoffs" ADD CONSTRAINT "signoffs_agreement_id_fkey" FOREIGN KEY ("agreement_id") REFERENCES "agreements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "signoffs" ADD CONSTRAINT "signoffs_signatory_id_fkey" FOREIGN KEY ("signatory_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compliance_queries" ADD CONSTRAINT "compliance_queries_agreement_id_fkey" FOREIGN KEY ("agreement_id") REFERENCES "agreements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compliance_queries" ADD CONSTRAINT "compliance_queries_raised_by_fkey" FOREIGN KEY ("raised_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
