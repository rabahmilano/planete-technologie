import TarifsLivraisonView from 'src/views/pages/ecommerce/tarifs-livraison'
import { TarifLivraisonProvider } from 'src/context/TarifLivraisonContext'

const TarifsLivraisonPage = () => {
  return (
    <TarifLivraisonProvider>
      <TarifsLivraisonView />
    </TarifLivraisonProvider>
  )
}

export default TarifsLivraisonPage
