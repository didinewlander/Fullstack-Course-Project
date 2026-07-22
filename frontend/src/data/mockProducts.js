// this is FAKE/mock product data, just so we can build the catalog UI
// TODO: replace this with a real API call once issue #10 (backend) is ready
// each product has: id, name, price, image (just an emoji for now), stock
const mockProducts = [
  { id: 1, name: "Wireless Mouse", price: 15.99, image: "🖱️", stock: 40 },
  { id: 2, name: "Mechanical Keyboard", price: 49.99, image: "⌨️", stock: 25 },
  { id: 3, name: "USB-C Cable", price: 6.5, image: "🔌", stock: 120 },
  { id: 4, name: "Laptop Stand", price: 22.0, image: "💻", stock: 15 },
  { id: 5, name: "HD Webcam", price: 35.0, image: "📷", stock: 8 },
  { id: 6, name: "Desk Lamp", price: 18.75, image: "💡", stock: 30 },
  { id: 7, name: "Office Chair", price: 120.0, image: "🪑", stock: 5 },
  { id: 8, name: "Notebook Pack", price: 9.99, image: "📓", stock: 60 },
];

export default mockProducts;
