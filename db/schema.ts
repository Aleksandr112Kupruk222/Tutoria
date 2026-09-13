import {
  sqliteTable,
  text,
  integer,
  index,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
export const teachers = sqliteTable(
  "teachers",
  {
    id: text("id").primaryKey(),
    username: text("username").notNull(),
    name: text("name").notNull(),
    role: text("role").notNull().default("teacher"),
    deleted: integer("deleted").notNull().default(0),
    passwordHash: text("password_hash").notNull(),
    mustChange: integer("must_change").notNull().default(1),
    createdAt: text("created_at").notNull(),
  },
  (t) => [uniqueIndex("idx_teacher_username").on(t.username)],
);
export const sessions = sqliteTable(
  "sessions",
  {
    tokenHash: text("token_hash").primaryKey(),
    teacherId: text("teacher_id")
      .notNull()
      .references(() => teachers.id),
    expires: integer("expires").notNull(),
  },
  (t) => [index("idx_session_teacher").on(t.teacherId)],
);
export const loginAttempts = sqliteTable("login_attempts", {
  key: text("key").primaryKey(),
  attempts: integer("attempts").notNull(),
  resetAt: integer("reset_at").notNull(),
});
export const folders = sqliteTable(
  "folders",
  {
    id: text("id").primaryKey(),
    ownerId: text("owner_id")
      .notNull()
      .references(() => teachers.id),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    color: text("color").notNull().default("cyan"),
    createdAt: text("created_at").notNull(),
  },
  (t) => [index("idx_folder_owner").on(t.ownerId)],
);
export const tutorials = sqliteTable(
  "tutorials",
  {
    id: text("id").primaryKey(),
    ownerId: text("owner_id")
      .notNull()
      .references(() => teachers.id),
    folderId: text("folder_id")
      .notNull()
      .references(() => folders.id),
    deleted: integer("deleted").notNull().default(0),
    sortOrder: integer("sort_order").notNull().default(0),
    draftJson: text("draft_json").notNull(),
    publishedJson: text("published_json"),
    revision: integer("revision").notNull().default(1),
    updatedAt: text("updated_at").notNull(),
  },
  (t) => [
    index("idx_tutorial_owner").on(t.ownerId),
    index("idx_tutorial_folder").on(t.folderId),
  ],
);
export const youtubeConnections = sqliteTable("youtube_connections", {
  teacherId: text("teacher_id")
    .primaryKey()
    .references(() => teachers.id),
  channelId: text("channel_id").notNull(),
  channelTitle: text("channel_title").notNull(),
  refreshToken: text("refresh_token").notNull(),
});
export const oauthStates = sqliteTable("oauth_states", {
  stateHash: text("state_hash").primaryKey(),
  teacherId: text("teacher_id")
    .notNull()
    .references(() => teachers.id),
  sessionHash: text("session_hash").notNull(),
  verifier: text("verifier").notNull(),
  expires: integer("expires").notNull(),
});
