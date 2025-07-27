-- PostgreSQL schema
-- Namedatabase: clothing_db

-- Drop tables if needed (ensure correct order for foreign keys)
DROP TABLE IF EXISTS cart_items;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS carts;
DROP TABLE IF EXISTS categories;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS knex_migrations;
DROP TABLE IF EXISTS knex_migrations_lock;
DROP TYPE IF EXISTS user_role;

-- Create ENUM type for roles
CREATE TYPE user_role AS ENUM ('admin', 'user');

-- USERS
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    address TEXT,
    phone VARCHAR(50),
    role user_role NOT NULL DEFAULT 'user', -- Sử dụng kiểu ENUM tùy chỉnh
    avatar_url VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    -- PostgreSQL requires a trigger for ON UPDATE CURRENT_TIMESTAMP
);

-- CATEGORIES
CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    url_path VARCHAR(255) UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    -- PostgreSQL requires a trigger for ON UPDATE CURRENT_TIMESTAMP
);

-- CARTS
CREATE TABLE carts (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    -- PostgreSQL requires a trigger for ON UPDATE CURRENT_TIMESTAMP
);

-- PRODUCTS
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    available BOOLEAN DEFAULT TRUE,
    image_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- Thay đổi từ TIME sang TIMESTAMP
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- Thay đổi từ TIME sang TIMESTAMP
    category_id INT,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
    -- PostgreSQL requires a trigger for ON UPDATE CURRENT_TIMESTAMP
);

-- KNEX_MIGRATIONS
CREATE TABLE knex_migrations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    batch INT,
    migration_time TIMESTAMP
);

-- KNEX_MIGRATIONS_LOCK
CREATE TABLE knex_migrations_lock (
    "index" SERIAL PRIMARY KEY, -- "index" là một từ khóa, cần đặt trong dấu ngoặc kép
    is_locked INT
);

-- CART_ITEMS
CREATE TABLE cart_items (
    id SERIAL PRIMARY KEY, -- Sửa AUTO_INCREMEN thành SERIAL
    cart_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity INT NOT NULL CHECK (quantity > 0),
    price DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (cart_id, product_id),
    FOREIGN KEY (cart_id) REFERENCES carts(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);
-- Triggers for 'updated_at' columns (Optional but recommended for auto-update functionality)
-- Chạy đoạn này sau khi đã tạo xong tất cả các bảng.
-- Nếu bạn không cần cột updated_at tự động cập nhật, có thể bỏ qua phần này.

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers to tables that need auto-updating 'updated_at'
CREATE TRIGGER update_users_timestamp
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_categories_timestamp
BEFORE UPDATE ON categories
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_carts_timestamp
BEFORE UPDATE ON carts
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_products_timestamp
BEFORE UPDATE ON products
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

ALTER TABLE products
ADD COLUMN stock INT NOT NULL DEFAULT 0;

ALTER TABLE users
ADD COLUMN password VARCHAR(255) NOT NULL;

INSERT INTO users (name, email, password, role)
VALUES (
  'Admin',
  'admin@clothing.com',
  '$2b$10$zmYewSG5lc/AV8K3kArmreAMmLZgFFFHXRA1rwkCxH3y3LqTwhj0W',
  'admin'
);

select * from users;