import { FamilleProvider } from 'src/context/FamilleContext'
import FamillesView from 'src/views/pages/ecommerce/familles/index'

const FamillesPage = () => (
  <FamilleProvider>
    <FamillesView />
  </FamilleProvider>
)

export default FamillesPage
