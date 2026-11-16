import { FamilleProvider } from 'src/context/FamilleContext'
import { ProduitEcommerceProvider } from 'src/context/ProduitEcommerceContext'
import ProduitsEcommerceView from 'src/views/pages/ecommerce/produits/index'

const ProduitsEcommercePage = () => (
  <FamilleProvider>
    <ProduitEcommerceProvider>
      <ProduitsEcommerceView />
    </ProduitEcommerceProvider>
  </FamilleProvider>
)

export default ProduitsEcommercePage
