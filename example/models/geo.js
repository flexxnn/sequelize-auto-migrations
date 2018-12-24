/* eslint-disable key-spacing, no-multi-spaces */

module.exports = function (DB, { INTEGER, GEOMETRY, GEOGRAPHY }) {
    const Model = DB.define('geo',
      {
        id:       { type: INTEGER, allowNull: false, primaryKey: true, autoIncrement: true },
        geometry_1:    { type: GEOMETRY,  allowNull: false },
        geometry_2:    { type: GEOMETRY('POINT'),  allowNull: false },
        geometry_3:    { type: GEOMETRY('POINT', 4326),  allowNull: false },
      }
    )
  
    return Model
  }
  