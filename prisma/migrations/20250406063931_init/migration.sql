-- CreateTable
CREATE TABLE "Book" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "isbn" TEXT NOT NULL,
    "title" TEXT,
    "imageUrl" TEXT,
    "description" TEXT,
    "authors" TEXT NOT NULL DEFAULT '[]',
    "publishedDate" TEXT,
    "pageCount" INTEGER,
    "categories" TEXT NOT NULL DEFAULT '[]',
    "source" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Book_isbn_key" ON "Book"("isbn");
