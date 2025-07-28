// C:\DVWEB\mergre\ct313hm02-project-DrStone113\backend-api\src\controllers\product.controller.js
const JSend = require("../jsend");
const ApiError = require("../api-error");
const catchAsync = require("../catchAsync");
const productService = require("../services/product.service");
const categoryService = require("../services/category.service");
const fs = require("fs").promises; // For file system operations
const path = require("path"); // For path manipulation

const createProduct = catchAsync(async (req, res, next) => {
    const uploadedFile = (req.files && req.files.length > 0) ? req.files[0] : null;

    if (!uploadedFile) {
        // Only file uploads are accepted for creating products.
        return next(new ApiError(400, "Product image file is required."));
    }
    
    const image_url = `/public/image/products/${uploadedFile.filename}`;
    const { type, name, description, price, stock, category_id } = req.body;

    // Validate category
    if (category_id !== undefined && category_id !== null) {
        const categoryExists = await categoryService.getCategoryById(category_id);
        if (!categoryExists) {
            // Clean up uploaded file if category is invalid
            await fs.unlink(uploadedFile.path);
            return next(new ApiError(404, "Category not found."));
        }
    }

    const productData = {
        type,
        name,
        description,
        price,
        stock,
        available: req.body.available !== undefined ? (String(req.body.available).toLowerCase() === 'true') : true,
        image_url,
        category_id,
        updated_at: new Date(),
    };

    const newProduct = await productService.createProduct(productData);
    return res.status(201).json(JSend.success({ product: newProduct }));
});



const updateProduct = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const uploadedFile = (req.files && req.files.length > 0) ? req.files[0] : null;
    let oldImagePath = null;

    // 1. Fetch existing product
    const oldProduct = await productService.getProductById(id);
    if (!oldProduct) {
        if (uploadedFile) await fs.unlink(uploadedFile.path);
        return next(new ApiError(404, "No product found with that ID to update"));
    }

    // 2. Safely construct update object from valid fields
    const updateData = {};
    const validFields = ['type', 'name', 'description', 'price', 'stock', 'available', 'category_id'];
    validFields.forEach(field => {
        if (req.body[field] !== undefined) {
            updateData[field] = req.body[field];
        }
    });

    // 3. Handle image update logic - ONLY from file upload
    if (uploadedFile) {
        updateData.image_url = `/public/image/products/${uploadedFile.filename}`;
        const isOldImageLocal = oldProduct.image_url && oldProduct.image_url.startsWith('/public/image/products/');
        if (isOldImageLocal) {
            oldImagePath = path.join(__dirname, "../..", oldProduct.image_url);
        }
    }
    // NOTE: We no longer check for req.body.image_url

    // 4. Handle boolean 'available' field from FormData
    if (updateData.available !== undefined) {
        updateData.available = String(updateData.available).toLowerCase() === 'true';
    }

    // 5. Validate category if it's being updated
    if (updateData.category_id !== undefined && updateData.category_id !== null) {
        const categoryExists = await categoryService.getCategoryById(updateData.category_id);
        if (!categoryExists) {
            if (uploadedFile) await fs.unlink(uploadedFile.path); // Clean up file if category is bad
            return next(new ApiError(404, "Category not found."));
        }
    }

    // 6. Perform update only if there's data to update
    if (Object.keys(updateData).length === 0) {
        return res.status(200).json(JSend.success({ product: oldProduct, message: "No changes detected." }));
    }

    updateData.updated_at = new Date();
    const updatedProduct = await productService.updateProduct(id, updateData);

    // 8. If update is successful, delete the old image file if necessary
    if (updatedProduct && oldImagePath) {
        try {
            await fs.unlink(oldImagePath);
        } catch (err) {
            console.error(`Failed to delete old product image file: ${oldImagePath}`, err);
        }
    }
    
    return res.status(200).json(JSend.success({ product: updatedProduct }));
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
