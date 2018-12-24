/* eslint-disable key-spacing, no-multi-spaces */

module.exports = function (DB, { INTEGER, STRING, BOOLEAN }) {
  const Model = DB.define('city',
    {
      id:       { type: INTEGER, allowNull: false, primaryKey: true, autoIncrement: true },
      title:    { type: STRING,  allowNull: false },
      display:  { type: BOOLEAN, allowNull: false, defaultValue: true }
      // country_id -> country.id
    },
    {
      timestamps: false,
      underscored: true,
      tableName: 'city',
      indexes: [
        { fields: [ 'country_id' ] },
        { fields: [ 'title' ] }
      ]
    }
  )

  Model.associate = (models) => {
    Model.hasMany(models.account, { foreignKey: { allowNull: false } })
    Model.belongsTo(models.country)
  }

  return Model
}
