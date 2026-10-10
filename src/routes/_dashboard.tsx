import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import DashboardLayout from '../components/DashboardLayout'
import { DashboardProvider } from '../components/DashboardProvider'
import { getSafeRedirect } from '../server/auth'

export const Route = createFileRoute('/_dashboard')({
  beforeLoad: ({ context, location }) => {
    if (!context.user) {
      throw redirect({
        to: '/login',
        search: { redirect: getSafeRedirect(location.pathname) },
        replace: true,
      })
    }
    return { user: context.user }
  },
  component: DashboardRoute,
})

function DashboardRoute() {
  const { user } = Route.useRouteContext()
  return (
    <DashboardProvider role={user.role}>
      <DashboardLayout>
        <Outlet />
      </DashboardLayout>
    </DashboardProvider>
  )
}
