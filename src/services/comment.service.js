const prisma = require('../config/prisma');
const ApiError = require('../lib/ApiError');

async function addComment(actor, clauseId, { body }) {
  const clause = await prisma.clause.findUnique({ where: { id: clauseId } });
  if (!clause) throw ApiError.notFound('Clause not found');
  return prisma.clauseComment.create({
    data: { clauseId, authorId: actor.id, body },
    include: { author: { select: { id: true, name: true, role: true } } },
  });
}

async function resolveComment(actor, commentId) {
  const comment = await prisma.clauseComment.findUnique({ where: { id: commentId } });
  if (!comment) throw ApiError.notFound('Comment not found');
  return prisma.clauseComment.update({
    where: { id: commentId },
    data: { isResolved: true, resolvedById: actor.id },
    include: { author: { select: { id: true, name: true, role: true } } },
  });
}

module.exports = { addComment, resolveComment };
