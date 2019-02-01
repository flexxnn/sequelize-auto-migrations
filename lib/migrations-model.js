const pathConfig = require('./pathconfig');

const {
  migrationsTable,
} = pathConfig();

module.exports = function (DB, { INTEGER, STRING }) {
    const Model = DB.define('Migrations',
      {
        id:         { type: INTEGER, allowNull: false, primaryKey: true, autoIncrement: true },
        name:       { type: STRING,  allowNull: false, defaultValue: '' },
        revision:   { type: INTEGER,  allowNull: false },
        pos:        { type: INTEGER,  allowNull: false },
      },
      {
        timestamps: true,
        tableName: migrationsTable
      }
    )
    return Model
}
