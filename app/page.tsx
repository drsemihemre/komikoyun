'use client'

import dynamic from 'next/dynamic'

const Game = dynamic(() => import('@/components/game/Game'), {
  ssr: false,
  loading: () => <LoadingScreen />,
})

export default function Home() {
  return <Game />
}

function LoadingScreen() {
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-gradient-to-b from-sky-300 to-sky-500">
      <div className="text-center">
        <div className="mb-4 text-6xl animate-bounce">🤸</div>
        <div className="text-2xl font-black text-white drop-shadow-lg">
          Komik Oyun yükleniyor...
        </div>
      </div>
    </div>
  )
}
