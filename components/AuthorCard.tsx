interface AuthorCardProps {
  name: string
  date?: string | null
}

export function AuthorCard({ name, date }: AuthorCardProps) {
  return (
    <div className="flex items-center gap-3">
      <img
        src="/vic-avatar.jpg"
        alt={name}
        className="w-12 h-12 rounded-full object-cover border-2 border-gray-200"
      />
      <div>
        <p className="font-serif font-bold text-gray-900 text-sm">{name}</p>
        <p className="text-xs text-gray-500">
          {date ? `Published ${date}` : 'London historian'}
        </p>
      </div>
    </div>
  )
}
