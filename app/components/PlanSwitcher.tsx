'use client'

import { useState } from 'react'
import { usePlan } from '../context/PlanContext'
import { PlanType, PLANS, formatPlanBadge } from '../config/plans'

export default function PlanSwitcher() {
  const { currentPlan, setPlan, planFeatures, usedUploads, resetUploads } = usePlan()
  const [isOpen, setIsOpen] = useState(false)

  const handlePlanChange = (plan: PlanType) => {
    setPlan(plan)
    setIsOpen(false)
  }

  const remainingUploads = planFeatures.maxUploadsPerMonth === -1
    ? 'Unlimited'
    : `${Math.max(0, planFeatures.maxUploadsPerMonth - usedUploads)} / ${planFeatures.maxUploadsPerMonth}`

  const badge = formatPlanBadge(currentPlan)

  return (
    <>
      {/* Toggle Button - Fixed position */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-[100] bg-white shadow-xl rounded-full px-4 py-3 flex items-center gap-2 hover:shadow-2xl transition-all border border-gray-200"
      >
        <span className={`px-2 py-1 rounded-full text-xs font-bold ${badge.className}`}>
          {badge.text}
        </span>
        <span className="text-sm text-gray-600">Test Plans</span>
        <span className="text-lg">{isOpen ? '❌' : '🔄'}</span>
      </button>

      {/* Plan Switcher Panel */}
      {isOpen && (
        <div className="fixed bottom-20 right-6 z-[99] bg-white shadow-2xl rounded-2xl p-6 w-96 border border-gray-200">
          <div className="mb-4">
            <h3 className="text-lg font-bold text-gray-900 mb-1">Plan Testing Panel</h3>
            <p className="text-xs text-gray-500">Switch between plans to test different features</p>
          </div>

          {/* Current Status */}
          <div className="bg-gray-50 rounded-lg p-3 mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-600">Current Plan:</span>
              <span className={`px-2 py-1 rounded-full text-xs font-bold ${badge.className}`}>
                {badge.text}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-600">Uploads Used:</span>
              <span className="text-xs font-bold text-gray-900">{remainingUploads}</span>
            </div>
          </div>

          {/* Plan Options */}
          <div className="space-y-3 mb-4">
            {(Object.keys(PLANS) as PlanType[]).map((plan) => {
              const planData = PLANS[plan]
              const planBadge = formatPlanBadge(plan)
              const isActive = currentPlan === plan

              return (
                <button
                  key={plan}
                  onClick={() => handlePlanChange(plan)}
                  className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                    isActive
                      ? 'border-primary bg-primary/5'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${planBadge.className}`}>
                        {planBadge.text}
                      </span>
                      <span className="text-sm font-bold text-gray-900">
                        {planData.priceDisplay}
                      </span>
                    </div>
                    {isActive && (
                      <span className="text-xs bg-primary text-white px-2 py-1 rounded-full">
                        Active
                      </span>
                    )}
                  </div>

                  {/* Key Features */}
                  <div className="grid grid-cols-2 gap-1 text-xs text-gray-600">
                    <span>• {planData.maxUploadsPerMonth === -1 ? 'Unlimited' : `${planData.maxUploadsPerMonth}`} uploads/mo</span>
                    <span>• {planData.maxPlatforms === -1 ? 'All' : planData.maxPlatforms} platforms</span>
                    <span>• {planData.maxFilesPerUpload} files/post</span>
                    <span>• {planData.scheduling ? 'Scheduling' : 'No scheduling'}</span>
                    {plan === 'pro' && (
                      <>
                        <span>• AI recommendations</span>
                        <span>• Advanced analytics</span>
                      </>
                    )}
                  </div>
                </button>
              )
            })}
          </div>

          {/* Quick Actions */}
          <div className="flex gap-2">
            <button
              onClick={resetUploads}
              className="flex-1 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-medium transition-colors"
            >
              Reset Uploads Counter
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="flex-1 px-3 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg text-xs font-medium transition-colors"
            >
              Close Panel
            </button>
          </div>

          {/* Dev Note */}
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-xs text-yellow-800">
              <span className="font-bold">⚠️ Development Mode:</span> This panel is for testing only and won't appear in production.
            </p>
          </div>
        </div>
      )}
    </>
  )
}