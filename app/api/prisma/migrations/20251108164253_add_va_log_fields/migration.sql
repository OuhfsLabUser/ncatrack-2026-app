/*
  Warnings:

  - You are about to drop the column `sexual_predator` on the `person` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "cac_case" ADD COLUMN     "va_consent_expires_date" DATE,
ADD COLUMN     "va_custom_field_2" VARCHAR(255),
ADD COLUMN     "va_custom_field_3" VARCHAR(255),
ADD COLUMN     "va_custom_field_4" VARCHAR(255),
ADD COLUMN     "va_custom_field_5" VARCHAR(255),
ADD COLUMN     "va_custom_field_7" VARCHAR(255),
ADD COLUMN     "va_field_6" VARCHAR(50),
ADD COLUMN     "va_hope1" VARCHAR(255),
ADD COLUMN     "va_person_id" INTEGER,
ADD COLUMN     "va_referral_person_id" INTEGER,
ADD COLUMN     "va_referral_source" VARCHAR(255);

-- AlterTable
ALTER TABLE "person" DROP COLUMN "sexual_predator",
ADD COLUMN     "sex_predator" BOOLEAN;

-- AddForeignKey
ALTER TABLE "cac_case" ADD CONSTRAINT "cac_case_va_referral_person_id_fkey" FOREIGN KEY ("va_referral_person_id") REFERENCES "person"("person_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "cac_case" ADD CONSTRAINT "cac_case_va_person_id_fkey" FOREIGN KEY ("va_person_id") REFERENCES "person"("person_id") ON DELETE NO ACTION ON UPDATE NO ACTION;
