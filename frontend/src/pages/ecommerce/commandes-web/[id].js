import { CommandeWebProvider } from 'src/context/CommandeWebContext'
import DetailCommandeWebView from 'src/views/pages/ecommerce/commandes-web/DetailCommandeWeb'

const DetailCommandeWebPage = () => (
  <CommandeWebProvider>
    <DetailCommandeWebView />
  </CommandeWebProvider>
)

export default DetailCommandeWebPage
