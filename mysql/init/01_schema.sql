SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

CREATE TABLE IF NOT EXISTS sources (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  path          VARCHAR(512) NOT NULL UNIQUE,
  enabled       TINYINT(1) NOT NULL DEFAULT 1,
  last_scan_at  DATETIME NULL,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS shelves (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  name       VARCHAR(120) NOT NULL UNIQUE,
  kind       VARCHAR(40)  NOT NULL DEFAULT 'shelf',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS series (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  title        VARCHAR(255) NOT NULL,
  author       VARCHAR(255) NULL,
  description  TEXT NULL,
  kind         VARCHAR(40)  NOT NULL DEFAULT 'manga',
  direction    VARCHAR(10)  NOT NULL DEFAULT 'LTR',
  reading_mode VARCHAR(20)  NULL,
  fit          VARCHAR(20)  NULL,
  source_id    INT NULL,
  source_path  VARCHAR(512) NULL,
  cover_url    VARCHAR(512) NULL,
  format       VARCHAR(20)  NULL,
  tags         VARCHAR(255) NULL,
  shelf        VARCHAR(40)  NOT NULL DEFAULT 'reading',
  added_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_series_source FOREIGN KEY (source_id) REFERENCES sources(id) ON DELETE SET NULL
);

CREATE INDEX idx_series_shelf ON series(shelf);
CREATE INDEX idx_series_kind  ON series(kind);

CREATE TABLE IF NOT EXISTS chapters (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  series_id    INT NOT NULL,
  number       VARCHAR(20)  NOT NULL,
  number_sort  DECIMAL(10,2) NOT NULL DEFAULT 0,
  title        VARCHAR(255) NULL,
  page_count   INT NOT NULL DEFAULT 0,
  source_path  VARCHAR(512) NULL,
  format       VARCHAR(20)  NULL,
  added_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_chapter_series FOREIGN KEY (series_id) REFERENCES series(id) ON DELETE CASCADE
);

CREATE INDEX idx_chapter_series ON chapters(series_id, number_sort);

CREATE TABLE IF NOT EXISTS progress (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  series_id       INT NOT NULL,
  chapter_id      INT NOT NULL,
  page            INT NOT NULL DEFAULT 1,
  finished        TINYINT(1) NOT NULL DEFAULT 0,
  read_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_progress_chapter (chapter_id),
  CONSTRAINT fk_progress_series  FOREIGN KEY (series_id)  REFERENCES series(id)  ON DELETE CASCADE,
  CONSTRAINT fk_progress_chapter FOREIGN KEY (chapter_id) REFERENCES chapters(id) ON DELETE CASCADE
);

CREATE INDEX idx_progress_series ON progress(series_id, read_at);

CREATE TABLE IF NOT EXISTS bookmarks (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  series_id   INT NOT NULL,
  chapter_id  INT NOT NULL,
  page        INT NOT NULL,
  note        VARCHAR(255) NULL,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_bm_series  FOREIGN KEY (series_id)  REFERENCES series(id)  ON DELETE CASCADE,
  CONSTRAINT fk_bm_chapter FOREIGN KEY (chapter_id) REFERENCES chapters(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS series_collections (
  series_id  INT NOT NULL,
  shelf_id   INT NOT NULL,
  added_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (series_id, shelf_id),
  CONSTRAINT fk_sc_series FOREIGN KEY (series_id) REFERENCES series(id) ON DELETE CASCADE,
  CONSTRAINT fk_sc_shelf  FOREIGN KEY (shelf_id)  REFERENCES shelves(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS settings (
  k VARCHAR(64) PRIMARY KEY,
  v TEXT NOT NULL
);

INSERT IGNORE INTO settings (k, v) VALUES
  ('theme', 'light'),
  ('reading_mode_default', 'single'),
  ('direction_default', 'LTR'),
  ('fit_default', 'height'),
  ('auto_hide_chrome', '1'),
  ('preload_next', '3'),
  ('click_zones', '1'),
  ('reduce_motion', '0'),
  ('cover_progress', '1');

INSERT IGNORE INTO shelves (name, kind) VALUES
  ('All',          'system'),
  ('Reading',      'system'),
  ('Plan to read', 'system'),
  ('Finished',     'system'),
  ('On hold',      'system'),
  ('Seinen pile',  'collection'),
  ('Webtoons ''25','collection'),
  ('Re-read someday','collection'),
  ('Friday night', 'collection');

SET FOREIGN_KEY_CHECKS = 1;
