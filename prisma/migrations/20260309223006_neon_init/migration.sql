-- CreateTable
CREATE TABLE "Job" (
    "id" TEXT NOT NULL,
    "collectionDate" TIMESTAMP(3) NOT NULL,
    "collectorName" TEXT NOT NULL,
    "clientName" TEXT NOT NULL,
    "startTime" TIMESTAMP(3),
    "endTime" TIMESTAMP(3),
    "miles" DECIMAL(10,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CCFForm" (
    "id" TEXT NOT NULL,
    "specimenId" TEXT,
    "collectionDate" TIMESTAMP(3),
    "typeOfTest" TEXT,
    "projectJobNumber" TEXT,
    "employerName" TEXT,
    "donorFirstName" TEXT,
    "donorLastName" TEXT,
    "donorLastFourSsn" TEXT,
    "donorDob" TIMESTAMP(3),
    "donorPhone" TEXT,
    "collectorFirstName" TEXT,
    "collectorLastName" TEXT,
    "instantOralTox" TEXT,
    "jobId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "humanReviewed" BOOLEAN NOT NULL DEFAULT false,
    "humanReviewedAt" TIMESTAMP(3),
    "humanReviewedBy" TEXT,
    "formUrl" TEXT,

    CONSTRAINT "CCFForm_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Job_collectionDate_idx" ON "Job"("collectionDate");

-- CreateIndex
CREATE UNIQUE INDEX "Job_collectionDate_collectorName_clientName_key" ON "Job"("collectionDate", "collectorName", "clientName");

-- AddForeignKey
ALTER TABLE "CCFForm" ADD CONSTRAINT "CCFForm_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE SET NULL ON UPDATE CASCADE;
