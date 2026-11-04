CREATE TABLE "Course" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "category" TEXT NOT NULL DEFAULT 'GENERAL',
  "level" TEXT NOT NULL DEFAULT 'ALL',
  "priceMinor" INTEGER NOT NULL DEFAULT 0,
  "currency" TEXT NOT NULL DEFAULT 'EGP',
  "coverUrl" TEXT,
  "isPublished" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Course_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "CourseLesson" (
  "id" TEXT NOT NULL,
  "courseId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "videoUrl" TEXT,
  "content" TEXT,
  "durationMin" INTEGER NOT NULL DEFAULT 0,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "isPreview" BOOLEAN NOT NULL DEFAULT false,
  "isPublished" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CourseLesson_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "CourseEnrollment" (
  "id" TEXT NOT NULL,
  "courseId" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "paidMinor" INTEGER NOT NULL DEFAULT 0,
  "paymentRef" TEXT,
  "enrolledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CourseEnrollment_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "CourseLessonProgress" (
  "id" TEXT NOT NULL,
  "enrollmentId" TEXT NOT NULL,
  "lessonId" TEXT NOT NULL,
  "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CourseLessonProgress_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Course_slug_key" ON "Course"("slug");
CREATE INDEX "Course_isPublished_category_idx" ON "Course"("isPublished","category");
CREATE INDEX "CourseLesson_courseId_sortOrder_idx" ON "CourseLesson"("courseId","sortOrder");
CREATE UNIQUE INDEX "CourseEnrollment_courseId_customerId_key" ON "CourseEnrollment"("courseId","customerId");
CREATE INDEX "CourseEnrollment_customerId_status_idx" ON "CourseEnrollment"("customerId","status");
CREATE UNIQUE INDEX "CourseLessonProgress_enrollmentId_lessonId_key" ON "CourseLessonProgress"("enrollmentId","lessonId");
ALTER TABLE "CourseLesson" ADD CONSTRAINT "CourseLesson_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CourseEnrollment" ADD CONSTRAINT "CourseEnrollment_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CourseEnrollment" ADD CONSTRAINT "CourseEnrollment_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CourseLessonProgress" ADD CONSTRAINT "CourseLessonProgress_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "CourseEnrollment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CourseLessonProgress" ADD CONSTRAINT "CourseLessonProgress_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "CourseLesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;
