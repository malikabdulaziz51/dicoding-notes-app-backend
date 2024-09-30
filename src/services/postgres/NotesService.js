const { nanoid } = require("nanoid");
const { Pool } = require("pg");
const InvariantError = require("../../exceptions/InvariantError");
const { mapDBToModel } = require("../../utils");
const NotFoundError = require("../../exceptions/NotFoundError");
const AuthorizationError = require("../../exceptions/AuthorizationError");
const CollaborationsService = require("./CollaborationsService");

class NotesService {
  constructor() {
    this._pool = new Pool();
    this._collaborationService = new CollaborationsService();
  }

  async addNote({ title, body, tags, credentialId }) {
    const id = nanoid(16);
    const createdAt = new Date().toISOString();
    const updatedAt = createdAt;
    const query = {
      text: "INSERT INTO notes VALUES($1, $2, $3, $4, $5, $6, $7) RETURNING id",
      values: [id, title, body, tags, createdAt, updatedAt, credentialId],
    };

    return await this._pool
      .query(query)
      .then((result) => result.rows[0].id)
      .catch(() => {
        throw new InvariantError("Catatan gagal ditambahkan");
      });
  }

  async getNotes(owner) {
    const query = {
      text: `SELECT notes.* FROM notes
            LEFT JOIN collaborations ON collaborations.note_id = notes.id
            WHERE notes.owner = $1 OR collaborations.user_id = $1
            GROUP BY notes.id`,
      values: [owner],
    };
    const result = await this._pool.query(query);
    return result.rows.map(mapDBToModel);
  }

  async getNoteById(id) {
    const query = {
      text: `SELECT notes.*, users.username FROM notes
      LEFT JOIN users ON users.id = notes.owner
      WHERE notes.id = $1`,
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

  async verifyNoteOwner(id, owner) {
    const query = {
      text: "SELECT * FROM notes WHERE id = $1",
      values: [id],
    };

    return await this._pool.query(query).then((result) => {
      if (!result.rowCount) {
        throw new NotFoundError("Catatan tidak ditemukan");
      }

      const note = result.rows[0];
      if (note.owner !== owner) {
        throw new AuthorizationError(
          "Anda tidak berhak mengakses resource ini"
        );
      }
    });
  }

  async verifyNoteAccess(noteId, userId) {
    try {
      await this.verifyNoteOwner(noteId, userId);
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }

      try {
        await this._collaborationService.verifyCollaborator(noteId, userId);
      } catch {
        throw error;
      }
    }
  }
}

module.exports = NotesService;
