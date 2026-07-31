export const auditEvent = (type, message, actorId = null, metadata = undefined) => ({
  actorId,
  type,
  message,
  ...(metadata !== undefined && { metadata }),
});

export const outboxEvent = (topic, aggregateId, payload) => ({
  topic,
  aggregateId,
  payload,
});
