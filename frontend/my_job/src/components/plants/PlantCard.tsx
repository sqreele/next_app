import Link from 'next/link'

type PlantCardProps = {
  label: string
  image: string
  href: string
}

export function PlantCard({ label, image, href }: PlantCardProps) {
  return (
    <Link
      href={href}
      className="bg-white rounded-2xl shadow p-4 flex flex-col items-center justify-center aspect-square transition hover:scale-105"
    >
      <img src={image} alt={label} className="h-20 w-20 object-contain mb-3" />
      <span className="text-center text-green-900 font-medium text-base leading-tight">{label}</span>
    </Link>
  )
}
