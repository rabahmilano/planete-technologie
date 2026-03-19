import { forwardRef } from 'react'
import Cleave from 'cleave.js/react'

const CleaveInput = forwardRef((props, ref) => {
  const { onChange, ...other } = props

  return (
    <Cleave
      {...other}
      htmlRef={ref}
      options={{
        numeral: true,
        numeralThousandsGroupStyle: 'thousand',
        delimiter: ' ' // Espace pour séparer les milliers
      }}
      onChange={e => {
        onChange({
          target: {
            name: props.name,
            value: e.target.rawValue // Envoie la valeur brute (ex: "1500.50") au formulaire
          }
        })
      }}
    />
  )
})

export default CleaveInput
