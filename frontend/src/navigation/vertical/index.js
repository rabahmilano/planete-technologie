const navigation = () => {
  return [
    {
      title: 'Home',
      path: '/home',
      icon: 'tabler:smart-home'
    },
    {
      title: 'Produits',
      icon: 'tabler:box',
      children: [
        {
          title: 'Liste des produits',
          path: '/produits/liste',
          icon: 'tabler:list-details' // Ajouté
        },
        {
          title: 'Ajouter un produit',
          path: '/produits/ajouter',
          icon: 'tabler:circle-plus' // Ajouté
        }
      ]
    },
    {
      title: 'Commande',
      icon: 'tabler:file-invoice',
      children: [
        {
          title: 'Liste des commandes',
          path: '/commandes/liste',
          icon: 'tabler:list-check' // Ajouté
        },
        {
          title: 'Créer une commande',
          path: '/commandes/ajouter',
          icon: 'tabler:file-plus' // Ajouté
        }
      ]
    },
    {
      title: 'Dépenses',
      icon: 'tabler:receipt-2', // Modifié pour être plus pertinent
      children: [
        {
          title: 'Mes dépenses',
          path: '/depenses/mesDepenses',
          icon: 'tabler:report-money'
        },
        {
          title: 'Nouvelle dépense',
          path: '/depenses/ajouter',
          icon: 'tabler:file-plus' // Ajouté
        }
      ]
    },
    {
      title: 'Emprunts',
      icon: 'tabler:cash-banknote',
      children: [
        {
          title: 'Mes emprunts',
          path: '/emprunts/mesEmprunts',
          icon: 'tabler:list-details'
        },
        {
          title: 'Nouvel emprunt',
          path: '/emprunts/ajouter',
          icon: 'tabler:file-plus'
        }
      ]
    },
    {
      title: 'Paramètres',
      icon: 'tabler:settings',
      children: [
        {
          title: 'Devises',
          path: '/settings/devises',
          icon: 'tabler:currency-pound'
        },
        {
          title: 'Comptes',
          path: '/settings/comptes',
          icon: 'tabler:building-bank'
        }
      ]
    }
  ]
}

export default navigation
