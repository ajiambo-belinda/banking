'use client';

import React, { useCallback, useEffect, useState } from 'react'
import { Button } from './ui/button'
import { StyledString } from 'next/dist/build/swc/types';
import {PlaidLinkOnSuccess, PlaidLinkOptions, usePlaidLink} from 'react-plaid-link'
import { useRouter } from 'next/navigation';
import { createLinkToken, exchangePublicToken } from '@/lib/actions/user.actions';



interface PlaidLinkProps {
  user: any;
  variant?: 'primary' | 'ghost' | 'default';
}

const PlaidLink = ({user, variant}: PlaidLinkProps) => {
    const router = useRouter();

    const [token, setToken] = useState('');

    useEffect(() => {
        const getLinkToken = async () => {
            const data = await createLinkToken(user);
            
            setToken(data?.okenlinkT);
        }

        getLinkToken();

    }, [user]);
    const onSuccess = useCallback<PlaidLinkOnSuccess>(async (public_token: string) => {
       await exchangePublicToken({
            PublicToken: public_token,
            user
        })

        router.push('/');

    }, [user, router]);
    const config: PlaidLinkOptions = {
        token,
        onSuccess
        };
        const {open, ready } = usePlaidLink(config);
        
  return (
    <>
    {variant === 'primary' ?(
        <Button onClick = {()=> open} disabled={!ready}className='plaidlink-primary'>
            Connect bank
        </Button>
    ): variant === 'ghost' ?(
        <Button>
            Connect bank
        </Button>
    ): (
        <Button>
            Connect bank
        </Button>
    )}
    </>
  )
}

export default PlaidLink