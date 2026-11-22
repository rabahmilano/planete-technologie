import PromotionsView from 'src/views/pages/ecommerce/promotions'
import { PromotionProvider } from 'src/context/PromotionContext'
import { FamilleProvider } from 'src/context/FamilleContext'
import { ProduitDashboardProvider } from 'src/context/ProduitDashboardContext'

const PromotionsPage = () => {
  return (
    <ProduitDashboardProvider>
      <FamilleProvider>
        <PromotionProvider>
          <PromotionsView />
        </PromotionProvider>
      </FamilleProvider>
    </ProduitDashboardProvider>
  )
}

export default PromotionsPage
