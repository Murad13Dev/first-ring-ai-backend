-- Update maxAgents for each plan based on maxPhoneLines
-- Starter: 1 agent (1 phone line)
-- Professional: 3 agents (3 phone lines)
-- Enterprise: 10 agents (10 phone lines)
-- Executive: 999 agents (unlimited)

UPDATE "Plan" SET "maxAgents" = 1 WHERE "slug" = 'starter';
UPDATE "Plan" SET "maxAgents" = 3 WHERE "slug" = 'professional';
UPDATE "Plan" SET "maxAgents" = 10 WHERE "slug" = 'enterprise';
UPDATE "Plan" SET "maxAgents" = 999 WHERE "slug" = 'executive';
