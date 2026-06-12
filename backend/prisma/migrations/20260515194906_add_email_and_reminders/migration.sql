-- AlterTable
ALTER TABLE "Customer" ADD COLUMN "email" TEXT;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Booking" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "customerId" INTEGER NOT NULL,
    "service" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "appointmentDate" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "reminded1Day" BOOLEAN NOT NULL DEFAULT false,
    "reminded1Hour" BOOLEAN NOT NULL DEFAULT false,
    "reminded15Min" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Booking_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Booking" ("appointmentDate", "createdAt", "customerId", "id", "price", "reminded15Min", "reminded1Hour", "service", "status", "updatedAt") SELECT "appointmentDate", "createdAt", "customerId", "id", "price", "reminded15Min", "reminded1Hour", "service", "status", "updatedAt" FROM "Booking";
DROP TABLE "Booking";
ALTER TABLE "new_Booking" RENAME TO "Booking";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
