CREATE TABLE "CourseQuiz" (
  "id" TEXT NOT NULL,
  "courseId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "passPercent" INTEGER NOT NULL DEFAULT 60,
  "isPublished" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CourseQuiz_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "CourseQuizQuestion" (
  "id" TEXT NOT NULL,
  "quizId" TEXT NOT NULL,
  "prompt" TEXT NOT NULL,
  "type" TEXT NOT NULL DEFAULT 'MCQ',
  "points" INTEGER NOT NULL DEFAULT 1,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "CourseQuizQuestion_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "CourseQuizOption" (
  "id" TEXT NOT NULL,
  "questionId" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "isCorrect" BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT "CourseQuizOption_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "CourseQuizAttempt" (
  "id" TEXT NOT NULL,
  "quizId" TEXT NOT NULL,
  "enrollmentId" TEXT NOT NULL,
  "score" INTEGER NOT NULL DEFAULT 0,
  "maxScore" INTEGER NOT NULL DEFAULT 0,
  "percent" INTEGER NOT NULL DEFAULT 0,
  "passed" BOOLEAN NOT NULL DEFAULT false,
  "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CourseQuizAttempt_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "CourseQuizAnswer" (
  "id" TEXT NOT NULL,
  "attemptId" TEXT NOT NULL,
  "questionId" TEXT NOT NULL,
  "optionId" TEXT,
  "textAnswer" TEXT,
  "isCorrect" BOOLEAN NOT NULL DEFAULT false,
  "pointsAwarded" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "CourseQuizAnswer_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "CourseQuiz_courseId_isPublished_idx" ON "CourseQuiz"("courseId","isPublished");
CREATE INDEX "CourseQuizQuestion_quizId_sortOrder_idx" ON "CourseQuizQuestion"("quizId","sortOrder");
CREATE INDEX "CourseQuizOption_questionId_idx" ON "CourseQuizOption"("questionId");
CREATE INDEX "CourseQuizAttempt_enrollmentId_submittedAt_idx" ON "CourseQuizAttempt"("enrollmentId","submittedAt");
CREATE INDEX "CourseQuizAttempt_quizId_submittedAt_idx" ON "CourseQuizAttempt"("quizId","submittedAt");
CREATE UNIQUE INDEX "CourseQuizAnswer_attemptId_questionId_key" ON "CourseQuizAnswer"("attemptId","questionId");
ALTER TABLE "CourseQuiz" ADD CONSTRAINT "CourseQuiz_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CourseQuizQuestion" ADD CONSTRAINT "CourseQuizQuestion_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "CourseQuiz"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CourseQuizOption" ADD CONSTRAINT "CourseQuizOption_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "CourseQuizQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CourseQuizAttempt" ADD CONSTRAINT "CourseQuizAttempt_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "CourseQuiz"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CourseQuizAttempt" ADD CONSTRAINT "CourseQuizAttempt_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "CourseEnrollment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CourseQuizAnswer" ADD CONSTRAINT "CourseQuizAnswer_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "CourseQuizAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CourseQuizAnswer" ADD CONSTRAINT "CourseQuizAnswer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "CourseQuizQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
