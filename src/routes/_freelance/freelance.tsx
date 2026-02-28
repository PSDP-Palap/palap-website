import { createFileRoute, Outlet } from '@tanstack/react-router'
import { Sidebar } from '../../components/Dashborad_Freelance/Sidebar'
import { DashboardContent } from '../../components/Dashborad_Freelance/DashboardContent'

export const Route = createFileRoute('/_freelance/freelance')({
  component: () => (
    <div className="min-h-screen bg-[#FDE2D2] flex p-8 gap-8">
      <div className="w-1/4">
        <Sidebar />
      </div>
      <div className="flex-1">
        <DashboardContent />
        <Outlet /> 
      </div>
    </div>
  ),
})