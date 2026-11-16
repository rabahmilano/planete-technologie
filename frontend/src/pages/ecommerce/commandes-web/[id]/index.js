import CommandeWebDetailView from 'src/views/pages/ecommerce/commandes-web/detail'
import { CommandeWebProvider } from 'src/context/CommandeWebContext'

const CommandeWebDetailPage = () => {
  return (
    <CommandeWebProvider>
      <CommandeWebDetailView />
    </CommandeWebProvider>
  )
}

export default CommandeWebDetailPage
