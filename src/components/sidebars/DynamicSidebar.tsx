import React from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { StaffSidebar } from './StaffSidebar'
import { SectionUnitHeadSidebar } from './SectionUnitHeadSidebar'
import { DivisionManagerSidebar } from './DivisionManagerSidebar'
import { RegionalDirectorSidebar } from './RegionalDirectorSidebar'
import { AdminSidebar } from '../admin/AdminSidebar'

export function DynamicSidebar() {
  const { user } = useAuth()

  if (!user) {
    return null
  }

  switch (user.FUNCTIONAL_ROLE) {
    case 'staff':
      return <StaffSidebar />
    case 'section_unit_head':
      return <SectionUnitHeadSidebar />
    case 'division_manager':
      return <DivisionManagerSidebar />
    case 'regional_director':
      return <RegionalDirectorSidebar />
    case 'admin':
      return <AdminSidebar />
    default:
      return <StaffSidebar />
  }
}
