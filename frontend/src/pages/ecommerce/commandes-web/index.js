import CommandesWebView from 'src/views/pages/ecommerce/commandes-web'
import { CommandeWebProvider } from 'src/context/CommandeWebContext'

const CommandesWebPage = () => {
  return (
    <CommandeWebProvider>
      <CommandesWebView />
    </CommandeWebProvider>
  )
}

export default CommandesWebPage
