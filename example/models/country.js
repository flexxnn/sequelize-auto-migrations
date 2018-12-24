/* eslint-disable key-spacing, no-multi-spaces */

module.exports = function (DB, { INTEGER, STRING, BOOLEAN }) {
  const Model = DB.define('country',
    {
      id:       { type: INTEGER, allowNull: false, primaryKey: true, autoIncrement: true },
      title:    { type: STRING,  allowNull: false },
      display:  { type: BOOLEAN, allowNull: false, defaultValue: true }
    },
    {
      timestamps: false,
      underscored: true,
      tableName: 'country',
      indexes: [
        { fields: [ 'title' ] },
        { fields: [ 'display' ] }
      ]
    }
  )

  Model.associate = (models) => {
    Model.hasMany(models.city, { foreignKey: { allowNull: false } })
  }

  return Model
}
