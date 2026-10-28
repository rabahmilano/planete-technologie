-- À exécuter une seule fois dans TiDB Cloud avant le déploiement du backend.
CREATE TABLE IF NOT EXISTS ajustement_compte (
  id_ajustement INT NOT NULL,
  cpt_id INT NOT NULL,
  montant DECIMAL(10, 2) NOT NULL,
  type_ajustement VARCHAR(20) NOT NULL,
  taux_change DECIMAL(10, 2) NOT NULL,
  date_ajustement DATE NOT NULL,
  observation VARCHAR(255) NOT NULL,
  isAnnule BOOLEAN NOT NULL DEFAULT FALSE,
  PRIMARY KEY (id_ajustement),
  KEY ajustement_compte_cpt_date_idx (cpt_id, date_ajustement),
  CONSTRAINT ajustement_compte_cpt_fk FOREIGN KEY (cpt_id) REFERENCES compte (id_cpt)
);
