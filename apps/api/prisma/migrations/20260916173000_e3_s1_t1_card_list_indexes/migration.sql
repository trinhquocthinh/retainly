-- CreateIndex
CREATE INDEX "cards_user_id_created_at_id_idx"
ON "cards"("user_id", "created_at", "id");

-- CreateIndex
CREATE INDEX "cards_user_id_source_id_created_at_id_idx"
ON "cards"("user_id", "source_id", "created_at", "id");