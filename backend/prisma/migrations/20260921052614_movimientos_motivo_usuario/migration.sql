/*
  Warnings:

  - Added the required column `motivo` to the `movimientos_insumo` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "movimientos_insumo" ADD COLUMN     "motivo" VARCHAR(30) NOT NULL,
ADD COLUMN     "nota" VARCHAR(300),
ADD COLUMN     "usuario_id" INTEGER;

-- AddForeignKey
ALTER TABLE "movimientos_insumo" ADD CONSTRAINT "movimientos_insumo_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
