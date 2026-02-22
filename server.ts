import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const db = new Database("market.db");
const JWT_SECRET = process.env.JWT_SECRET || "super-secret-key";

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT,
    role TEXT DEFAULT 'user'
  );

  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    description TEXT,
    price REAL,
    image_url TEXT,
    category TEXT
  );

  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    total_price REAL,
    status TEXT DEFAULT 'Pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER,
    product_id INTEGER,
    quantity INTEGER,
    price REAL,
    FOREIGN KEY(order_id) REFERENCES orders(id),
    FOREIGN KEY(product_id) REFERENCES products(id)
  );
`);

// Seed Admin and initial products if empty
const userCount = db.prepare("SELECT count(*) as count FROM users").get() as { count: number };
if (userCount.count === 0) {
  const hashedPassword = bcrypt.hashSync("admin123", 10);
  db.prepare("INSERT INTO users (username, password, role) VALUES (?, ?, ?)").run("admin", hashedPassword, "admin");
}

const productCount = db.prepare("SELECT count(*) as count FROM products").get() as { count: number };
if (productCount.count === 0) {
  const initialProducts = [
    // Perfume
    { name: "Rose Elegance Perfume", description: "Luxurious rose-scented perfume with floral notes.", price: 79.99, image_url: "https://picsum.photos/seed/perfume1/400/300", category: "Perfume" },
    { name: "Fresh Bloom Fragrance", description: "Light and fresh floral perfume for daily wear.", price: 59.99, image_url: "https://picsum.photos/seed/perfume2/400/300", category: "Perfume" },
    { name: "Velvet Night Perfume", description: "Sensual and mysterious oriental fragrance.", price: 89.99, image_url: "https://picsum.photos/seed/perfume3/400/300", category: "Perfume" },
    { name: "Citrus Splash Cologne", description: "Zesty citrus fragrance with a hint of mint.", price: 49.99, image_url: "https://picsum.photos/seed/perfume4/400/300", category: "Perfume" },
    
    // Clothes
    { name: "Pink Floral Dress", description: "Elegant pink dress with floral pattern.", price: 49.99, image_url: "https://picsum.photos/seed/dress1/400/300", category: "Clothes" },
    { name: "Stylish Denim Jacket", description: "Classic denim jacket with modern fit.", price: 69.99, image_url: "https://picsum.photos/seed/jacket1/400/300", category: "Clothes" },
    { name: "Comfy Sweatshirt", description: "Soft and cozy sweatshirt for casual wear.", price: 39.99, image_url: "https://picsum.photos/seed/sweatshirt1/400/300", category: "Clothes" },
    { name: "Elegant Blouse", description: "Formal blouse with lace details.", price: 45.99, image_url: "https://picsum.photos/seed/blouse1/400/300", category: "Clothes" },
    
    // Phone
    { name: "Smartphone Pro", description: "Latest smartphone with advanced camera system.", price: 999.99, image_url: "https://picsum.photos/seed/phone1/400/300", category: "Phone" },
    { name: "Budget Smartphone", description: "Affordable smartphone with essential features.", price: 299.99, image_url: "https://picsum.photos/seed/phone2/400/300", category: "Phone" },
    { name: "Gaming Phone", description: "High-performance phone optimized for gaming.", price: 799.99, image_url: "https://picsum.photos/seed/phone3/400/300", category: "Phone" },
    { name: "Flip Phone", description: "Classic flip phone with modern features.", price: 199.99, image_url: "https://picsum.photos/seed/phone4/400/300", category: "Phone" },
    
    // Electronics
    { name: "Wireless Earbuds", description: "Premium wireless earbuds with noise cancellation.", price: 149.99, image_url: "https://picsum.photos/seed/earbuds1/400/300", category: "Electronics" },
    { name: "Smartwatch", description: "Fitness tracker and smartwatch in one.", price: 249.99, image_url: "https://picsum.photos/seed/watch1/400/300", category: "Electronics" },
    { name: "Portable Charger", description: "High-capacity portable charger for devices.", price: 39.99, image_url: "https://picsum.photos/seed/charger1/400/300", category: "Electronics" },
    { name: "Bluetooth Speaker", description: "Waterproof Bluetooth speaker with rich sound.", price: 89.99, image_url: "https://picsum.photos/seed/speaker1/400/300", category: "Electronics" },
  ];
  const insertProduct = db.prepare("INSERT INTO products (name, description, price, image_url, category) VALUES (?, ?, ?, ?, ?)");
  initialProducts.forEach(p => insertProduct.run(p.name, p.description, p.price, p.image_url, p.category));
}

async function startServer() {
  const app = express();
  app.use(express.json());

  // Auth Middleware
  const authenticate = (req: any, res: any, next: any) => {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ error: "Unauthorized" });
    try {
      req.user = jwt.verify(token, JWT_SECRET);
      next();
    } catch {
      res.status(401).json({ error: "Invalid token" });
    }
  };

  const isAdmin = (req: any, res: any, next: any) => {
    if (req.user?.role !== "admin") return res.status(403).json({ error: "Forbidden" });
    next();
  };

  // API Routes
  app.post("/api/auth/register", (req, res) => {
    const { username, password } = req.body;
    try {
      const hashedPassword = bcrypt.hashSync(password, 10);
      db.prepare("INSERT INTO users (username, password) VALUES (?, ?)").run(username, hashedPassword);
      res.json({ message: "User registered successfully" });
    } catch (err) {
      res.status(400).json({ error: "Username already exists" });
    }
  });

  app.post("/api/auth/login", (req, res) => {
    const { username, password } = req.body;
    const user = db.prepare("SELECT * FROM users WHERE username = ?").get(username) as any;
    if (user && bcrypt.compareSync(password, user.password)) {
      const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET);
      res.json({ token, user: { id: user.id, username: user.username, role: user.role } });
    } else {
      res.status(401).json({ error: "Invalid credentials" });
    }
  });

  app.get("/api/products", (req, res) => {
    const products = db.prepare("SELECT * FROM products").all();
    res.json(products);
  });

  app.post("/api/products", authenticate, isAdmin, (req, res) => {
    const { name, description, price, image_url, category } = req.body;
    const result = db.prepare("INSERT INTO products (name, description, price, image_url, category) VALUES (?, ?, ?, ?, ?)")
      .run(name, description, price, image_url, category);
    res.json({ id: result.lastInsertRowid });
  });

  app.put("/api/products/:id", authenticate, isAdmin, (req, res) => {
    const { name, description, price, image_url, category } = req.body;
    db.prepare("UPDATE products SET name = ?, description = ?, price = ?, image_url = ?, category = ? WHERE id = ?")
      .run(name, description, price, image_url, category, req.params.id);
    res.json({ message: "Product updated" });
  });

  app.delete("/api/products/:id", authenticate, isAdmin, (req, res) => {
    db.prepare("DELETE FROM products WHERE id = ?").run(req.params.id);
    res.json({ message: "Product deleted" });
  });

  app.post("/api/orders", authenticate, (req: any, res) => {
    const { items, total_price } = req.body;
    const transaction = db.transaction(() => {
      const orderResult = db.prepare("INSERT INTO orders (user_id, total_price) VALUES (?, ?)")
        .run(req.user.id, total_price);
      const orderId = orderResult.lastInsertRowid;
      const insertItem = db.prepare("INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)");
      items.forEach((item: any) => {
        insertItem.run(orderId, item.id, item.quantity, item.price);
      });
      return orderId;
    });
    const orderId = transaction();
    res.json({ id: orderId, message: "Order placed successfully" });
  });

  app.get("/api/orders", authenticate, isAdmin, (req, res) => {
    const orders = db.prepare(`
      SELECT o.*, u.username 
      FROM orders o 
      JOIN users u ON o.user_id = u.id 
      ORDER BY o.created_at DESC
    `).all();
    res.json(orders);
  });

  app.get("/api/orders/my", authenticate, (req: any, res) => {
    const orders = db.prepare("SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC").all(req.user.id);
    const getItems = db.prepare("SELECT oi.*, p.name, p.image_url FROM order_items oi JOIN products p ON p.id = oi.product_id WHERE oi.order_id = ?");
    orders.forEach((o: any) => {
      o.items = getItems.all(o.id);
    });
    res.json(orders);
  });

  app.patch("/api/orders/:id/status", authenticate, isAdmin, (req, res) => {
    const { status } = req.body;
    db.prepare("UPDATE orders SET status = ? WHERE id = ?").run(status, req.params.id);
    res.json({ message: "Order status updated" });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  const PORT = 3000;
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();