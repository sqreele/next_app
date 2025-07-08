import { usePathname } from 'next/navigation'
import { HomeIcon, ChatBubbleLeftRightIcon, UserIcon, PlusCircleIcon, ChartBarIcon } from '@heroicons/react/24/outline'
import Link from 'next/link'

export function BottomNav() {
  const pathname = usePathname()
  const navItems = [
    { href: '/home', icon: HomeIcon, label: 'Home' },
    { href: '/chats', icon: ChatBubbleLeftRightIcon, label: 'Chats' },
    { href: '/create-job', icon: PlusCircleIcon, label: 'Create Job' },
    { href: '/chart', icon: ChartBarIcon, label: 'Chart' },
    { href: '/profile', icon: UserIcon, label: 'Profile' },
  ]
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 bg-white border-t flex justify-around items-center h-16 z-50 md:hidden pb-[env(safe-area-inset-bottom)]"
      aria-label="Bottom navigation"
    >
      {navItems.map(({ href, icon: Icon, label }) => (
        <Link
          key={href}
          href={href}
          aria-label={label}
          className={`flex flex-col items-center px-2 py-1 ${
            pathname === href ? 'text-green-600' : 'text-gray-500 hover:text-green-500'
          }`}
        >
          <Icon className="h-7 w-7" />
          <span className="text-xs mt-1">{label}</span>
        </Link>
      ))}
    </nav>
  )
} 