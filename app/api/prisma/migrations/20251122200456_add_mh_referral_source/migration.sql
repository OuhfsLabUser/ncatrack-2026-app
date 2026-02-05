/*
  Warnings:

  - You are about to drop the column `victim_status_id` on the `case_person` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "cac_case" ADD COLUMN     "mh_referral_source" VARCHAR(50);

-- AlterTable
ALTER TABLE "case_person" DROP COLUMN "victim_status_id",
ADD COLUMN     "case_person_custom_field_6" TEXT,
ADD COLUMN     "case_person_custom_field_7" TEXT,
ADD COLUMN     "case_person_custom_field_8" TEXT,
ADD COLUMN     "case_person_custom_field_9" TEXT,
ADD COLUMN     "community_5" TEXT,
ADD COLUMN     "county" VARCHAR(20),
ADD COLUMN     "csf_eligible_2" BOOLEAN,
ADD COLUMN     "custom_field_1" TEXT,
ADD COLUMN     "custom_field_4" TEXT,
ADD COLUMN     "end_date" DATE,
ADD COLUMN     "family_transport_assistance_3" BOOLEAN,
ADD COLUMN     "mili_connection" BOOLEAN,
ADD COLUMN     "mili_connection_name" TEXT,
ADD COLUMN     "mili_dependent_relationship" TEXT,
ADD COLUMN     "mili_type_id" TEXT,
ADD COLUMN     "out_of_country" BOOLEAN,
ADD COLUMN     "problematic_sex" BOOLEAN,
ADD COLUMN     "region" VARCHAR(20),
ADD COLUMN     "start_date" DATE,
ADD COLUMN     "victim_status" VARCHAR(20),
ALTER COLUMN "state_abbr" SET DATA TYPE VARCHAR(20),
ALTER COLUMN "education_level_id" SET DATA TYPE TEXT,
ALTER COLUMN "income_level_id" SET DATA TYPE TEXT,
ALTER COLUMN "marital_status_id" SET DATA TYPE TEXT;
