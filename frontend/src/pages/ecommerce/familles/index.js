import FamillesView from 'src/views/pages/ecommerce/familles'
import { FamilleProvider } from 'src/context/FamilleContext'

const FamillesPage = () => {
  return (
    <FamilleProvider>
      <FamillesView />
    </FamilleProvider>
  )
}

export default FamillesPage
