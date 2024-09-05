import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import React from 'react'
import Link from 'next/link'
import { login } from '../action/user'

const Page = () => {
  return (
    <div className='mt-10 max-w-md w-full mx-auto rounded-none 2xl p-4 md:p-8 shadow-input'>
      <Card className="w-[350px]">
        <CardHeader>
          <CardTitle className='text-center'>LOGIN</CardTitle>
          <CardDescription>Please enter your email and password to signin</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={login}>
            <div className="grid w-full items-center gap-4">
              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input 
                  id="email"
                  type="email"
                  name='email'
                  placeholder="exemple@gmail.com" 
                  required
                />
              </div>
              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <Input 
                  id="password"
                  type="password"
                  name='password'
                  placeholder="**********" 
                  required
                />
                <p className="text-sm text-gray-600">
                  Pas encore de compte? <Link href="/register" className="text-blue-500">Créer un compte</Link>
                </p>
              </div>
              <div className="flex items-center justify-between">
                <Link href="/" passHref>
                  <Button type="button" className='flex-shrink-0'>Back</Button>
                </Link>
                <Button type="submit" className='flex-shrink-0'>Signin</Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

export default Page
