import "dotenv/config";
import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import prisma from "./config/dbConfig.js";

import authRouter from "./routes/authRouter.js";
import deviseRoutes from "./routes/deviseRouter.js";
import compteRoutes from "./routes/compteRouter.js";
import depenseRoutes from "./routes/depenseRouter.js";
import produitRoutes from "./routes/produitRouter.js";
import commandeRoutes from "./routes/commandeRouter.js";
import empruntRoutes from "./routes/empruntRoutes.js";
import voyageRoutes from "./routes/voyageRouter.js";
import transfertRoutes from "./routes/transfertRouter.js";

const app = express();
const PORT = process.env.PORT || 3000;

// middleware
// app.use(
//   cors({
//     //origin: "http://localhost:3000",
// 	origin: true,
//     credentials: true,
//   })
// );

// Middleware CORS sécurisé avec Liste Blanche
app.use((req, res, next) => {
  const origin = req.headers.origin;

  // Liste blanche : SEULES ces adresses peuvent parler à ton backend
  const allowedOrigins = [
    "http://localhost:3000", // Ton Frontend local (PC Maison / Travail)
    "http://127.0.0.1:3000", // Alternative locale courante
    "http://localhost:3001",
  ];

  // Vérification stricte
  if (allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader(
      "Access-Control-Allow-Methods",
      "GET, POST, PUT, DELETE, PATCH, OPTIONS",
    );
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, X-Requested-With, Accept",
    );
  }

  // Validation de la requête de pré-vérification (Preflight)
  if (req.method === "OPTIONS") {
    // Si l'origine est autorisée, on renvoie 200, sinon le navigateur bloquera la suite
    return allowedOrigins.includes(origin)
      ? res.status(200).end()
      : res.status(403).end();
  }

  next();
});

app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Test routes
app.get("/", (req, res) => {
  res.status(200).send("Hello world");
});

// Routes
app.use("/api/auth", authRouter);
app.use("/api/devises", deviseRoutes);
app.use("/api/comptes", compteRoutes);
app.use("/api/depenses", depenseRoutes);
app.use("/api/produits", produitRoutes);
app.use("/api/commandes", commandeRoutes);
app.use("/api/emprunts", empruntRoutes);
app.use("/api/voyages", voyageRoutes);
app.use("/api/transferts", transfertRoutes);

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
