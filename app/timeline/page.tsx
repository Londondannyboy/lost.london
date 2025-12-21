import { getEraStats, getArticlesByEra } from '@/lib/db'
import { Header } from '@/components/Header'
import Link from 'next/link'

export const metadata = {
  title: 'Timeline | Lost London',
  description: 'Explore London\'s history through the ages - from Roman times to the modern era.',
}

const ERA_INFO: Record<string, { years: string; description: string; color: string }> = {
  'Roman': {
    years: '43 - 410 AD',
    description: 'Londinium was founded by the Romans around AD 43. It became a major commercial hub and the capital of Roman Britain.',
    color: 'bg-red-900/30 border-red-700'
  },
  'Medieval': {
    years: '410 - 1485',
    description: 'After the Romans left, London rebuilt itself into a thriving medieval city with the Tower of London and Westminster Abbey.',
    color: 'bg-amber-900/30 border-amber-700'
  },
  'Tudor': {
    years: '1485 - 1603',
    description: 'The Tudor period brought the Reformation, Shakespeare\'s Globe Theatre, and London\'s emergence as a world city.',
    color: 'bg-emerald-900/30 border-emerald-700'
  },
  'Stuart': {
    years: '1603 - 1714',
    description: 'A turbulent era including the Civil War, Great Plague, and Great Fire that destroyed much of the old city.',
    color: 'bg-purple-900/30 border-purple-700'
  },
  'Georgian': {
    years: '1714 - 1837',
    description: 'London expanded with elegant squares and terraces. The British Empire grew and the Industrial Revolution began.',
    color: 'bg-blue-900/30 border-blue-700'
  },
  'Victorian': {
    years: '1837 - 1901',
    description: 'The capital of the world\'s largest empire. Railways, the Underground, and iconic landmarks transformed the city.',
    color: 'bg-slate-900/30 border-slate-600'
  },
  'Modern': {
    years: '1901 - Present',
    description: 'Two world wars, the Blitz, and dramatic reinvention. London remains one of the world\'s great cities.',
    color: 'bg-london-900/30 border-london-600'
  }
}

export default async function TimelinePage({
  searchParams
}: {
  searchParams: Promise<{ era?: string }>
}) {
  const params = await searchParams
  const stats = await getEraStats()
  const selectedEra = params.era

  // Get articles for selected era
  let articles: Awaited<ReturnType<typeof getArticlesByEra>> = []
  if (selectedEra) {
    articles = await getArticlesByEra(selectedEra)
  }

  return (
    <div className="min-h-screen">
      <Header />

      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-serif text-gradient-london mb-4">
            Journey Through Time
          </h1>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Explore London&apos;s rich history from Roman Londinium to the modern metropolis.
            Select an era to discover its hidden stories.
          </p>
        </div>

        {/* Timeline */}
        <div className="relative mb-12">
          {/* Timeline line */}
          <div className="hidden md:block absolute left-1/2 transform -translate-x-1/2 w-1 h-full bg-london-700" />

          <div className="space-y-6">
            {Object.entries(ERA_INFO).map(([era, info], index) => {
              const stat = stats.find(s => s.era === era)
              const count = stat?.count || 0
              const isSelected = selectedEra === era

              return (
                <div
                  key={era}
                  className={`relative flex items-center ${
                    index % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'
                  }`}
                >
                  {/* Timeline dot */}
                  <div className="hidden md:block absolute left-1/2 transform -translate-x-1/2 w-4 h-4 rounded-full bg-london-500 border-2 border-background z-10" />

                  {/* Era card */}
                  <div className={`flex-1 ${index % 2 === 0 ? 'md:pr-12' : 'md:pl-12'}`}>
                    <Link
                      href={isSelected ? '/timeline' : `/timeline?era=${era}`}
                      className={`block p-6 rounded-xl border transition-all ${info.color} ${
                        isSelected
                          ? 'ring-2 ring-gold-500 shadow-lg shadow-gold-500/20'
                          : 'hover:border-gold-600/50'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h2 className="text-xl font-serif text-white">{era}</h2>
                          <p className="text-sm text-gray-400">{info.years}</p>
                        </div>
                        <span className="text-2xl font-serif text-gold-400">{count}</span>
                      </div>
                      <p className="text-sm text-gray-300">{info.description}</p>
                    </Link>
                  </div>

                  {/* Spacer for alternating layout */}
                  <div className="hidden md:block flex-1" />
                </div>
              )
            })}
          </div>
        </div>

        {/* Articles for selected era */}
        {selectedEra && articles.length > 0 && (
          <div className="mt-12">
            <h2 className="text-2xl font-serif text-white mb-6">
              {selectedEra} Era Articles
              <span className="text-gray-500 text-lg ml-2">({articles.length})</span>
            </h2>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {articles.map(article => (
                <Link
                  key={article.id}
                  href={`/article/${article.slug}`}
                  className="article-card p-4 block"
                >
                  {article.featured_image_url && (
                    <img
                      src={article.featured_image_url}
                      alt={article.title}
                      className="w-full h-40 object-cover rounded-lg mb-3"
                    />
                  )}
                  <h3 className="font-serif text-white mb-2">{article.title}</h3>
                  {article.year_from && (
                    <p className="text-xs text-gold-400 mb-2">
                      {article.year_from}{article.year_to && article.year_to !== article.year_from ? ` - ${article.year_to}` : ''}
                    </p>
                  )}
                  <p className="text-sm text-gray-400 line-clamp-2">{article.excerpt}</p>
                </Link>
              ))}
            </div>
          </div>
        )}

        {selectedEra && articles.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-400">
              No articles found for the {selectedEra} era yet.
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Run the location data script to populate era information.
            </p>
          </div>
        )}
      </main>
    </div>
  )
}
