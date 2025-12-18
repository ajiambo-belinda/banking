import React from 'react'
import Image from 'next/image'
import { logoutAccount } from '@/lib/actions/user.actions'
import {useRouter} from 'next/navigation'

const footer = ({user, type = "desktop"}: FooterProps) => {

    const router = useRouter();
    const handleLogOut = async () =>{
        const logOut = await logoutAccount();

        if (loggedOut) router.push('/sign-in')
    }
  return (
    <footer className='footer'>
        <div className={type === 'mobile' ? 'footer_name-mobile' : 'footer_name'}>
            <p className='text-xl font-bold text-gray-700'>
                {user?.name[0]}
            </p>
        </div>
        <div className={type === 'mobile' ? 'footer_email-mobile' : 'footer_email'}>
            <h1 className='text-14 truncate text-grey-700 font-semibold'>
                {user?.name}
            </h1>
            <p className='text-14 truncate font-normal text-gray-600'> 
                {user?.email}
                </p>
        </div>
        <div className='footer_image' onClick={handleLogOut}>
            <Image src="icons/logout.scg" fill alt="jsm"/>
        </div>
    </footer>
  )
}

export default footer