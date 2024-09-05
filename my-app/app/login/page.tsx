import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import React from 'react'

const page = () => {
  return (
    <div className='mt-10 max-w-md w-full mx-auto rounded-none 2xl p-4 md:p-8 shadow-input'>
      <Card className="w-[350px]">
      <CardHeader>
        <CardTitle className='text-center'>LOGIN</CardTitle>
        <CardDescription>Please enter your email and password to signin</CardDescription>
      </CardHeader>
      <CardContent>
        <form>
          <div className="grid w-full items-center gap-4">
            <div className="flex flex-col space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" placeholder="exemple@gmail.com" />
            </div>
            <div className="flex flex-col space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input id="password" placeholder="**********" />
            </div>
          </div>
        </form>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button className='ml-auto'>Signin</Button>
      </CardFooter>
    </Card>

    </div>
  )
}

export default page