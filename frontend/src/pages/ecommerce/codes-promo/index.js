import { CodePromoProvider } from 'src/context/CodePromoContext'
import CodesPromoView from 'src/views/pages/ecommerce/codes-promo/index'

const CodesPromoPage = () => (
  <CodePromoProvider>
    <CodesPromoView />
  </CodePromoProvider>
)

export default CodesPromoPage
