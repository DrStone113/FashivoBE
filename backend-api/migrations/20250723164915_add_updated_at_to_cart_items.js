    /**
     * @param { import("knex").Knex } knex
     * @returns { Promise<void> }
     */
    exports.up = function(knex) {
      return knex.schema.alterTable('cart_items', function(table) {
        // Thêm cột updated_at với kiểu timestamp, mặc định là thời gian hiện tại
        table.timestamp('updated_at').defaultTo(knex.fn.now());
      });
    };

    /**
     * @param { import("knex").Knex } knex
     * @returns { Promise<void> }
     */
    exports.down = function(knex) {
      return knex.schema.alterTable('cart_items', function(table) {
        // Khi rollback, xóa cột updated_at
        table.dropColumn('updated_at');
      });
    };
    