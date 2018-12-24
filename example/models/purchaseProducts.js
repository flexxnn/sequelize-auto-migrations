/* eslint-disable key-spacing, no-multi-spaces */

// @fix: https://github.com/flexxnn/sequelize-auto-migrations/issues/21

module.exports = function (DB, { INTEGER, DECIMAL }) {
    const purchaseProducts = DB.define('purchaseProducts', {
        id: {
          type: INTEGER.UNSIGNED,
          allowNull: false,
          autoIncrement: true,
          primaryKey: true,
        },
        price: {
          type: DECIMAL(6, 2),
          allowNull: false,
        },
    });
    
    return purchaseProducts;
  }
  