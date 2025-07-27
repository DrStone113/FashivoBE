// C:\DVWEB\mergre\ct313hm02-project-DrStone113\backend-api\src\controllers\product.controller.js
const JSend = require("../jsend");
const ApiError = require("../api-error");
const catchAsync = require("../catchAsync");
const productService = require("../services/product.service");
const categoryService = require("../services/category.service");
const fs = require("fs").promises; // For file system operations
const path = require("path"); // For path manipulation

const createProduct = catchAsync(async (req, res, next) => {
    let image_url = null;
    if (req.file) {
        image_url = `/public/image/products/${req.file.filename}`; // <-- SỬA TỪ 'img' THÀNH 'image'
    } else {
        return next(new ApiError(400, "Product image is required!"));
    }

    const { type, name, description, price, stock, category_id } = req.body;

    if (category_id !== undefined && category_id !== null) {
        const categoryExists = await categoryService.getCategoryById(category_id);
        if (!categoryExists) {
            if (req.file) {
                await fs.unlink(req.file.path);
            }
            return next(new ApiError(404, "Category not found."));
        }
    }

    const productData = {
        type,
        name,
        description,
        price,
        stock,
        available: true,
        image_url,
        category_id,
    };

    const newProduct = await productService.createProduct(productData);
    return res.status(201).json(JSend.success({ product: newProduct }));
});

const updateProduct = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    let image_url = undefined;
    let oldImagePath = null;

    const oldProduct = await productService.getProductById(id);
    if (!oldProduct) {
        if (req.file) {
            try {
                await fs.unlink(req.file.path);
            } catch (unlinkErr) {
                console.error(`Failed to delete newly uploaded file due to product not found: ${req.file.path}`, unlinkErr);
            }
        }
        return next(new ApiError(404, "No product found with that ID to update"));
    }

    if (req.file) {
        image_url = `/public/image/products/${req.file.filename}`; // <-- SỬA TỪ 'img' THÀNH 'image'
        if (oldProduct.image_url && oldProduct.image_url.includes("/public/image/products/product-")) { // <-- SỬA TỪ 'img' THÀNH 'image'
            oldImagePath = path.join(__dirname, "../..", oldProduct.image_url);
        }
    } else if (req.body.image_url === '') {
        image_url = null;
        if (oldProduct.image_url && oldProduct.image_url.includes("/public/image/products/product-")) { // <-- SỬA TỪ 'img' THÀNH 'image'
            oldImagePath = path.join(__dirname, "../..", oldProduct.image_url);
        }
    }

    const { type, name, description, price, stock, available, category_id } = req.body;

    const updateData = {
        type,
        name,
        description,
        price,
        stock,
        available,
        image_url,
        category_id,
    };

    Object.keys(updateData).forEach(
        (key) => updateData[key] === undefined && delete updateData[key]
    );

    if (updateData.category_id !== undefined && updateData.category_id !== null) {
        const categoryExists = await categoryService.getCategoryById(
            updateData.category_id
        );
        if (!categoryExists) {
            if (req.file) {
                try {
                    await fs.unlink(req.file.path);
                } catch (unlinkErr) {
                    console.error(`Failed to delete newly uploaded file due to invalid category: ${req.file.path}`, unlinkErr);
                }
            }
            return next(new ApiError(404, "Category not found."));
        }
    }

    const updatedProduct = await productService.updateProduct(id, updateData);

    if (updatedProduct) {
        if (oldImagePath) {
            try {
                await fs.unlink(oldImagePath); 
                console.log(`Successfully deleted old image: ${oldImagePath}`);
            } catch (err) {
                if (err.code === 'ENOENT') {
                    console.warn(`Old image file not found at ${oldImagePath}, skipping deletion.`);
                } else {
                    console.error(`Failed to delete old product image file: ${oldImagePath}`, err);
                    throw err;
                }
            }
        }
        res.status(200).json(JSend.success({ product: updatedProduct }));
    } else {
        return next(new ApiError(404, "No product found with that ID to update"));
    }
});

const getAllProducts = catchAsync(async (req, res, _next) => {
    const filters = req.query;
    const { products, totalItems, currentPage, totalPages, limit } =
        await productService.getAllProducts(filters);
    res.status(200).json(
        JSend.success({
            products,
            metadata: {
                totalRecords: totalItems,
                currentPage,
                totalPages,
                firstPage: 1,
                lastPage: totalPages,
                limit: limit,
            },
        })
    );
});

const getProductById = catchAsync(async (req, res, _next) => {
    const product = await productService.getProductById(req.params.id);
    if (!product)
        return _next(new ApiError(404, "No product found with that ID"));
    res.status(200).json(JSend.success({ product }));
});

const deleteProduct = catchAsync(async (req, res, _next) => {
    const productId = req.params.id;
    const product = await productService.getProductById(productId);

    if (product) {
        const deleted = await productService.deleteProduct(productId);
        if (!deleted) {
            return _next(
                new ApiError(500, "Failed to delete product from database.")
            );
        }
        if (
            product.image_url &&
            product.image_url.includes("/public/image/products/product-") // <-- SỬA TỪ 'img' THÀNH 'image'
        ) {
            const imageFilePath = path.join(__dirname, "../..", product.image_url);
            try {
                await fs.unlink(imageFilePath);
            } catch (err) {
                if (err.code === 'ENOENT') {
                    console.warn(`Image file not found during product deletion, skipping: ${imageFilePath}`);
                } else {
                    console.error(`Failed to delete product image file: ${imageFilePath}`, err);
                }
            }
        }
        res.status(204).json(JSend.success());
    } else {
        return _next(new ApiError(404, "No product found with that ID to delete"));
    }
});

const deleteAllProducts = catchAsync(async (req, res, _next) => {
    const allProducts = await productService.getAllProducts({});
    const imagePathsToDelete = allProducts.products
        .filter(
            (product) =>
                product.image_url &&
                product.image_url.includes("/public/image/products/product-") // <-- SỬA TỪ 'img' THÀNH 'image'
        )
        .map((product) => path.join(__dirname, "../..", product.image_url));

    await productService.deleteAllProducts();

    for (const filePath of imagePathsToDelete) {
        try {
            await fs.unlink(filePath);
        } catch (err) {
            if (err.code === 'ENOENT') {
                console.warn(`Image file not found during deleteAllProducts, skipping: ${filePath}`);
            } else {
                console.error(`Failed to delete product image file during deleteAllProducts: ${filePath}`, err);
            }
        }
    }

    res.status(204).json(JSend.success());
});

module.exports = {
    createProduct,
    updateProduct,
    getAllProducts,
    getProductById,
    deleteProduct,
    deleteAllProducts,
};
