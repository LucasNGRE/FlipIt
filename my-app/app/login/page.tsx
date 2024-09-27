import { login } from '../action/user';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { IconBrandGoogle } from '@tabler/icons-react';
import { signIn } from '@/auth';
import Link from 'next/link';
import React from 'react';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/getSession';
import { Button } from '@/components/ui/button';
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Login | FlipIt",
  description: "Log in",
};


const Login = async () => {
    const session = await getSession();
    const user = session?.user;
    if (user) redirect('/');

    return (
        <div className="mt-10 max-w-md w-full mx-auto rounded-none md:rounded-2xl p-4 md:p-8 shadow-input bg-white border border-[#121212] dark:bg-black">
            <form className="my-8" action={login}>
                <Label htmlFor="email">Email Address</Label>
                <Input
                    id="email"
                    placeholder="exemple@gmail.com"
                    type="email"
                    name="email"
                />

                <Label htmlFor="password">Password</Label>
                <Input
                    id="password"
                    placeholder="*************"
                    type="password"
                    name="password"
                    className="mb-6"
                />

                {/* Boutons alignés : Back et Login */}
                <div className="flex justify-between items-center">
                    <Link href="/" passHref>
                        <Button type="button" variant="outline" className="w-24">
                            Back
                        </Button>
                    </Link>
                    <Button type="submit" className="w-24">
                        Login &rarr;
                    </Button>
                </div>

                <p className="text-right text-neutral-600 text-sm max-w-sm mt-4 dark:text-neutral-300">
                    Do not have an account? <Link href="/register" className="text-blue-500">Register</Link>
                </p>

                <div className="bg-gradient-to-r from-transparent via-neutral-300 dark:via-neutral-700 to-transparent my-8 h-[1px] w-full" />
            </form>

            <form action={async () => {
                'use server';
                await signIn('google');
            }}>
                <Button className="relative group/btn flex space-x-2 items-center justify-start px-4 w-full rounded-md h-10 font-medium shadow-input "
                    type="submit">
                    <IconBrandGoogle className="h-4 w-4 " />
                    <span className=" text-sm">Login with Google</span>
                </Button>
            </form>
        </div>
    );
};

export default Login;
