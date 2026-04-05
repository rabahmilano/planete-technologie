export const getStatusColor = statut => {
  switch (statut) {
    case 'EN_PREPARATION':
      return 'warning'
    case 'EN_COURS':
      return 'primary'
    case 'CLOTURE':
      return 'success'
    default:
      return 'secondary'
  }
}

export const getStatusLabel = statut => {
  switch (statut) {
    case 'EN_PREPARATION':
      return 'En Préparation'
    case 'EN_COURS':
      return 'En Cours'
    case 'CLOTURE':
      return 'Clôturé'
    default:
      return statut
  }
}
