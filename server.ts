import express from "express";
import { createServer as createViteServer } from "vite";
import cors from "cors";
import bodyParser from "body-parser";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs/promises";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_FILE = path.join(__dirname, "server_data.json");

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(bodyParser.json({ limit: '50mb' }));

  // In-memory store backed by file
  let globalData = {
    products: [] as any[],
    scannableProducts: [] as any[],
    users: [] as any[],
  };

  // Load data from file on startup
  try {
    const fileContent = await fs.readFile(DATA_FILE, 'utf-8');
    globalData = JSON.parse(fileContent);
    console.log("Loaded data from disk");
  } catch (error) {
    console.log("No existing data file, starting with empty store");
  }

  const saveData = async () => {
    try {
      await fs.writeFile(DATA_FILE, JSON.stringify(globalData, null, 2));
    } catch (error) {
      console.error("Failed to save data to disk", error);
    }
  };

  // API Routes
  app.get("/api/data", (req, res) => {
    res.json(globalData);
  });

  app.post("/api/sync", async (req, res) => {
    const { products, scannableProducts, users } = req.body;
    
    // Merge Logic
    if (users && Array.isArray(users)) {
        const userMap = new Map(globalData.users.map(u => [u.id, u]));
        users.forEach(u => userMap.set(u.id, u));
        globalData.users = Array.from(userMap.values());
    }

    if (scannableProducts && Array.isArray(scannableProducts)) {
        // Key for scannable products is usually code + organizationId
        const productMap = new Map(globalData.scannableProducts.map(p => [`${p.organizationId}-${p.code}`, p]));
        scannableProducts.forEach(p => productMap.set(`${p.organizationId}-${p.code}`, p));
        globalData.scannableProducts = Array.from(productMap.values());
    }

    if (products && Array.isArray(products)) {
        const productMap = new Map(globalData.products.map(p => [p.id, p]));
        products.forEach(p => productMap.set(p.id, p));
        globalData.products = Array.from(productMap.values());
    }

    await saveData();
    res.json({ status: "ok", message: "Data synced and merged successfully" });
  });

  app.post("/api/users", async (req, res) => {
    const user = req.body;
    const index = globalData.users.findIndex(u => u.id === user.id);
    if (index !== -1) {
      globalData.users[index] = user;
    } else {
      globalData.users.push(user);
    }
    await saveData();
    res.json({ status: "ok" });
  });

  app.delete("/api/users/:id", async (req, res) => {
    globalData.users = globalData.users.filter(u => u.id !== req.params.id);
    await saveData();
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
