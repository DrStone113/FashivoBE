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
    let oldImagePath = null;

    // 1. Fetch the existing product
    const oldProduct = await productService.getProductById(id);
    if (!oldProduct) {
        // If product doesn't exist, delete any uploaded file to prevent orphans
        if (req.file) {
            try {
                await fs.unlink(req.file.path);
            } catch (unlinkErr) {
                console.error(`Failed to delete newly uploaded file for non-existent product: ${req.file.path}`, unlinkErr);
            }
        }
        return next(new ApiError(404, "No product found with that ID to update"));
    }

    // 2. Prepare the data for update, starting with the request body
    const updateData = { ...req.body };

    // 3. Handle image update logic
    const isOldImageLocal = oldProduct.image_url && oldProduct.image_url.startsWith('/public/image/products/');
    
    if (req.file) {
        // Case 1: A new file is uploaded, this takes precedence.
        updateData.image_url = `/public/image/products/${req.file.filename}`;
        if (isOldImageLocal) {
            oldImagePath = path.join(__dirname, "../..", oldProduct.image_url);
        }
    } else if (req.body.image_url !== undefined) {
        // Case 2: image_url is provided in the body (can be a new URL, an empty string, or the same URL)
        if (req.body.image_url === null || req.body.image_url === '') {
            // User wants to remove the image
            updateData.image_url = null;
        } else {
            // User provided a new URL
            updateData.image_url = req.body.image_url;
        }
        
        // If the image is changing and the old one was local, mark it for deletion.
        if (updateData.image_url !== oldProduct.image_url && isOldImageLocal) {
            oldImagePath = path.join(__dirname, "../..", oldProduct.image_url);
        }
    }

    // 4. Handle boolean 'available' field from FormData (which sends strings)
    if (updateData.available !== undefined) {
        updateData.available = String(updateData.available).toLowerCase() === 'true';
    }

    // 5. Remove any keys that are undefined to avoid overwriting with nulls unnecessarily
    Object.keys(updateData).forEach(
        (key) => updateData[key] === undefined && delete updateData[key]
    );

    // 6. Validate category if it's being updated
    if (updateData.category_id !== undefined && updateData.category_id !== null) {
        const categoryExists = await categoryService.getCategoryById(updateData.category_id);
        if (!categoryExists) {
            // If category is invalid, delete any newly uploaded file
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

    // 7. Perform the update in the database
    const updatedProduct = await productService.updateProduct(id, updateData);

    // 8. If update is successful, delete the old image file if necessary
    if (updatedProduct && oldImagePath) {
        try {
            await fs.unlink(oldImagePath); 
            console.log(`Successfully deleted old image: ${oldImagePath}`);
        } catch (err) {
            if (err.code === 'ENOENT') {
                console.warn(`Old image file not found at ${oldImagePath}, skipping deletion.`);
            } else {
                // Log the error but don't fail the request since the product was updated
                console.error(`Failed to delete old product image file: ${oldImagePath}`, err);
            }
        }
    }
    
    // 9. Send success response
    if (!updatedProduct) {
        return next(new ApiError(404, "No product found with that ID to update"));
    }
    res.status(200).json(JSend.success({ product: updatedProduct }));
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
