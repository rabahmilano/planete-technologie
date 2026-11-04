-- À exécuter une seule fois sur TiDB Cloud si la colonne n'existe pas déjà.
ALTER TABLE crediter
  ADD COLUMN isAnnule BOOLEAN NOT NULL DEFAULT FALSE;
