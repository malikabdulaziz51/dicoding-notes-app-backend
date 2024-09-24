const { nanoid } = require("nanoid");
const { Pool } = require("pg");
const InvariantError = require("../../exceptions/InvariantError");
const { mapDBToModel } = require("../../utils");

class NotesService {
  constructor() {
    this._pool = new Pool();
  }

  async addNote({ title, body, tags }) {
    const id = nanoid(16);
    const createdAt = new Date().toISOString();
    const updatedAt = createdAt;

    const query = {
      text: "INSERT INTO notes VALUES($1, $2, $3, $4, $5, $6) RETURNING id",
      values: [id, title, body, tags, createdAt, updatedAt],
    };

    return await this._pool
      .query(query)
      .then((result) => result.rows[0].id)
      .catch(() => {
        throw new InvariantError("Catatan gagal ditambahkan");
      });
  }

  async getNotes() {
    const result = await this._pool.query("SELECT * FROM notes");
    return result.rows.map(mapDBToModel);
  }

  async getNoteById(id) {
    const query = {
      text: "SELECT * FROM notes WHERE id = $1",
      values: [id],
    };

    return await this._pool
      .query(query)
      .then((result) => result.rows.map(mapDBToModel)[0])
      .catch(() => {
        throw new InvariantError("Catatan tidak ditemukan");
      });
  }

  async editNoteById(id, { title, body, tags }) {
    const updatedAt = new Date().toISOString();
    const query = {
      text: "UPDATE notes SET title = $1, body = $2, tags = $3, updated_at = $4 WHERE id = $5 RETURNING id",
      values: [title, body, tags, updatedAt, id],
    };

    return await this._pool.query(query).then((result) => {
      if (!result.rowCount) {
        throw new InvariantError(
          "Gagal memperbarui catatan. Id tidak ditemukan"
        );
      }
    });
  }

  async deleteNoteById(id) {
    const query = {
      text: "DELETE FROM notes WHERE id = $1 RETURNING id",
      values: [id],
    };

    return await this._pool.query(query).then((result) => {
      if (!result.rowCount) {
        throw new InvariantError("Catatan gagal dihapus. Id tidak ditemukan");
      }
    });
  }
}

module.exports = NotesService;
