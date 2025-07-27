// src/services/auth.service.js

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const knex = require('../config/db'); 
const ApiError = require('../api-error');

const TABLE_NAME = 'users'; 

// Hàm trợ giúp để tạo token JWT
const signToken = (id) => {
  // Thêm kiểm tra để đảm bảo biến môi trường được tải
  if (!process.env.JWT_SECRET) {
    console.error('JWT_SECRET is not defined!');
    throw new Error('JWT_SECRET environment variable is missing.');
  }
  if (!process.env.JWT_EXPIRES_IN) {
    console.error('JWT_EXPIRES_IN is not defined!');
    throw new Error('JWT_EXPIRES_IN environment variable is missing.');
  }

  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

// Hàm tìm người dùng bằng email
const findUserByEmail = async (email) => {
  return knex(TABLE_NAME).where({ email }).first();
};

// Hàm tìm người dùng bằng ID
const findUserById = async (id) => {
  return knex(TABLE_NAME).where({ id }).first();
};

// Hàm tạo người dùng mới
const registerUser = async (userData) => {
  const hashedPassword = await bcrypt.hash(userData.password, 12); 
  
  try {
    const [newUser] = await knex(TABLE_NAME).insert({
      name: userData.name,
      email: userData.email,
      password: hashedPassword,
      address: userData.address,
      phone: userData.phone,
      avatar_url: userData.avatar_url || null, // Lưu avatar_url nếu có
      role: userData.role || 'user', 
    }).returning('*'); 

    const { password, ...userWithoutPassword } = newUser;
    return userWithoutPassword;

  } catch (error) {
    if (error.code === '23505') { 
      throw new ApiError(400, 'Email hoặc username đã tồn tại.');
    }
    throw new ApiError(500, `Không thể đăng ký người dùng: ${error.message}`);
  }
};

// Hàm đăng nhập người dùng
const loginUser = async (email, candidatePassword) => {
  const user = await findUserByEmail(email);

  if (!user) {
    throw new ApiError(401, 'Email hoặc mật khẩu không đúng!');
  }

  if (!user.password) {
    console.error('User found but no password field:', user);
    throw new ApiError(500, 'Lỗi server: Thông tin người dùng không hợp lệ.');
  }

  const isPasswordCorrect = await bcrypt.compare(candidatePassword, user.password);
  if (!isPasswordCorrect) {
    throw new ApiError(401, 'Email hoặc mật khẩu không đúng!');
  }

  const { password, ...userWithoutPassword } = user;
  
  const token = signToken(user.id); 

  return { user: userWithoutPassword, token };
};

// Hàm cập nhật thông tin profile của người dùng
const updateProfile = async (userId, updateData) => {
  try {
    const { avatarFile, ...dataToUpdate } = updateData; 

    // Nếu email được gửi và khác với email hiện tại của người dùng, kiểm tra trùng lặp
    if (dataToUpdate.email) {
      const currentUser = await findUserById(userId);
      if (currentUser && currentUser.email !== dataToUpdate.email) {
        const existingUserWithNewEmail = await findUserByEmail(dataToUpdate.email);
        if (existingUserWithNewEmail) {
          throw new ApiError(400, 'Email mới đã tồn tại. Vui lòng chọn email khác.');
        }
      }
    }

    const [updatedUser] = await knex(TABLE_NAME).where({ id: userId }).update(dataToUpdate).returning('*');
    
    if (!updatedUser) {
      throw new ApiError(404, 'Người dùng không tìm thấy để cập nhật.');
    }
    const { password, ...userWithoutPassword } = updatedUser;
    return userWithoutPassword;

  } catch (error) {
    // Kiểm tra mã lỗi và tên ràng buộc UNIQUE cho email
    if (error.code === '23505' && error.constraint === 'users_email_unique') { 
      throw new ApiError(400, 'Email mới đã tồn tại.');
    }
    // Đối với các lỗi khác, hoặc lỗi từ ApiError đã chủ động throw
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(500, `Không thể cập nhật profile: ${error.message}`);
  }
};

// Hàm cập nhật mật khẩu của người dùng
const updatePasswordForUser = async (userId, currentPassword, newPassword) => {
  const user = await findUserById(userId);
  if (!user) {
    throw new ApiError(404, 'Người dùng không tìm thấy.');
  }

  if (!(await bcrypt.compare(currentPassword, user.password))) {
    throw new ApiError(401, 'Mật khẩu hiện tại không đúng.');
  }

  const hashedNewPassword = await bcrypt.hash(newPassword, 12);
  const [updatedUser] = await knex(TABLE_NAME).where({ id: userId }).update({ password: hashedNewPassword }).returning('*');

  if (!updatedUser) {
    throw new ApiError(500, 'Không thể cập nhật mật khẩu.');
  }
  const { password, ...userWithoutPassword } = updatedUser;
  return userWithoutPassword;
};

// Hàm xử lý quên mật khẩu (chỉ tạo token reset)
const generatePasswordResetToken = async (email) => {
  const user = await findUserByEmail(email);
  if (!user) {
    throw new ApiError(404, 'Không tìm thấy người dùng với email này.');
  }

  const resetToken = jwt.sign({ id: user.id }, process.env.JWT_SECRET_RESET, {
    expiresIn: '10m', 
  });

  const hashedResetToken = await bcrypt.hash(resetToken, 10); 
  const resetExpires = new Date(Date.now() + 10 * 60 * 1000); 

  await knex(TABLE_NAME).where({ id: user.id }).update({
    passwordResetToken: hashedResetToken,
    passwordResetExpires: resetExpires,
  });

  return resetToken; 
};

// Hàm xử lý reset mật khẩu
const resetPassword = async (token, newPassword) => {
  const user = await knex(TABLE_NAME)
    .where('passwordResetExpires', '>', new Date())
    .andWhere('passwordResetToken', token) 
    .first();

  if (!user) {
    throw new ApiError(400, 'Token không hợp lệ hoặc đã hết hạn.');
  }

  const hashedNewPassword = await bcrypt.hash(newPassword, 12);
  await knex(TABLE_NAME).where({ id: user.id }).update({
    password: hashedNewPassword,
    passwordResetToken: null,
    passwordResetExpires: null,
  });

  const { password, ...userWithoutPassword } = user; 
  return { user: userWithoutPassword, token: signToken(user.id) };
};


module.exports = {
  signToken,
  findUserByEmail,
  findUserById,
  registerUser,
  loginUser,
  updateProfile,
  updatePasswordForUser,
  generatePasswordResetToken,
  resetPassword,
};