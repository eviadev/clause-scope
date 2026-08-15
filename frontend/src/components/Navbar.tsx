import { FileDiff, FileText, LayoutDashboard, LogOut } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/useAuth'

export function Navbar() {
  const { user, logout } = useAuth()

  return (
    <nav className="border-b bg-card">
      <div className="container mx-auto px-4">
        <div className="flex min-h-16 flex-wrap items-center justify-between gap-3 py-3">
          <Link to="/dashboard" className="flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">ClauseScope</span>
          </Link>

          <div className="flex flex-wrap items-center gap-2">
            <Link to="/dashboard">
              <Button variant="ghost" className="gap-2">
                <LayoutDashboard className="h-4 w-4" />
                Dossiers
              </Button>
            </Link>
            <Link to="/compare">
              <Button variant="ghost" className="gap-2">
                <FileDiff className="h-4 w-4" />
                Comparer
              </Button>
            </Link>
            <div className="flex items-center gap-3 border-l pl-3">
              <span className="hidden text-sm text-muted-foreground sm:inline">
                {user?.username}
              </span>
              <Button variant="outline" size="sm" onClick={logout} className="gap-2">
                <LogOut className="h-4 w-4" />
                Déconnexion
              </Button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  )
}
