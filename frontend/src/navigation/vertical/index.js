const navigation = () => {
  return [
    {
      title: 'Home',
      path: '/home',
      icon: 'tabler:smart-home',
      action: 'manage',
      subject: 'all'
    },
    {
      title: 'Produits',
      icon: 'tabler:box',
      action: 'manage',
      subject: 'all',
      children: [
        {
          title: 'Liste des produits',
          path: '/produits/liste',
          icon: 'tabler:list-details'
        },
        {
          title: 'Ajouter un produit',
          path: '/produits/ajouter',
          icon: 'tabler:circle-plus'
        }
      ]
    },
    {
      title: 'Commande',
      icon: 'tabler:file-invoice',
      action: 'manage',
      subject: 'all',
      children: [
        {
          title: 'Liste des commandes',
          path: '/commandes/liste',
          icon: 'tabler:list-check'
        },
        {
          title: 'Créer une commande',
          path: '/commandes/ajouter',
          icon: 'tabler:file-plus'
        }
      ]
    },
    {
      title: 'Dépenses',
      icon: 'tabler:receipt-2',
      action: 'manage',
      subject: 'all',
      children: [
        {
          title: 'Mes dépenses',
          path: '/depenses/mesDepenses',
          icon: 'tabler:report-money'
        },
        {
          title: 'Nouvelle dépense',
          path: '/depenses/ajouter',
          icon: 'tabler:file-plus'
        }
      ]
    },
    {
      title: 'Emprunts',
      icon: 'tabler:cash-banknote',
      action: 'manage',
      subject: 'all',
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
        },
        {
          title: 'Rembourser',
          path: '/emprunts/rembourser',
          icon: 'tabler:receipt-refund'
        }
      ]
    },
    {
      title: 'Voyages',
      icon: 'tabler:plane-departure',
      action: 'manage',
      subject: 'all',
      children: [
        {
          title: 'Liste des voyages',
          path: '/voyages/liste',
          icon: 'tabler:list-details'
        },
        {
          title: 'Nouveau voyage',
          path: '/voyages/ajouter',
          icon: 'tabler:file-plus'
        }
      ]
    },
    {
      title: 'Paramètres',
      icon: 'tabler:settings',
      action: 'manage',
      subject: 'all',
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
