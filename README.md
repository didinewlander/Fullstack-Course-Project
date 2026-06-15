# Do-Hook-In

A full-stack inventory management application built for managing international
delivery workflows between suppliers, vendors, and warehouse logistics managers.

Built as part of the Advanced Full-Stack course, in relation to our dual
curriculum degree in Logistics Management.

---

## The Application

Do-Hook-In serves as the backbone of a warehouse operation that handles
international deliveries. It connects three key roles along the supply chain:
**Logistics Managers**, **Vendors**, and **Suppliers**, giving each party a
tailored experience with the information and tools relevant to them.

---

## Core Features

### 1. 🏭 Logistics Manager Dashboard

The system administrator has full visibility over the warehouse:

- Live status overview of all products coming in and out
- Manage and monitor all active orders and deliveries
- Configure notification events for the entire system

### 2. 🛒 Vendor Dashboard

Vendors can log in and manage their orders from the warehouse:

- Browse and order available products
- View pricing breakdowns and calculations per order
- Track the status of their orders in real time

### 3. 🚚 Supplier Dashboard

Suppliers can log in and manage their active deliveries:

- Report a delivery as in-progress
- Update delivery location and current status
- Add additional fees to the final bill the warehouse will need to pay

### 4. 🔔 Notifications

Each user is notified about events relevant to them:

- **Logistics Manager** — configurable notification events across the system
- **Vendor** — notified when their ordered products are being processed
- **Supplier** — notified when their delivery has been fully processed
- **Warehouse** — notified when a delivery is one day away

### 5. 📦 Order Lifecycle

Every order moves through a clear, trackable status flow visible to all
relevant parties:

`Pending` → `Approved` → `In Transit` → `Arriving Soon` → `Delivered` → `Billed`

### 6. 📊 Reports, Analytics & Invoices

- Inventory and order analytics for the logistics manager
- Cost and pricing reports across orders and deliveries
- Invoice generation per order

---

## User Roles

| Role              | Description                                                         |
| ----------------- | ------------------------------------------------------------------- |
| Logistics Manager | Full system access, warehouse oversight, notification configuration |
| Vendor            | Orders products, tracks order status, views pricing                 |
| Supplier          | Reports and updates deliveries, adds fees to orders                 |

---

## Tech Stack

### Backend

- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** MongoDB with Mongoose
- **Auth:** JWT-based authentication
- **File Uploads:** Multer

### Frontend

- **Framework:** React (SPA)
- **State Management:** Redux + Context API
- **HTTP Client:** Axios

---

## Getting Started

> ⚠️ Setup instructions coming soon.

---

## Team

> Efrat
> Jessie
> Tehila
> Yedidya

---

## License

This project is for academic purposes only.