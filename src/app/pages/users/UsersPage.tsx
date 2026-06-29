import { useState } from 'react'
import { cn } from '../../components/ui/utils'
import { UserList } from './UserList'
import { MemberApplicationList } from './MemberApplicationList'

type Tab = 'users' | 'applications'

const tabs: { key: Tab; label: string }[] = [
  { key: 'users', label: '用户管理' },
  { key: 'applications', label: '会员申请' },
]

export function UsersPage() {
  const [activeTab, setActiveTab] = useState<Tab>('users')

  return (
    <div className="space-y-4">
      <div className="flex border-b">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
              activeTab === tab.key
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {activeTab === 'users' ? <UserList /> : <MemberApplicationList />}
    </div>
  )
}
