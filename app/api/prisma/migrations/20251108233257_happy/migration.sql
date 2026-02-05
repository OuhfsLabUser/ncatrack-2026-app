/*
  Warnings:

  - You are about to drop the column `va_consent_expires_date` on the `cac_case` table. All the data in the column will be lost.
  - You are about to drop the column `va_custom_field_2` on the `cac_case` table. All the data in the column will be lost.
  - You are about to drop the column `va_custom_field_3` on the `cac_case` table. All the data in the column will be lost.
  - You are about to drop the column `va_custom_field_4` on the `cac_case` table. All the data in the column will be lost.
  - You are about to drop the column `va_custom_field_5` on the `cac_case` table. All the data in the column will be lost.
  - You are about to drop the column `va_custom_field_7` on the `cac_case` table. All the data in the column will be lost.
  - You are about to drop the column `va_field_6` on the `cac_case` table. All the data in the column will be lost.
  - You are about to drop the column `va_hope1` on the `cac_case` table. All the data in the column will be lost.
  - You are about to drop the column `va_person_id` on the `cac_case` table. All the data in the column will be lost.
  - You are about to drop the column `va_referral_person_id` on the `cac_case` table. All the data in the column will be lost.
  - You are about to drop the column `va_referral_source` on the `cac_case` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "cac_case" DROP CONSTRAINT "cac_case_va_person_id_fkey";

-- DropForeignKey
ALTER TABLE "cac_case" DROP CONSTRAINT "cac_case_va_referral_person_id_fkey";

-- AlterTable
ALTER TABLE "cac_case" DROP COLUMN "va_consent_expires_date",
DROP COLUMN "va_custom_field_2",
DROP COLUMN "va_custom_field_3",
DROP COLUMN "va_custom_field_4",
DROP COLUMN "va_custom_field_5",
DROP COLUMN "va_custom_field_7",
DROP COLUMN "va_field_6",
DROP COLUMN "va_hope1",
DROP COLUMN "va_person_id",
DROP COLUMN "va_referral_person_id",
DROP COLUMN "va_referral_source";

-- AlterTable
ALTER TABLE "case_person" ADD COLUMN     "email_address" VARCHAR(200);
