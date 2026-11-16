import { CommandeWebProvider } from 'src/context/CommandeWebContext'
import CommandesWebView from 'src/views/pages/ecommerce/commandes-web/index'

const CommandesWebPage = () => (
  <CommandeWebProvider>
    <CommandesWebView />
  </CommandeWebProvider>
)

export default CommandesWebPage
