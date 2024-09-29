/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.up = (pgm) => {
  //create new user
  pgm.sql(
    `INSERT INTO users (id, username, password, fullname) VALUES ('old_notes', 'old_notes', 'old_notes', 'old_notes');`
  );

  pgm.sql(
    `UPDATE notes SET owner = (SELECT id FROM users WHERE owner IS NULL);`
  );

  pgm.addConstraint(
    "notes",
    "fk_notes.owner_users.id",
    "FOREIGN KEY(owner) REFERENCES users(id) ON DELETE CASCADE"
  );
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {
    pgm.dropConstraint("notes", "fk_notes.owner_users.id");
    pgm.sql(`UPDATE notes SET owner = NULL WHERE owner = 'old_notes';`);
    pgm.sql(`DELETE FROM users WHERE id = 'old_notes';`);
};
