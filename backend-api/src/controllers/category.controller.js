//src\controllers\category.controller.js
const JSend = require("../jsend");
const ApiError = require("../api-error");
const catchAsync = require("../catchAsync");
const categoryService = require("../services/category.service");

const createCategory = catchAsync(async (req, res, _next) => {
    // Zod has already validated and coerced `name`, `url_path`, `description`
    let { name, url_path, description } = req.body;

    // If url_path is not provided by client, automatically generate from name
    if (!url_path && name) {
        url_path = name.toLowerCase().replace(/[^a-z0-9 -]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-');
    } else if (url_path) {
        // If provided, ensure it's lowercased and trimmed
        url_path = url_path.toLowerCase().trim();
    }

    const categoryData = {
        name,
        url_path,
        description,
    };

    const newCategory = await categoryService.createCategory(categoryData);
    return res.status(201).json(JSend.success({ category: newCategory }));
});

const updateCategory = catchAsync(async (req, res, _next) => {
    const { id } = req.params; // Zod already coerced this to number
    let { name, url_path, description } = req.body;

    // Handle url_path logic for updates
    if (url_path) {
        // If url_path is explicitly provided in the update, use it
        url_path = url_path.toLowerCase().trim();
    } else if (name !== undefined && url_path === null) {
        // If name is updated AND url_path is explicitly set to null, set it to null
        url_path = null;
    } else if (name !== undefined && url_path === undefined) {
        // If name is updated but url_path is not provided (undefined), regenerate slug from new name
        url_path = name.toLowerCase().replace(/[^a-z0-9 -]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-');
    }
    // If name is NOT updated and url_path is UNDEFINED, keep existing url_path (don't update it)

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (url_path !== undefined) updateData.url_path = url_path; // Use the potentially new url_path or null
    if (description !== undefined) updateData.description = description;

    // Zod schema (updateCategorySchema) with .refine() already handles this check
    // This check can be kept as a fail-safe or removed if confident in Zod
    if (Object.keys(updateData).length === 0) {
        return _next(new ApiError(400, "No data provided for update."));
    }

    const updatedCategory = await categoryService.updateCategory(id, updateData);
    if (!updatedCategory) {
        return _next(new ApiError(404, "No category found with that ID to update"));
    }
    res.status(200).json(JSend.success({ category: updatedCategory }));
});

const getAllCategories = catchAsync(async (req, res, _next) => {
    const filters = req.query; // Query has been validated and coerced by Zod
    const { categories, totalItems, currentPage, totalPages, limit } = await categoryService.getAllCategories(filters);
    res.status(200).json(JSend.success({
        categories,
        metadata: {
            totalRecords: totalItems,
            currentPage,
            totalPages,
            firstPage: 1,
            lastPage: totalPages,
            limit: limit
        }
    }));
});

const getCategoryById = catchAsync(async (req, res, _next) => {
    const category = await categoryService.getCategoryById(req.params.id); 
    if (!category) return _next(new ApiError(404, "No category found with that ID"));
    res.status(200).json(JSend.success({ category }));
});

const deleteCategory = catchAsync(async (req, res, _next) => {
    const deleted = await categoryService.deleteCategory(req.params.id); 
    if (!deleted) return _next(new ApiError(404, "No category found with that ID to delete"));
    res.status(204).json(JSend.success());
});

const deleteAllCategories = catchAsync(async (req, res, _next) => {
    await categoryService.deleteAllCategories();
    res.status(204).json(JSend.success());
});

module.exports = {
    createCategory,
    getAllCategories,
    getCategoryById,
    updateCategory,
    deleteCategory,
    deleteAllCategories,
};