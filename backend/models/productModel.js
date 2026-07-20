const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    description: {
        type: String
    },
    imageURL: { // URL for the image uploaded via Multer
        type: String,
        default: null
    },
    status: {
        type: String,
        enum: ['חשוף', 'מוסתר'], // Public or Hidden
        default: 'מוסתר'
    },
    supplierId: { // Optional: Link to the Supplier User
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    }
});

module.exports = mongoose.model('Product', ProductSchema);