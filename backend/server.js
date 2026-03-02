import "dotenv/config";
import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import prisma from "./config/dbConfig.js";

import deviseRoutes from "./routes/deviseRouter.js";
import compteRoutes from "./routes/compteRouter.js";
import depenseRoutes from "./routes/depenseRouter.js";
import produitRoutes from "./routes/produitRouter.js";
import commandeRoutes from "./routes/commandeRouter.js";
import empruntRoutes from "./routes/empruntRoutes.js"

const app = express();
const PORT = process.env.PORT || 3000;

// middleware
app.use(
  cors({
    //origin: "http://localhost:3000",
	origin: true,
    credentials: true,
  })
);
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Test routes
app.get("/", (req, res) => {
  res.status(200).send("Hello world");
});

// Routes
app.use("/api/devises", deviseRoutes);
app.use("/api/comptes", compteRoutes);
app.use("/api/depenses", depenseRoutes);
app.use("/api/produits", produitRoutes);
app.use("/api/commandes", commandeRoutes);
app.use("/api/emprunts", empruntRoutes);

// Gestion des erreurs 404
app.use((req, res, next) => {
  res.status(404).json({ message: "Route not found" });
});

// Gestionnaire d'erreurs global
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: "Something went wrong" });
});

prisma
  .$connect()
  .then(() => {
    console.log("Connected to the database");
  })
  .catch((error) => {
    console.error("Database connection error:", error.message);
  });

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
