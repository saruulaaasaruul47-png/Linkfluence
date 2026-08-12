-- Concurrent funding is guarded by a SERIALIZABLE transaction plus idempotency key.
-- Remove the temporary partial index so failed/legacy provider attempts can coexist
-- without allowing a second successful wallet funding transaction.
DROP INDEX IF EXISTS "Payment_single_collaboration_funding_key";
