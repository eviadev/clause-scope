import React, { Component, ReactNode } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

/**
 * Error Boundary component to catch and display React errors
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
    }
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught error:', error, errorInfo)
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
    })
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="max-w-md w-full">
            <Alert variant="destructive">
              <AlertDescription className="space-y-4">
                <h3 className="font-semibold text-lg">Une erreur est survenue</h3>
                <p className="text-sm">
                  {this.state.error?.message || 'Une erreur inattendue s\'est produite'}
                </p>
                <details className="text-xs bg-red-50 p-2 rounded">
                  <summary className="cursor-pointer font-medium">Détails techniques</summary>
                  <pre className="mt-2 overflow-auto">
                    {this.state.error?.stack}
                  </pre>
                </details>
                <Button onClick={this.handleReset} variant="outline" className="w-full">
                  Recharger la page
                </Button>
              </AlertDescription>
            </Alert>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
