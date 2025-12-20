import { VoiceWidget } from '@/components/VoiceWidget'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: "VIC | Your AI Guide to London's Hidden Stories",
  description: "Discover London's secrets with VIC. Ask about hidden gems, Shakespeare's London, the Thames, medieval history, and fascinating walks through the city.",
}

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-london-950 via-london-900 to-black relative overflow-hidden">
      {/* London fog ambient effect */}
      <div className="london-fog" aria-hidden="true" />

      {/* Dramatic radial gradient background */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(41,82,204,0.15)_0%,transparent_70%)]" />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-london-500/5 rounded-full blur-[100px]" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-gold-500/5 rounded-full blur-[100px]" />
      </div>

      {/* Main Content */}
      <main className="relative z-10">
        {/* Hero Section with Voice Widget */}
        <section className="max-w-4xl mx-auto px-4 pt-16 pb-12">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif font-bold mb-4 text-gradient-london">
              London My London
            </h1>
            <p className="text-xl md:text-2xl text-london-300/80 mb-2">
              Your AI Guide to London's Hidden Stories
            </p>
            <p className="text-london-400/60 text-sm max-w-lg mx-auto">
              By Vic Keegan — 139 articles exploring London's secret history, hidden gems, and forgotten corners
            </p>
          </div>

          {/* Hero Video Placeholder */}
          <div className="relative w-full max-w-3xl mx-auto mb-12 rounded-2xl overflow-hidden border border-london-700/50 bg-london-900/50">
            <div className="aspect-video flex items-center justify-center">
              {/* Replace this with actual video */}
              <div className="text-center">
                <div className="w-20 h-20 rounded-full bg-london-800 flex items-center justify-center mx-auto mb-4 border border-london-600">
                  <svg className="w-8 h-8 text-london-300" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
                <p className="text-london-400 text-sm">London Hero Video</p>
                <p className="text-london-500 text-xs mt-1">Add your video to /public/london-hero.mp4</p>
              </div>
            </div>
          </div>

          {/* Voice Widget - Main Interaction */}
          <div className="my-12">
            <VoiceWidget />
          </div>
        </section>

        {/* What You Can Ask Section */}
        <section className="py-16 bg-gradient-to-b from-london-950/50 to-black border-t border-london-800/30">
          <div className="max-w-4xl mx-auto px-4">
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-center mb-4 text-london-200">
              What Can You Ask VIC?
            </h2>
            <p className="text-london-400 text-center mb-12 max-w-xl mx-auto">
              VIC knows about London's hidden history, forgotten stories, and secret places. Just ask.
            </p>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="bg-london-900/60 rounded-xl p-6 border border-london-700/30 hover:border-london-500/50 transition-all">
                <div className="text-2xl mb-3">🏛️</div>
                <h3 className="font-semibold text-london-200 mb-2">Hidden History</h3>
                <p className="text-london-400 text-sm">
                  "Tell me about the medieval buildings still standing in London"
                </p>
              </div>
              <div className="bg-london-900/60 rounded-xl p-6 border border-london-700/30 hover:border-london-500/50 transition-all">
                <div className="text-2xl mb-3">🎭</div>
                <h3 className="font-semibold text-london-200 mb-2">Shakespeare's London</h3>
                <p className="text-london-400 text-sm">
                  "Where did Shakespeare live and perform in London?"
                </p>
              </div>
              <div className="bg-london-900/60 rounded-xl p-6 border border-london-700/30 hover:border-london-500/50 transition-all">
                <div className="text-2xl mb-3">🌊</div>
                <h3 className="font-semibold text-london-200 mb-2">The Thames</h3>
                <p className="text-london-400 text-sm">
                  "What secrets does the Thames hide at low tide?"
                </p>
              </div>
              <div className="bg-london-900/60 rounded-xl p-6 border border-london-700/30 hover:border-london-500/50 transition-all">
                <div className="text-2xl mb-3">💎</div>
                <h3 className="font-semibold text-london-200 mb-2">Hidden Gems</h3>
                <p className="text-london-400 text-sm">
                  "What are London's best kept secrets?"
                </p>
              </div>
              <div className="bg-london-900/60 rounded-xl p-6 border border-london-700/30 hover:border-london-500/50 transition-all">
                <div className="text-2xl mb-3">🚶</div>
                <h3 className="font-semibold text-london-200 mb-2">London Walks</h3>
                <p className="text-london-400 text-sm">
                  "Can I walk from Trafalgar Square to Margate without crossing a road?"
                </p>
              </div>
              <div className="bg-london-900/60 rounded-xl p-6 border border-london-700/30 hover:border-london-500/50 transition-all">
                <div className="text-2xl mb-3">🎲</div>
                <h3 className="font-semibold text-london-200 mb-2">Surprise Me</h3>
                <p className="text-london-400 text-sm">
                  "Tell me something fascinating I don't know about London"
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* About Section */}
        <section className="py-16 bg-black border-t border-london-800/30">
          <div className="max-w-3xl mx-auto px-4 text-center">
            <h2 className="text-3xl md:text-4xl font-serif font-bold mb-6 text-london-200">
              About London My London
            </h2>
            <p className="text-london-300/80 text-lg leading-relaxed mb-6">
              This collection brings together 139 articles by Vic Keegan, exploring London's hidden corners,
              forgotten history, and secret stories. From Shakespeare's lost theatres to the source of the Thames,
              from medieval buildings to modern art — VIC is your voice-powered guide to it all.
            </p>
            <p className="text-london-400/60 text-sm">
              Original articles from <a href="https://www.londonmylondon.co.uk" target="_blank" rel="noopener noreferrer" className="text-london-300 hover:text-gold-400 transition-colors">londonmylondon.co.uk</a>
            </p>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-black border-t border-london-800/30 py-8">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <p className="text-london-500/60 text-sm">
            VIC — Powered by AI, inspired by London
          </p>
        </div>
      </footer>
    </div>
  )
}
