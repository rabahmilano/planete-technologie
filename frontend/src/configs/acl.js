import { AbilityBuilder, createMongoAbility } from '@casl/ability'

export const AppAbility = createMongoAbility

const defineRulesFor = (role, subject) => {
  const { can, rules } = new AbilityBuilder(createMongoAbility)

  if (role === 'admin' || role === 'ADMIN') {
    can('manage', 'all')
  } else {
    can(['read'], subject)
  }

  return rules
}

export const buildAbilityFor = (role, subject) => {
  return createMongoAbility(defineRulesFor(role, subject), {
    detectSubjectType: object => object.type
  })
}

export const defaultACLObj = {
  action: 'manage',
  subject: 'all'
}

export default defineRulesFor
