import { DesignProvider } from './lib/design'
import { Shell } from './components/Shell'
import { useStore } from './store'
import { Dashboard } from './pages/Dashboard'
import { Products } from './pages/Products'
import { PreSelectPage } from './pages/PreSelect'
import { Users } from './pages/Users'
import { Employers } from './pages/Employers'
import { Approvals } from './pages/Approvals'

export default function App() {
  const page = useStore((s) => s.page)
  return (
    <DesignProvider>
      <Shell>
        {page === 'dashboard' && <Dashboard />}
        {page === 'products' && <Products />}
        {page === 'preselect' && <PreSelectPage />}
        {page === 'approvals' && <Approvals />}
        {page === 'employers' && <Employers />}
        {page === 'users' && <Users />}
      </Shell>
    </DesignProvider>
  )
}
