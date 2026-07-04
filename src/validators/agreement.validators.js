const { z } = require('zod');
const {
  AGREEMENT_TYPES,
  TEAM_STATUS,
  CLAUSE_OUTCOME,
  TEAMS,
} = require('../constants');

const typeEnum = z.enum(Object.values(AGREEMENT_TYPES));
const teamStatusEnum = z.enum(Object.values(TEAM_STATUS));
const clauseOutcomeEnum = z.enum(Object.values(CLAUSE_OUTCOME));
const teamEnum = z.enum(Object.values(TEAMS));

const createAgreementSchema = z.object({
  title: z.string().trim().min(1).max(200),
  clientName: z.string().trim().min(1).max(200),
  type: typeEnum,
  startDate: z.coerce.date(),
  isDemo: z.boolean().optional(),
  spocs: z
    .array(z.object({ team: teamEnum, userId: z.string().uuid() }))
    .optional(),
});

const updateAgreementSchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    clientName: z.string().trim().min(1).max(200).optional(),
    type: typeEnum.optional(),
    startDate: z.coerce.date().optional(),
    isDemo: z.boolean().optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: 'No fields to update' });

const setStatusSchema = z
  .object({
    status: teamStatusEnum.optional(),
    myStatusNote: z.string().max(2000).optional(),
  })
  .refine((d) => d.status !== undefined || d.myStatusNote !== undefined, {
    message: 'Provide a status and/or a note',
  });

const remarkSchema = z.object({ body: z.string().trim().min(1).max(4000) });

const createVersionSchema = z.object({
  versionLabel: z.string().trim().max(20).optional(),
  clauses: z
    .array(
      z.object({
        clauseKey: z.string().trim().min(1).max(80).optional(),
        title: z.string().trim().min(1).max(200),
        bodyText: z.string().min(1),
        orderIndex: z.number().int().optional(),
      })
    )
    .optional(),
});

const updateClauseSchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    bodyText: z.string().min(1).optional(),
    outcome: clauseOutcomeEnum.optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: 'No fields to update' });

const addClauseSchema = z.object({
  title: z.string().trim().min(1).max(200),
  bodyText: z.string().min(1),
  clauseKey: z.string().trim().min(1).max(80).optional(),
  outcome: clauseOutcomeEnum.optional(),
});

const commentSchema = z.object({ body: z.string().trim().min(1).max(2000) });

const reminderSchema = z.object({
  targetTeam: teamEnum,
  message: z.string().trim().min(1).max(1000),
});

const complianceQuerySchema = z.object({
  queryText: z.string().trim().min(1).max(4000),
});

module.exports = {
  createAgreementSchema,
  updateAgreementSchema,
  setStatusSchema,
  remarkSchema,
  createVersionSchema,
  updateClauseSchema,
  addClauseSchema,
  commentSchema,
  reminderSchema,
  complianceQuerySchema,
};
