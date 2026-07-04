const { z } = require('zod');
const { ROLES } = require('../constants');

const registerSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(120),
  email: z.string().trim().toLowerCase().email('Valid email required'),
  password: z.string().min(6, 'Password must be at least 6 characters').max(128),
  role: z.enum([ROLES.LEGAL, ROLES.FINANCE, ROLES.BUSINESS, ROLES.COMPLIANCE]),
});

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Valid email required'),
  password: z.string().min(1, 'Password is required'),
});

module.exports = { registerSchema, loginSchema };
