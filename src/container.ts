import 'reflect-metadata'
import { Container } from 'inversify'
import getDecorators from 'inversify-inject-decorators'

const container = new Container()

// infrastructure
import langContainer from '@/infrastructure/lang/di/lang.container'
import persistenceContainer from '@/infrastructure/persistence/di/persistence.container'
import themeContainer from '@/infrastructure/theme/di/theme.container'

// domain
import walletContainer from '@/infrastructure/wallet/di/wallet.container'
import passContainer from '@/infrastructure/pass/di/pass.container'
import authContainer from '@/infrastructure/auth/di/auth.container'
import organizationContainer from '@/infrastructure/organization/di/organization.container'

container.load(
  ...[
    langContainer,
    persistenceContainer,
    themeContainer,
    walletContainer,
    passContainer,
    authContainer,
    organizationContainer,
  ],
)

const { lazyInject } = getDecorators(container)
export { lazyInject, container }
