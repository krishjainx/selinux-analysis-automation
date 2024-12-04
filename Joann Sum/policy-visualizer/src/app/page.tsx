'use client'

import dynamic from 'next/dynamic'

const SELinuxPolicyVisualizer = dynamic(
  () => import('./components/SELinuxPolicyVisualizer'),
  { ssr: false }
)

export default function Home() {
  return (
    <main className="container mx-auto">
      <SELinuxPolicyVisualizer />
    </main>
  )
}