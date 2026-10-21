-- CreateTable
CREATE TABLE "cortes_caja" (
    "id" SERIAL NOT NULL,
    "fecha" VARCHAR(10) NOT NULL,
    "fondo_inicial" DECIMAL(8,2) NOT NULL,
    "responsable_id" INTEGER NOT NULL,
    "abierto_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "conteo_real" DECIMAL(8,2),
    "cerrado_en" TIMESTAMP(3),

    CONSTRAINT "cortes_caja_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "movimientos_caja" (
    "id" SERIAL NOT NULL,
    "corte_caja_id" INTEGER NOT NULL,
    "tipo" VARCHAR(10) NOT NULL,
    "concepto" VARCHAR(200) NOT NULL,
    "monto" DECIMAL(8,2) NOT NULL,
    "usuario_id" INTEGER,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "movimientos_caja_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "cortes_caja_fecha_key" ON "cortes_caja"("fecha");

-- AddForeignKey
ALTER TABLE "cortes_caja" ADD CONSTRAINT "cortes_caja_responsable_id_fkey" FOREIGN KEY ("responsable_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos_caja" ADD CONSTRAINT "movimientos_caja_corte_caja_id_fkey" FOREIGN KEY ("corte_caja_id") REFERENCES "cortes_caja"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos_caja" ADD CONSTRAINT "movimientos_caja_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
