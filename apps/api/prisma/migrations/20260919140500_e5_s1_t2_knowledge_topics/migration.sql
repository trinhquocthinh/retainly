-- CreateTable
CREATE TABLE "knowledge_topics" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "knowledge_topics_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "cards" ADD COLUMN "topic_id" UUID;

-- CreateIndex
CREATE UNIQUE INDEX "knowledge_topics_user_id_name_key"
ON "knowledge_topics"("user_id", "name");

-- CreateIndex
CREATE INDEX "cards_topic_id_idx" ON "cards"("topic_id");

-- AddForeignKey
ALTER TABLE "knowledge_topics"
ADD CONSTRAINT "knowledge_topics_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cards"
ADD CONSTRAINT "cards_topic_id_fkey"
FOREIGN KEY ("topic_id") REFERENCES "knowledge_topics"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
