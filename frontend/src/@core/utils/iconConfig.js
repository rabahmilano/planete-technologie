export const getProductIcon = designation => {
  if (!designation) return 'tabler:package'

  const des = designation.toLowerCase()

  // Dictionnaire de correspondances (Facile à étendre à l'avenir)
  const iconMap = [
    { keywords: ['ssd', 'disque', 'hdd'], icon: 'tabler:database' },
    { keywords: ['ram', 'mémoire', 'ddr', 'crucial', 'netac'], icon: 'mdi:memory' },
    { keywords: ['proco', 'cpu', 'processeur'], icon: 'tabler:cpu' },
    { keywords: ['ecran', 'moniteur', 'display'], icon: 'tabler:device-desktop' },
    { keywords: ['clavier', 'souris', 'keyboard', 'mouse'], icon: 'tabler:keyboard' },
    { keywords: ['montre', 'watch', 'naviforce'], icon: 'tabler:device-watch' },
    { keywords: ['hub', 'usb'], icon: 'tabler:usb' },
    { keywords: ['wifi', 'réseau', 'fenvi', 'network'], icon: 'tabler:wifi' },
    { keywords: ['chargeur', 'câble', 'cable', 'toocki'], icon: 'tabler:plug' },
    { keywords: ['ecouteur', 'casque', 'audio', 'haylou', 'microphone'], icon: 'tabler:headphones' }
  ]

  // Cherche la première correspondance où un des mots-clés est inclus dans la désignation
  const match = iconMap.find(item => item.keywords.some(kw => des.includes(kw)))

  // Retourne l'icône trouvée ou l'icône par défaut
  return match ? match.icon : 'tabler:package'
}
