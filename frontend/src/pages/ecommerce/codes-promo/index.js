import CodesPromoView from 'src/views/pages/ecommerce/codes-promo'
import { CodePromoProvider } from 'src/context/CodePromoContext'

const CodesPromoPage = () => {
  return (
    <CodePromoProvider>
      <CodesPromoView />
    </CodePromoProvider>
  )
}

export default CodesPromoPage
