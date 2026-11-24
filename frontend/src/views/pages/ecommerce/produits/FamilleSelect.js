import React, { useState } from 'react'
import {
  TextField,
  Popover,
  List,
  ListItemButton,
  ListItemText,
  Collapse,
  IconButton,
  InputAdornment
} from '@mui/material'
import Icon from 'src/@core/components/icon'

// Sélecteur de famille en accordéon (2 niveaux max) : le parent est
// sélectionnable comme ses enfants ; le chevron ne fait que déplier.
// « Aucune famille » en tête de liste retire la famille.
export default function FamilleSelect({ familles, value, onChange }) {
  const [anchorEl, setAnchorEl] = useState(null)
  const [openIds, setOpenIds] = useState({})

  const parentDe = idFamille => {
    for (const parent of familles) {
      if ((parent.sous_familles || []).some(enfant => enfant.id_famille === idFamille)) {
        return parent.id_famille
      }
    }

    return null
  }

  const ouvrirListe = event => {
    // Le parent de la famille sélectionnée est déplié d'office.
    if (value) {
      const parentId = parentDe(value.id_famille)
      if (parentId) setOpenIds(prev => ({ ...prev, [parentId]: true }))
    }
    setAnchorEl(event.currentTarget)
  }

  const toggleCollapse = (e, id) => {
    e.stopPropagation() // Empêche de sélectionner la famille quand on veut juste déplier
    setOpenIds(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const handleSelect = item => {
    onChange(item)
    setAnchorEl(null)
  }

  return (
    <>
      <TextField
        label='Famille'
        data-testid='selecteur-famille'
        value={value?.nom_famille || ''}
        onClick={ouvrirListe}
        fullWidth
        InputProps={{
          readOnly: true,
          endAdornment: (
            <InputAdornment position='end'>
              <Icon icon='tabler:chevron-down' fontSize='1.25rem' />
            </InputAdornment>
          )
        }}
      />

      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        PaperProps={{ sx: { width: anchorEl?.clientWidth, maxHeight: 320 } }}
      >
        <List dense disablePadding>
          <ListItemButton
            data-testid='option-famille-aucune'
            selected={!value}
            onClick={() => handleSelect(null)}
          >
            <ListItemText
              primary='Aucune famille'
              primaryTypographyProps={{ color: 'text.secondary', fontStyle: 'italic' }}
            />
          </ListItemButton>
          {familles.map(famille => {
            const hasChildren = famille.sous_familles?.length > 0
            const isOpen = !!openIds[famille.id_famille]

            return (
              <React.Fragment key={famille.id_famille}>
                <ListItemButton
                  data-testid={`option-famille-${famille.id_famille}`}
                  selected={value?.id_famille === famille.id_famille}
                  onClick={() => handleSelect(famille)}
                >
                  <ListItemText primary={famille.nom_famille} primaryTypographyProps={{ fontWeight: 600 }} />
                  {hasChildren && (
                    <IconButton
                      size='small'
                      onClick={e => toggleCollapse(e, famille.id_famille)}
                      aria-label={isOpen ? `Replier ${famille.nom_famille}` : `Déplier ${famille.nom_famille}`}
                    >
                      {isOpen ? <Icon icon='tabler:chevron-up' /> : <Icon icon='tabler:chevron-down' />}
                    </IconButton>
                  )}
                </ListItemButton>

                {hasChildren && (
                  <Collapse in={isOpen} timeout='auto' unmountOnExit>
                    <List dense disablePadding>
                      {famille.sous_familles.map(sf => (
                        <ListItemButton
                          key={sf.id_famille}
                          data-testid={`option-famille-${sf.id_famille}`}
                          sx={{ pl: 4 }}
                          selected={value?.id_famille === sf.id_famille}
                          onClick={() => handleSelect(sf)}
                        >
                          <ListItemText primary={sf.nom_famille} />
                        </ListItemButton>
                      ))}
                    </List>
                  </Collapse>
                )}
              </React.Fragment>
            )
          })}
        </List>
      </Popover>
    </>
  )
}
