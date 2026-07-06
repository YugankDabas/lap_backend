-- Add REJECTED to the TeamStatusValue enum (BRD FR-2 four-state review circle).
ALTER TYPE "TeamStatusValue" ADD VALUE IF NOT EXISTS 'REJECTED';
