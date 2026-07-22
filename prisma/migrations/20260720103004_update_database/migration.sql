-- CreateIndex
CREATE INDEX "PasswordResetToken_tokenHash_used_idx" ON "PasswordResetToken"("tokenHash", "used");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "Session_sessionId_revoked_idx" ON "Session"("sessionId", "revoked");
