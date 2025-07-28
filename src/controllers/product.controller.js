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
    let image_url;

    if (uploadedFile) {
        image_url = `/public/image/products/${uploadedFile.filename}`;
    } else if (req.body.image_url) {
        image_url = req.body.image_url;
    } else {
        return next(new ApiError(400, "Product image is required (either as a file upload or a URL)."));
    }

    const { type, name, description, price, stock, category_id } = req.body;

    // Validate category
    if (category_id !== undefined && category_id !== null) {
        const categoryExists = await categoryService.getCategoryById(category_id);
        if (!categoryExists) {
            if (uploadedFile) {
                await fs.unlink(uploadedFile.path); // Clean up uploaded file
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

    // 2. Safely construct update object
    const updateData = {};
    const validFields = ['type', 'name', 'description', 'price', 'stock', 'available', 'category_id'];
    validFields.forEach(field => {
        if (req.body[field] !== undefined) {
            updateData[field] = req.body[field];
        }
    });

    // 3. Handle image update logic
    const isOldImageLocal = oldProduct.image_url && oldProduct.image_url.startsWith('/public/image/products/');
    if (uploadedFile) {
        updateData.image_url = `/public/image/products/${uploadedFile.filename}`;
        if (isOldImageLocal) {
            oldImagePath = path.join(__dirname, "../..", oldProduct.image_url);
        }
    } else if (req.body.image_url !== undefined) {
        const newImageUrl = (req.body.image_url === '' || req.body.image_url === null) ? null : req.body.image_url;
        if (newImageUrl !== oldProduct.image_url) {
            updateData.image_url = newImageUrl;
            if (isOldImageLocal) {
                oldImagePath = path.join(__dirname, "../..", oldProduct.image_url);
            }
        }
    }

    // 4. Handle boolean 'available' field from FormData
    if (updateData.available !== undefined) {
        updateData.available = String(updateData.available).toLowerCase() === 'true';
    }

    // 5. Validate category if it's being updated
    if (updateData.category_id !== undefined && updateData.category_id !== null) {
        const categoryExists = await categoryService.getCategoryById(updateData.category_id);
        if (!categoryExists) {
            if (uploadedFile) await fs.unlink(uploadedFile.path);
            return next(new ApiError(404, "Category not found."));
        }
    }

    // 6. Perform update if there's data to update
    if (Object.keys(updateData).length === 0) {
        return res.status(200).json(JSend.success({ product: oldProduct, message: "No changes detected." }));
    }

    updateData.updated_at = new Date();
    const updatedProduct = await productService.updateProduct(id, updateData);

    if (updatedProduct && oldImagePath) {
        try {
            await fs.unlink(oldImagePath);
        } catch (err) {
            console.error(`Failed to delete old product image file: ${oldImagePath}`, err);
        }
    }
    
    return res.status(200).json(JSend.success({ product: updatedProduct }));
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
