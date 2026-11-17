-- =====================================================================
-- Danu-Jobpost : สร้างตารางทั้งหมดใน Supabase (PostgreSQL)
-- วิธีใช้: Supabase > SQL Editor > New query > วางทั้งไฟล์ > กด Run
-- รันครั้งเดียวพอ (ถ้ารันซ้ำจะ error ว่าตารางมีอยู่แล้ว ไม่เป็นไร ไม่ทำให้ข้อมูลหาย)
-- =====================================================================

CREATE TABLE "User" (
    "id"           TEXT NOT NULL,
    "username"     TEXT NOT NULL,
    "name"         TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role"         TEXT NOT NULL DEFAULT 'recruiter',
    "isActive"     BOOLEAN NOT NULL DEFAULT true,
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"    TIMESTAMP(3) NOT NULL,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FacebookPage" (
    "id"             TEXT NOT NULL,
    "pageId"         TEXT NOT NULL,
    "name"           TEXT NOT NULL,
    "encryptedToken" TEXT NOT NULL,
    "avatar"         TEXT,
    "category"       TEXT,
    "isActive"       BOOLEAN NOT NULL DEFAULT true,
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"      TIMESTAMP(3) NOT NULL,
    "createdById"    TEXT NOT NULL,
    "managedById"    TEXT,
    CONSTRAINT "FacebookPage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Post" (
    "id"           TEXT NOT NULL,
    "message"      TEXT NOT NULL,
    "linkUrl"      TEXT,
    "imageUrl"     TEXT,
    "status"       TEXT NOT NULL DEFAULT 'draft',
    "scheduledAt"  TIMESTAMP(3),
    "postedAt"     TIMESTAMP(3),
    "fbPostId"     TEXT,
    "errorMessage" TEXT,
    "pageId"       TEXT NOT NULL,
    "createdById"  TEXT NOT NULL,
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"    TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Post_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ActivityLog" (
    "id"        TEXT NOT NULL,
    "postId"    TEXT,
    "userId"    TEXT,
    "action"    TEXT NOT NULL,
    "status"    TEXT NOT NULL,
    "message"   TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ActivityLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Setting" (
    "id"    TEXT NOT NULL,
    "key"   TEXT NOT NULL,
    "value" TEXT NOT NULL,
    CONSTRAINT "Setting_pkey" PRIMARY KEY ("id")
);

-- Unique / Index
CREATE UNIQUE INDEX "User_username_key"        ON "User"("username");
CREATE UNIQUE INDEX "FacebookPage_pageId_key"  ON "FacebookPage"("pageId");
CREATE UNIQUE INDEX "Setting_key_key"          ON "Setting"("key");
CREATE INDEX "Post_status_scheduledAt_idx"     ON "Post"("status", "scheduledAt");

-- Foreign keys
ALTER TABLE "FacebookPage" ADD CONSTRAINT "FacebookPage_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FacebookPage" ADD CONSTRAINT "FacebookPage_managedById_fkey"
    FOREIGN KEY ("managedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Post" ADD CONSTRAINT "Post_pageId_fkey"
    FOREIGN KEY ("pageId") REFERENCES "FacebookPage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Post" ADD CONSTRAINT "Post_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_postId_fkey"
    FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ---------------------------------------------------------------------
-- ความปลอดภัย (สำคัญ): เปิด Row Level Security ทุกตาราง
-- Supabase เปิด API สาธารณะให้ตารางในสคีมา public โดยอัตโนมัติ
-- ถ้าไม่เปิด RLS คนที่มี publishable key (ซึ่งเป็นกุญแจสาธารณะ) อ่านตารางได้
-- รวมถึง passwordHash และ token ที่เข้ารหัส
-- แอปเราเชื่อมต่อผ่าน Prisma (ผู้ใช้ postgres ซึ่งข้าม RLS) จึงไม่กระทบการทำงาน
-- ---------------------------------------------------------------------
ALTER TABLE "User"         ENABLE ROW LEVEL SECURITY;
ALTER TABLE "FacebookPage" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Post"         ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ActivityLog"  ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Setting"      ENABLE ROW LEVEL SECURITY;
