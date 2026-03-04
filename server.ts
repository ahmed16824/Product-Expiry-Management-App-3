import express from "express";
import { createServer as createViteServer } from "vite";
import cors from "cors";
import bodyParser from "body-parser";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(bodyParser.json({ limit: '50mb' }));

  // In-memory store for demo purposes (In a real app, use a database like MongoDB or PostgreSQL)
  // Since we want to sync across devices, we need a central store.
  let globalData = {
    products: [] as any[],
    scannableProducts: [] as any[],
    users: [] as any[],
  };

  // API Routes
  app.get("/api/data", (req, res) => {
    res.json(globalData);
  });

  app.post("/api/sync", (req, res) => {
    const { products, scannableProducts, users } = req.body;
    
    // Simple merge logic: for users and scannable products, we keep unique ones.
    // For products, we might need more complex logic, but for now, let's just replace or merge.
    if (products) globalData.products = products;
    if (scannableProducts) globalData.scannableProducts = scannableProducts;
    if (users) globalData.users = users;

    res.json({ status: "ok", message: "Data synced successfully" });
  });

  app.post("/api/users", (req, res) => {
    const user = req.body;
    const index = globalData.users.findIndex(u => u.id === user.id);
    if (index !== -1) {
      globalData.users[index] = user;
    } else {
      globalData.users.push(user);
    }
    res.json({ status: "ok" });
  });

  app.delete("/api/users/:id", (req, res) => {
    globalData.users = globalData.users.filter(u => u.id !== req.params.id);
    res.json({ status: "ok" });
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

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
