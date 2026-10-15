-- CreateEnum
CREATE TYPE "PartnerKind" AS ENUM ('HOSPITAL', 'PLATFORM');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('SENT', 'ACCEPTED', 'READY', 'DISPENSED', 'DECLINED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "Fulfilment" AS ENUM ('PICKUP', 'DELIVERY');

-- CreateEnum
CREATE TYPE "OrderPayer" AS ENUM ('PARTNER', 'PATIENT');

-- AlterTable
ALTER TABLE "Pharmacy" ADD COLUMN     "acceptsOrders" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "Partner" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "PartnerKind" NOT NULL,
    "keyPrefix" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "webhookUrl" TEXT,
    "webhookSecret" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Partner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MedicineOrder" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "pharmacyId" TEXT NOT NULL,
    "externalRef" TEXT NOT NULL,
    "patientName" TEXT NOT NULL,
    "patientPhone" TEXT NOT NULL,
    "prescriber" TEXT,
    "fulfilment" "Fulfilment" NOT NULL DEFAULT 'PICKUP',
    "deliveryAddress" TEXT,
    "payer" "OrderPayer" NOT NULL DEFAULT 'PARTNER',
    "note" TEXT,
    "status" "OrderStatus" NOT NULL DEFAULT 'SENT',
    "declineReason" TEXT,
    "totalKobo" INTEGER,
    "saleId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "dispensedAt" TIMESTAMP(3),

    CONSTRAINT "MedicineOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MedicineOrderItem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "medicine" TEXT NOT NULL,
    "strength" TEXT,
    "quantity" INTEGER NOT NULL,
    "instructions" TEXT,
    "productId" TEXT,

    CONSTRAINT "MedicineOrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Partner_keyHash_key" ON "Partner"("keyHash");

-- CreateIndex
CREATE UNIQUE INDEX "MedicineOrder_saleId_key" ON "MedicineOrder"("saleId");

-- CreateIndex
CREATE INDEX "MedicineOrder_pharmacyId_status_idx" ON "MedicineOrder"("pharmacyId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "MedicineOrder_partnerId_externalRef_key" ON "MedicineOrder"("partnerId", "externalRef");

-- AddForeignKey
ALTER TABLE "MedicineOrder" ADD CONSTRAINT "MedicineOrder_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicineOrder" ADD CONSTRAINT "MedicineOrder_pharmacyId_fkey" FOREIGN KEY ("pharmacyId") REFERENCES "Pharmacy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicineOrder" ADD CONSTRAINT "MedicineOrder_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicineOrderItem" ADD CONSTRAINT "MedicineOrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "MedicineOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicineOrderItem" ADD CONSTRAINT "MedicineOrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
