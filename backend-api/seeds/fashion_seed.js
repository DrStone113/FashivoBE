const { faker } = require("@faker-js/faker/locale/vi");
const bcrypt = require("bcryptjs");

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.seed = async function (knex) {
  // 1. Dọn dẹp dữ liệu cũ (TRỪ USER ADMIN)
  console.log("Cleaning old data...");
  await knex("cart_items").del();
  await knex("carts")
    .whereIn("user_id", function () {
      this.select("id").from("users").whereNot("role", "admin");
    })
    .del();
  await knex("products").del();
  await knex("categories").del();
  await knex("users").where("role", "user").del();

  // --- BẮT ĐẦU DỮ LIỆU SEED ---

  // 2. Tạo dữ liệu người dùng (Users)
  console.log("Seeding new users...");
  const users = [];
  const numberOfUsers = 14;
  const saltRounds = 10;
  const plainPassword = "password123";
  const hashedPassword = await bcrypt.hash(plainPassword, saltRounds);

  for (let i = 0; i < numberOfUsers; i++) {
    users.push({
      name: faker.person.fullName(),
      email: faker.internet.email(),
      address: faker.location.streetAddress(),
      phone: faker.phone.number("09########"),
      role: "user",
      avatar_url: faker.image.avatar(),
      password: hashedPassword,
      created_at: new Date(),
      updated_at: new Date(),
    });
  }
  const createdUsers = await knex("users").insert(users).returning("*");

  // 3. Tạo dữ liệu danh mục (Categories)
  console.log("Seeding categories...");
  const categoriesData = [
    {
      name: "T-Shirts",
      url_path: "/t-shirts",
      description: "Áo thun thoải mái, phong cách cho mọi ngày.",
    },
    {
      name: "Shirts",
      url_path: "/shirts",
      description: "Áo sơ mi lịch sự và năng động.",
    },
    {
      name: "Jeans",
      url_path: "/jeans",
      description: "Đa dạng các loại quần jean cho mọi phong cách.",
    },
    {
      name: "Shorts",
      url_path: "/shorts",
      description: "Quần short mát mẻ cho mùa hè năng động.",
    },
    {
      name: "Dresses",
      url_path: "/dresses",
      description: "Váy đầm thanh lịch, nữ tính cho mọi dịp.",
    },
    {
      name: "Jackets",
      url_path: "/jackets",
      description: "Giữ ấm và thể hiện cá tính với bộ sưu tập áo khoác.",
    },
    {
      name: "Footwear",
      url_path: "/footwear",
      description: "Giày, bốt và sneakers để hoàn thiện bộ trang phục.",
    },
    {
      name: "Accessories",
      url_path: "/accessories",
      description: "Những phụ kiện nhỏ giúp nâng tầm phong cách.",
    },
  ];
  const createdCategories = await knex("categories")
    .insert(categoriesData)
    .returning("*");

  // 4. Tạo dữ liệu sản phẩm (Products)
  console.log("Seeding products...");
  const adjectives = [
    "Basic",
    "Classic",
    "Vintage",
    "Modern",
    "Minimalist",
    "Streetwear",
    "Elegant",
  ];
  const materials = [
    "Cotton",
    "Linen",
    "Denim",
    "Silk",
    "Wool",
    "Polyester",
    "Organic Cotton",
  ];
  const productTypesByCategory = {
    "T-Shirts": [
      "Graphic T-Shirt",
      "Polo T-Shirt",
      "V-Neck T-Shirt",
      "Long-Sleeve Tee",
      "Tank Top",
    ],
    Shirts: [
      "Oxford Shirt",
      "Flannel Shirt",
      "Cuban Shirt",
      "Linen Shirt",
      "Formal Shirt",
    ],
    Jeans: [
      "Skinny Jeans",
      "Straight-Leg Jeans",
      "Bootcut Jeans",
      "Ripped Jeans",
      "Mom Jeans",
    ],
    Shorts: ["Cargo Shorts", "Denim Shorts", "Chino Shorts", "Bermuda Shorts"],
    Dresses: [
      "Summer Dress",
      "Evening Gown",
      "Cocktail Dress",
      "Maxi Dress",
      "Office Dress",
    ],
    Jackets: [
      "Denim Jacket",
      "Leather Jacket",
      "Bomber Jacket",
      "Blazer",
      "Windbreaker",
    ],
    Footwear: [
      "Leather Boots",
      "Sneakers",
      "Sandals",
      "Running Shoes",
      "Loafers",
    ],
    Accessories: [
      "Leather Belt",
      "Silk Scarf",
      "Beanie Hat",
      "Sunglasses",
      "Canvas Tote Bag",
    ],
  };
  const imageUrlsByCategory = {
    "T-Shirts": [
      "https://images.pexels.com/photos/1261422/pexels-photo-1261422.jpeg?auto=compress&cs=tinysrgb&w=600",
      "https://images.pexels.com/photos/991509/pexels-photo-991509.jpeg?auto=compress&cs=tinysrgb&w=600",
      "https://images.pexels.com/photos/15619164/pexels-photo-15619164.jpeg?auto=compress&cs=tinysrgb&w=600",
    ],
    Shirts: [
      "https://images.pexels.com/photos/297933/pexels-photo-297933.jpeg?auto=compress&cs=tinysrgb&w=600",
      "https://images.pexels.com/photos/1043474/pexels-photo-1043474.jpeg?auto=compress&cs=tinysrgb&w=600",
      "https://images.pexels.com/photos/3775603/pexels-photo-3775603.jpeg?auto=compress&cs=tinysrgb&w=600",
    ],
    Jeans: [
      "https://images.pexels.com/photos/1082529/pexels-photo-1082529.jpeg?auto=compress&cs=tinysrgb&w=600",
      "https://images.pexels.com/photos/1485031/pexels-photo-1485031.jpeg?auto=compress&cs=tinysrgb&w=600",
      "https://images.pexels.com/photos/159624/jeans-boy-fashion-man-159624.jpeg?auto=compress&cs=tinysrgb&w=600",
    ],
    Shorts: [
      "https://images.pexels.com/photos/1126993/pexels-photo-1126993.jpeg?auto=compress&cs=tinysrgb&w=600",
      "https://images.pexels.com/photos/593226/pexels-photo-593226.jpeg?auto=compress&cs=tinysrgb&w=600",
      "https://images.pexels.com/photos/2006836/pexels-photo-2006836.jpeg?auto=compress&cs=tinysrgb&w=600",
    ],
    Dresses: [
      "https://images.pexels.com/photos/1462637/pexels-photo-1462637.jpeg?auto=compress&cs=tinysrgb&w=600",
      "https://images.pexels.com/photos/1755428/pexels-photo-1755428.jpeg?auto=compress&cs=tinysrgb&w=600",
      "https://images.pexels.com/photos/1055691/pexels-photo-1055691.jpeg?auto=compress&cs=tinysrgb&w=600",
    ],
    Jackets: [
      "https://images.pexels.com/photos/1642228/pexels-photo-1642228.jpeg?auto=compress&cs=tinysrgb&w=600",
      "https://images.pexels.com/photos/3310695/pexels-photo-3310695.jpeg?auto=compress&cs=tinysrgb&w=600",
      "https://images.pexels.com/photos/1852382/pexels-photo-1852382.jpeg?auto=compress&cs=tinysrgb&w=600",
    ],
    Footwear: [
      "https://images.pexels.com/photos/1598505/pexels-photo-1598505.jpeg?auto=compress&cs=tinysrgb&w=600",
      "https://images.pexels.com/photos/2529148/pexels-photo-2529148.jpeg?auto=compress&cs=tinysrgb&w=600",
      "https://images.pexels.com/photos/267202/pexels-photo-267202.jpeg?auto=compress&cs=tinysrgb&w=600",
    ],
    Accessories: [
      "https://images.pexels.com/photos/1103554/pexels-photo-1103554.jpeg?auto=compress&cs=tinysrgb&w=600",
      "https://images.pexels.com/photos/3163385/pexels-photo-3163385.jpeg?auto=compress&cs=tinysrgb&w=600",
      "https://images.pexels.com/photos/276551/pexels-photo-276551.jpeg?auto=compress&cs=tinysrgb&w=600",
    ],
  };

  const products = [];
  const numberOfProducts = 100;
  for (let i = 0; i < numberOfProducts; i++) {
    const category = faker.helpers.arrayElement(createdCategories);
    const productType = faker.helpers.arrayElement(
      productTypesByCategory[category.name]
    );
    const adjective = faker.helpers.arrayElement(adjectives);
    const material = faker.helpers.arrayElement(materials);
    const productName = `${adjective} ${productType}`;
    const productDescription = `Giới thiệu sản phẩm ${productName}. Một sự kết hợp hoàn hảo giữa phong cách và sự thoải mái. Được chế tác từ chất liệu ${material} cao cấp, mang lại cảm giác dễ chịu khi mặc. ${faker.lorem.paragraph(1)}`;

    products.push({
      name: productName,
      type: faker.helpers.arrayElement([
        "Slim Fit",
        "Regular Fit",
        "Loose Fit",
        "Oversized",
      ]),
      description: productDescription,
      price:
        Math.round(faker.number.int({ min: 250000, max: 3000000 }) / 1000) *
        1000,
      available: faker.datatype.boolean(0.9),
      image_url: faker.helpers.arrayElement(imageUrlsByCategory[category.name]),
      category_id: category.id,
      stock: faker.number.int({ min: 0, max: 200 }),
      created_at: new Date(),
      updated_at: new Date(),
    });
  }
  await knex("products").insert(products).returning("*");

  // 5. Tạo giỏ hàng (Carts) cho các user MỚI được tạo
  console.log("Seeding empty carts for new users...");
  const carts = createdUsers.map((user) => ({
    user_id: user.id,
    created_at: new Date(),
    updated_at: new Date(),
  }));
  await knex("carts").insert(carts);

  // *** THAY ĐỔI QUAN TRỌNG: Vô hiệu hóa phần tạo cart_items ***
  /*
  // 6. Tạo các món trong giỏ hàng (Cart Items)
  console.log("Seeding cart items for new users...");
  const cartItems = [];
  for (const cart of createdCarts) {
    const numberOfItemsInCart = faker.number.int({ min: 1, max: 5 });
    const productsInCart = faker.helpers.shuffle(createdProducts).slice(0, numberOfItemsInCart);
    for (const product of productsInCart) {
      cartItems.push({
        cart_id: cart.id,
        product_id: product.id,
        quantity: faker.number.int({ min: 1, max: 3 }),
        price: product.price,
        created_at: new Date(),
      });
    }
  }

  if (cartItems.length > 0) {
    const chunkSize = 50;
    for (let i = 0; i < cartItems.length; i += chunkSize) {
      const chunk = cartItems.slice(i, i + chunkSize);
      await knex("cart_items").insert(chunk);
    }
  }
  */

  console.log("Database seeding completed successfully! 🌱");
};
