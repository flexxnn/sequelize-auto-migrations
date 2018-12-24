/* eslint-disable key-spacing, no-multi-spaces */

module.exports = function (DB, { INTEGER, BIGINT, DATE, STRING, ENUM, BOOLEAN, DATEONLY, NOW }) {
  const Model = DB.define('account',
    {
      id:             { type: INTEGER,  allowNull: false, primaryKey: true, autoIncrement: true },
      test_param:     { type: BIGINT,  allowNull: false, defaultValue: 1000 },
      first_name:     { type: STRING,   allowNull: true, defaultValue: 'abc', field: 'first-name' },
      last_name:      { type: STRING,   allowNull: false, defaultValue: '' },
      nickname:       { type: STRING,   allowNull: false, defaultValue: '' },
      gender:         { type: ENUM,     allowNull: false, values: ['male', 'female', 'unknown'], defaultValue: 'unknown' },
      birth_date:     { type: DATEONLY, allowNull: true },
      last_login_dt:  { type: DATE,     allowNull: true },
      created_at:      { type: DATE,     allowNull: true, defaultValue: NOW },
      email:          { type: STRING,   allowNull: false },
      password:       { type: STRING,   allowNull: false },
      is_deleted:     { type: BOOLEAN,  allowNull: false, defaultValue: false },
      is_blocked:     { type: BOOLEAN,  allowNull: false, defaultValue: false },
      // city_id -> city.id
    },
    {
      timestamps: false,
      underscored: true,
      tableName: 'account'
    }
  )

  Model.associate = (models) => {
    Model.belongsTo(models.city)
    // Model.hasMany(models.team, { foreignKey: { allowNull: false } })
  }

  return Model
}
