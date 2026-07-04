// Append-only audit helper. Always call inside the same transaction as the mutation
// it records so the change and its log entry commit atomically (plan §16).
// `client` is a Prisma client or transaction client.
async function recordHistory(client, { agreementId, actor, eventType, payload }) {
  await client.historyLog.create({
    data: {
      agreementId,
      actorId: actor.id,
      actorRole: actor.role,
      eventType,
      payload: payload || undefined,
    },
  });
  // Touch the agreement's last-updated timestamp on every logged change.
  await client.agreement.update({
    where: { id: agreementId },
    data: { lastUpdatedAt: new Date() },
  });
}

module.exports = { recordHistory };
