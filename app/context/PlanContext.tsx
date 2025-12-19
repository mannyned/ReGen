'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import { PlanType, getPlan, PlanFeatures } from '../config/plans'

interface PlanContextType {
  currentPlan: PlanType
  setPlan: (plan: PlanType) => void
  planFeatures: PlanFeatures
  usedUploads: number
  incrementUploads: () => void
  resetUploads: () => void
  isLoading: boolean
}

const PlanContext = createContext<PlanContextType | undefined>(undefined)

export function PlanProvider({ children }: { children: React.ReactNode }) {
  const [currentPlan, setCurrentPlan] = useState<PlanType>('free')
  const [usedUploads, setUsedUploads] = useState(0)
  const [planFeatures, setPlanFeatures] = useState<PlanFeatures>(getPlan('free'))
  const [isLoading, setIsLoading] = useState(true)

  // Fetch plan from database on mount, fallback to localStorage
  useEffect(() => {
    async function fetchUserTier() {
      try {
        // Try to get tier from authenticated user
        const response = await fetch('/api/auth/me')
        if (response.ok) {
          const data = await response.json()
          if (data.tier) {
            const tier = data.tier.toLowerCase() as PlanType
            if (['free', 'creator', 'pro'].includes(tier)) {
              setCurrentPlan(tier)
              setPlanFeatures(getPlan(tier))
              localStorage.setItem('userPlan', tier)
              setIsLoading(false)
              return
            }
          }
        }
      } catch (error) {
        console.error('Failed to fetch user tier:', error)
      }

      // Fallback to localStorage if not authenticated or fetch failed
      const savedPlan = localStorage.getItem('userPlan') as PlanType
      if (savedPlan && ['free', 'creator', 'pro'].includes(savedPlan)) {
        setCurrentPlan(savedPlan)
        setPlanFeatures(getPlan(savedPlan))
      }
      setIsLoading(false)
    }

    fetchUserTier()

    // Load uploads counter
    const savedUploads = localStorage.getItem('usedUploads')
    if (savedUploads) {
      setUsedUploads(parseInt(savedUploads, 10))
    }

    // Reset uploads counter monthly
    const lastReset = localStorage.getItem('uploadsLastReset')
    const now = new Date()
    const lastResetDate = lastReset ? new Date(lastReset) : null

    if (!lastResetDate || now.getMonth() !== lastResetDate.getMonth()) {
      setUsedUploads(0)
      localStorage.setItem('usedUploads', '0')
      localStorage.setItem('uploadsLastReset', now.toISOString())
    }
  }, [])

  const setPlan = (plan: PlanType) => {
    setCurrentPlan(plan)
    setPlanFeatures(getPlan(plan))
    localStorage.setItem('userPlan', plan)
  }

  const incrementUploads = () => {
    const newCount = usedUploads + 1
    setUsedUploads(newCount)
    localStorage.setItem('usedUploads', newCount.toString())
  }

  const resetUploads = () => {
    setUsedUploads(0)
    localStorage.setItem('usedUploads', '0')
    localStorage.setItem('uploadsLastReset', new Date().toISOString())
  }

  return (
    <PlanContext.Provider
      value={{
        currentPlan,
        setPlan,
        planFeatures,
        usedUploads,
        incrementUploads,
        resetUploads,
        isLoading
      }}
    >
      {children}
    </PlanContext.Provider>
  )
}

export function usePlan() {
  const context = useContext(PlanContext)
  if (!context) {
    throw new Error('usePlan must be used within a PlanProvider')
  }
  return context
}