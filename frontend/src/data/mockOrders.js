// this is FAKE/mock order data, just so we can build the orders UI (issue #12)
// TODO: replace this with a real API call once issue #15 (backend orders) is ready
// dates are computed relative to "now" so the seeded orders never go stale
const now = Date.now();
const hoursFromNow = (hours) => new Date(now + hours * 60 * 60 * 1000).toISOString();

const mockOrders = [
  {
    id: 1,
    vendorEmail: "vendor@example.com",
    vendorName: "vendor",
    items: [
      { productId: 1, name: "Wireless Mouse", price: 15.99, quantity: 10 },
      { productId: 3, name: "USB-C Cable", price: 6.5, quantity: 20 },
    ],
    pickupDate: hoursFromNow(16), // near future, exercises the cancel penalty warning
    status: "Pending",
    createdAt: hoursFromNow(-2),
  },
  {
    id: 2,
    vendorEmail: "vendor@example.com",
    vendorName: "vendor",
    items: [{ productId: 2, name: "Mechanical Keyboard", price: 49.99, quantity: 5 }],
    pickupDate: hoursFromNow(96), // far future, no penalty
    status: "Pending",
    createdAt: hoursFromNow(-1),
  },
  {
    id: 3,
    vendorEmail: "vendor@example.com",
    vendorName: "vendor",
    items: [{ productId: 4, name: "Laptop Stand", price: 22.0, quantity: 8 }],
    pickupDate: hoursFromNow(10), // near future, approved order about to trigger penalty
    status: "Approved",
    createdAt: hoursFromNow(-30),
  },
  {
    id: 4,
    vendorEmail: "vendor@example.com",
    vendorName: "vendor",
    items: [{ productId: 5, name: "HD Webcam", price: 35.0, quantity: 3 }],
    pickupDate: hoursFromNow(240), // far future, clean cancel
    status: "Approved",
    createdAt: hoursFromNow(-48),
  },
  {
    id: 5,
    vendorEmail: "vendor@example.com",
    vendorName: "vendor",
    items: [{ productId: 6, name: "Desk Lamp", price: 18.75, quantity: 12 }],
    pickupDate: hoursFromNow(-20),
    status: "In Transit",
    createdAt: hoursFromNow(-72),
  },
  {
    id: 6,
    vendorEmail: "vendor@example.com",
    vendorName: "vendor",
    items: [{ productId: 7, name: "Office Chair", price: 120.0, quantity: 2 }],
    pickupDate: hoursFromNow(-10),
    status: "Arriving Soon",
    createdAt: hoursFromNow(-96),
  },
  {
    id: 7,
    vendorEmail: "vendor@example.com",
    vendorName: "vendor",
    items: [{ productId: 8, name: "Notebook Pack", price: 9.99, quantity: 30 }],
    pickupDate: hoursFromNow(-100),
    status: "Delivered",
    createdAt: hoursFromNow(-150),
  },
  {
    id: 8,
    vendorEmail: "vendor@example.com",
    vendorName: "vendor",
    items: [{ productId: 1, name: "Wireless Mouse", price: 15.99, quantity: 15 }],
    pickupDate: hoursFromNow(-200),
    status: "Billed",
    createdAt: hoursFromNow(-250),
  },
  {
    id: 9,
    vendorEmail: "vendor@example.com",
    vendorName: "vendor",
    items: [{ productId: 3, name: "USB-C Cable", price: 6.5, quantity: 40 }],
    pickupDate: hoursFromNow(-5),
    status: "Cancelled",
    createdAt: hoursFromNow(-40),
  },
];

export default mockOrders;
