-- CreateTable
CREATE TABLE "servicio_insumos" (
    "servicio_id" INTEGER NOT NULL,
    "insumo_id" INTEGER NOT NULL,
    "cantidad" DECIMAL(8,3) NOT NULL,

    CONSTRAINT "servicio_insumos_pkey" PRIMARY KEY ("servicio_id","insumo_id")
);

-- AddForeignKey
ALTER TABLE "servicio_insumos" ADD CONSTRAINT "servicio_insumos_servicio_id_fkey" FOREIGN KEY ("servicio_id") REFERENCES "servicios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "servicio_insumos" ADD CONSTRAINT "servicio_insumos_insumo_id_fkey" FOREIGN KEY ("insumo_id") REFERENCES "insumos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
