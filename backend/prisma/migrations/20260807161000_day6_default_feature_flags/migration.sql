INSERT INTO "FeatureFlag" ("id", "key", "name", "description", "enabled", "rolloutPercentage", "allowedRoles", "createdAt", "updatedAt")
VALUES
  ('day6_flag_creator_onboarding', 'creator_onboarding', 'Creator onboarding', 'Allows users to create creator channels.', true, 100, ARRAY['VIEWER']::"UserRole"[], CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('day6_flag_business_onboarding', 'business_onboarding', 'Business onboarding', 'Allows users to create business channels.', true, 100, ARRAY['VIEWER']::"UserRole"[], CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('day6_flag_campaign_publishing', 'campaign_publishing', 'Campaign publishing', 'Allows businesses to publish campaigns.', true, 100, ARRAY['BUSINESS']::"UserRole"[], CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('day6_flag_content_publishing', 'content_publishing', 'Content publishing', 'Allows creator and business channels to publish social content.', true, 100, ARRAY['CREATOR', 'BUSINESS']::"UserRole"[], CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO NOTHING;
