/*
  Warnings:

  - You are about to drop the column `ethnicity6` on the `person` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "person" DROP COLUMN "ethnicity6",
ADD COLUMN     "ethnicity_6" VARCHAR(256);
