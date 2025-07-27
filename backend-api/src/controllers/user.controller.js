// backend-api/src/controllers/user.controller.js
const JSend = require("../jsend");
const ApiError = require("../api-error");
const catchAsync = require("../catchAsync");
const userService = require("../services/user.service");
const fs = require('fs').promises; // For file system operations
const path = require('path'); // For path manipulation


const createUser = catchAsync(async (req, res, next) => { // Thêm 'next'
  let avatarUrl = null;
  if (req.file) {
    avatarUrl = `/public/avatars/${req.file.filename}`;
  }

  const { name, email, password, address, phone, role } = req.body;

  const userData = {
    name, 
    email,
    password,
    address,
    phone, 
    role, 
    avatar_url: avatarUrl,
  };

  const newUser = await userService.createUser(userData);
  return res.status(201).json(JSend.success({ user: newUser }));
});

const updateUser = catchAsync(async (req, res, next) => { // Thêm 'next'
  const { id } = req.params; 
  const { name, email, password, address, phone, role } = req.body;

  let avatarUrl = undefined;
  let oldAvatarPath = null; // To store path of old avatar for deletion

  // If a new file is uploaded
  if (req.file) {
    avatarUrl = `/public/avatars/${req.file.filename}`;
    // Get old user to delete old avatar
    const oldUser = await userService.getUserById(id);
    if (oldUser && oldUser.avatar_url && oldUser.avatar_url.includes('/public/avatars/avatar-')) {
      oldAvatarPath = path.join(__dirname, '../..', oldUser.avatar_url);
    }
  }

  const updateData = {
    name, 
    email,
    password,
    address,
    phone, 
    role, 
    avatar_url: avatarUrl, // This will be undefined if no new file, or new path
  };

  // Remove undefined fields so they don't overwrite existing data with undefined
  Object.keys(updateData).forEach(key => updateData[key] === undefined && delete updateData[key]);

  const updatedUser = await userService.updateUser(id, updateData);

  if (updatedUser) {
    // Delete old avatar file after successful update
    if (oldAvatarPath) {
      try {
        await fs.unlink(oldAvatarPath);
      } catch (err) {
        console.error(`Failed to delete old user avatar file: ${oldAvatarPath}`, err);
      }
    }
    res.status(200).json(JSend.success({ user: updatedUser }));
  } else {
    return next(new ApiError(404, "No user found with that ID to update")); // Sử dụng next
  }
});

const getAllUsers = catchAsync(async (req, res, _next) => {
  const filters = req.query; // Query đã được validate và coerced bởi Zod
  const { users, totalItems, currentPage, totalPages, limit } = await userService.getAllUsers(filters);
  res.status(200).json(JSend.success({
    users,
    metadata: {
      totalItems: totalItems,
      currentPage,
      totalPages,
      firstPage: 1,
      lastPage: totalPages,
      limit: limit
    }
  }));
});

const getUserById = catchAsync(async (req, res, _next) => {
  const user = await userService.getUserById(req.params.id);
  if (!user) return _next(new ApiError(404, "No user found with that ID"));
  res.status(200).json(JSend.success({ user }));
});

const deleteUser = catchAsync(async (req, res, _next) => {
  const userId = req.params.id;
  const user = await userService.getUserById(userId);

  if (user) {
    const deleted = await userService.deleteUser(userId);
    if (!deleted) {
      return _next(new ApiError(500, "Failed to delete user from database."));
    }
    // If user deleted and they had an avatar, delete the avatar file
    if (user.avatar_url && user.avatar_url.includes('/public/avatars/avatar-')) {
      const avatarFilePath = path.join(__dirname, '../..', user.avatar_url);
      try {
        await fs.unlink(avatarFilePath);
      } catch (err) {
        console.error(`Failed to delete user avatar file: ${avatarFilePath}`, err);
      }
    }
    res.status(204).json(JSend.success());
  } else {
    return _next(new ApiError(404, "No user found with that ID to delete"));
  }
});

const deleteAllUsers = catchAsync(async (req, res, _next) => {
    // Before deleting all users, get all their avatar paths to delete files
    const allUsers = await userService.getAllUsers({}); // Get all users without pagination/filters
    const avatarPathsToDelete = allUsers.users
        .filter(user => user.avatar_url && user.avatar_url.includes('/public/avatars/avatar-'))
        .map(user => path.join(__dirname, '../..', user.avatar_url));

    await userService.deleteAllUsers();

    // Delete all avatar files
    for (const filePath of avatarPathsToDelete) {
        try {
            await fs.unlink(filePath);
        } catch (err) {
            console.error(`Failed to delete avatar file during deleteAllUsers: ${filePath}`, err);
        }
    }

    res.status(204).json(JSend.success());
});

module.exports = {
  createUser,
  updateUser,
  getAllUsers,
  getUserById,
  deleteUser,
  deleteAllUsers
};
