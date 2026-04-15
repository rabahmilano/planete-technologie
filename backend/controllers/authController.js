import prisma from "../config/dbConfig.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { body, validationResult } from "express-validator";
import { getMaxValue } from "../config/utils.js";

const generateTokens = (user) => {
  const accessToken = jwt.sign(
    { id: user.id_user, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "15m" },
  );

  const refreshToken = jwt.sign(
    { id: user.id_user },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: "7d" },
  );

  return { accessToken, refreshToken };
};

export const register = [
  body("email").isEmail().normalizeEmail(),
  body("password").isLength({ min: 6 }),
  body("nom_complet").notEmpty().trim(),

  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, nom_complet, role, avatar } = req.body;

    try {
      const existingUser = await prisma.utilisateur.findUnique({
        where: { email },
      });

      if (existingUser) {
        return res.status(400).json({ message: "EMAIL_EXISTS" });
      }

      const hashedPassword = await bcrypt.hash(password, 14);
      const newUserId = await getMaxValue("utilisateur", "id_user", null);

      const newUser = await prisma.utilisateur.create({
        data: {
          id_user: newUserId,
          email,
          password: hashedPassword,
          nom_complet,
          role: role || "USER",
          avatar: avatar || null,
        },
      });

      const { accessToken, refreshToken } = generateTokens(newUser);

      await prisma.utilisateur.update({
        where: { id_user: newUserId },
        data: { refresh_token: refreshToken },
      });

      const userObj = {
        id: newUser.id_user,
        email: newUser.email,
        nom_complet: newUser.nom_complet,
        role: newUser.role,
        avatar: newUser.avatar,
      };

      res.status(201).json({
        message: "Utilisateur créé",
        user: userObj,
        accessToken,
        refreshToken,
      });
    } catch (error) {
      res.status(500).json({ message: "SERVER_ERROR", error: error.message });
    }
  },
];

export const login = [
  body("email").isEmail().normalizeEmail(),
  body("password").notEmpty(),

  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    try {
      const user = await prisma.utilisateur.findUnique({
        where: { email },
      });

      if (!user || user.statut === "SUSPENDU") {
        return res.status(401).json({ message: "AUTH_FAILED" });
      }

      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ message: "AUTH_FAILED" });
      }

      const { accessToken, refreshToken } = generateTokens(user);

      await prisma.utilisateur.update({
        where: { id_user: user.id_user },
        data: {
          refresh_token: refreshToken,
          dernier_login: new Date(),
        },
      });

      const userObj = {
        id: user.id_user,
        email: user.email,
        nom_complet: user.nom_complet,
        role: user.role,
        avatar: user.avatar,
      };

      res.status(200).json({
        message: "Connexion réussie",
        user: userObj,
        accessToken,
        refreshToken,
      });
    } catch (error) {
      res.status(500).json({ message: "SERVER_ERROR", error: error.message });
    }
  },
];

export const refreshToken = async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(401).json({ message: "REFRESH_TOKEN_MISSING" });
  }

  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

    const user = await prisma.utilisateur.findUnique({
      where: { id_user: decoded.id },
    });

    if (
      !user ||
      user.refresh_token !== refreshToken ||
      user.statut === "SUSPENDU"
    ) {
      return res.status(403).json({ message: "INVALID_REFRESH_TOKEN" });
    }

    const newAccessToken = jwt.sign(
      { id: user.id_user, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "15m" },
    );

    res.status(200).json({ accessToken: newAccessToken });
  } catch (error) {
    return res
      .status(403)
      .json({ message: "INVALID_OR_EXPIRED_REFRESH_TOKEN" });
  }
};

export const getMe = async (req, res) => {
  try {
    const user = await prisma.utilisateur.findUnique({
      where: { id_user: req.user.id },
    });

    if (!user || user.statut === "SUSPENDU") {
      return res.status(404).json({ message: "USER_NOT_FOUND" });
    }

    const userObj = {
      id: user.id_user,
      email: user.email,
      nom_complet: user.nom_complet,
      role: user.role,
      avatar: user.avatar,
    };

    res.status(200).json(userObj);
  } catch (error) {
    res.status(500).json({ message: "SERVER_ERROR", error: error.message });
  }
};
