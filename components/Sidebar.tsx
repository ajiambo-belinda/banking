'use client'

import React from 'react'
import Image from 'next/image'
import Link from 'next/link' 
import { sidebarLinks } from '@/constants'
import { cn } from '@/lib/utils'
import { usePathname } from 'next/navigation'



interface SidebarProps {
  user: any;
}

const Sidebar = ({ user }: SidebarProps) => {
  const pathname = usePathname()
  console.log('SIDEBAR LINKS:', sidebarLinks)
  
  return (
    <section className='sidebar'>
      <nav className='flex flex-col gap-4'>
        
        <Link href="/" className="mb-12 cursor-pointer flex items-center gap-2">
          <Image 
            src="/icons/logo.svg"
            width={34}
            height={34}
            alt="Horizon logo"
            className="size-[24px] max-xl:size-14"
          />
          <h1 className='sidebar-logo'>Horizon</h1>
        </Link>
        
        {sidebarLinks.map((item) => {
          const isActive = pathname === item.route || pathname.startsWith(`${item.route}/`)

          console.log(`Link: ${item.label}, imgURL: ${item.imgURL}`)
          
          return (
            <Link 
              href={item.route} 
              key={item.label}
              className={cn(
                'sidebar-link',
                isActive && 'bg-bank-gradient text-white'
              )}
            >
              <div className='relative size-6'>
                <Image  
                  src={item.imgURL}
                  alt={item.label}
                  fill
                  className={cn({
                    'brightness-[3] invert-0': isActive
                  })}
                />
              </div>
              <p className={cn("sidebar-label", isActive && "!text-white")}>
                {item.label}
              </p>
            </Link>
          )
        })}

        USER
      </nav>
      <footer  user= {user}/>
    </section>
  )
}

export default Sidebar