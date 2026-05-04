import "dotenv/config";
import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import bodyParser from "body-parser";
import prisma from "./config/dbConfig.js";

import { verifyToken } from "./middlewares/authMiddleware.js";

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

app.use(helmet());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10000,
  message: { message: "TOO_MANY_REQUESTS" },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use("/api/", limiter);

const PORT = process.env.PORT || 3000;

app.use((req, res, next) => {
  const origin = req.headers.origin;

  const allowedOrigins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3001",
    "https://ptech-six.vercel.app",
  ];

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

  if (req.method === "OPTIONS") {
    return allowedOrigins.includes(origin)
      ? res.status(200).end()
      : res.status(403).end();
  }

  next();
});

app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.status(200).send("Hello world");
});

app.use("/api/auth", authRouter);

app.use("/api/devises", verifyToken, deviseRoutes);
app.use("/api/comptes", verifyToken, compteRoutes);
app.use("/api/depenses", verifyToken, depenseRoutes);
app.use("/api/produits", verifyToken, produitRoutes);
app.use("/api/commandes", verifyToken, commandeRoutes);
app.use("/api/emprunts", verifyToken, empruntRoutes);
app.use("/api/voyages", verifyToken, voyageRoutes);
app.use("/api/transferts", verifyToken, transfertRoutes);

app.use((req, res, next) => {
  res.status(404).json({ message: "Route not found" });
});

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
