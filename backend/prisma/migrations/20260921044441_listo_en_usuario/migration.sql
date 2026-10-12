-- AlterTable
ALTER TABLE "pedidos" ADD COLUMN     "listo_en" TIMESTAMP(3),
ADD COLUMN     "usuario_id" INTEGER;

-- AddForeignKey
ALTER TABLE "pedidos" ADD CONSTRAINT "pedidos_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
