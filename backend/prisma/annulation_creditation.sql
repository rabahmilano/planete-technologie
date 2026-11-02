-- À exécuter une seule fois sur TiDB Cloud avant le déploiement du backend.
ALTER TABLE crediter
  ADD COLUMN isAnnule BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN montant_dzd DECIMAL(10, 2) NULL;
