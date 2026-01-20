-- AlterTable
ALTER TABLE "tenants" ADD COLUMN "customAgentName" TEXT,
ADD COLUMN "customAgentPrompt" TEXT,
ADD COLUMN "agentVoiceGender" TEXT,
ADD COLUMN "agentVoiceId" TEXT,
ADD COLUMN "agentTemperature" DOUBLE PRECISION,
ADD COLUMN "enabledTools" JSONB;

-- Add comments for clarity
COMMENT ON COLUMN "tenants"."customAgentName" IS 'Custom name for AI agent (default: "{tenantName} AI Agent")';
COMMENT ON COLUMN "tenants"."customAgentPrompt" IS 'Custom system prompt (overrides default business type prompt)';
COMMENT ON COLUMN "tenants"."agentVoiceGender" IS 'Voice gender preference: "male" or "female"';
COMMENT ON COLUMN "tenants"."agentVoiceId" IS 'Specific Retell voice ID (e.g., "11labs-Adrian", "11labs-Emily")';
COMMENT ON COLUMN "tenants"."agentTemperature" IS 'LLM temperature 0.0-1.0 (controls creativity/randomness, default: 0.7)';
COMMENT ON COLUMN "tenants"."enabledTools" IS 'Array of enabled tool names: ["booking", "ordering", "faq", "check_availability"]';
