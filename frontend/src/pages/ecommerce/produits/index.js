import ProduitsEcommerceView from 'src/views/pages/ecommerce/produits'
import { ProduitDashboardProvider } from 'src/context/ProduitDashboardContext'
import { ProduitEcommerceProvider } from 'src/context/ProduitEcommerceContext'
import { FamilleProvider } from 'src/context/FamilleContext'

const ProduitsEcommercePage = () => {
  return (
    <ProduitDashboardProvider>
      <ProduitEcommerceProvider>
        <FamilleProvider>
          <ProduitsEcommerceView />
        </FamilleProvider>
      </ProduitEcommerceProvider>
    </ProduitDashboardProvider>
  )
}

export default ProduitsEcommercePage
