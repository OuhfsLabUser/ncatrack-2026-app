/*
  Warnings:

  - You are about to drop the column `language` on the `person` table. All the data in the column will be lost.
  - You are about to drop the column `sex_predator` on the `person` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "person" DROP COLUMN "language",
DROP COLUMN "sex_predator",
ADD COLUMN     "bio_custom_field_7" VARCHAR(256),
ADD COLUMN     "bio_custom_field_8" VARCHAR(256),
ADD COLUMN     "comments_for_people" VARCHAR(512),
ADD COLUMN     "csec" VARCHAR(512),
ADD COLUMN     "csec_involvement" VARCHAR(512),
ADD COLUMN     "custom_field" VARCHAR(512),
ADD COLUMN     "date_added" DATE,
ADD COLUMN     "developmental_age" VARCHAR(256),
ADD COLUMN     "ethnicity6" VARCHAR(256),
ADD COLUMN     "first_language" VARCHAR(256),
ADD COLUMN     "housing_insecurity_risk" VARCHAR(256),
ADD COLUMN     "material_involvement" VARCHAR(512),
ADD COLUMN     "pronouns" VARCHAR(20),
ADD COLUMN     "risk_factors" VARCHAR(512),
ADD COLUMN     "self_identified_gender" VARCHAR(30),
ADD COLUMN     "sexual_predator" BOOLEAN,
ADD COLUMN     "special_needs" VARCHAR(512),
ADD COLUMN     "special_populations" VARCHAR(512),
ADD COLUMN     "tribe" VARCHAR(256),
ADD COLUMN     "voca" VARCHAR(512),
ALTER COLUMN "gender" SET DATA TYPE VARCHAR(20);
