'use client';  // This marks this file as a client component

import { useState } from 'react';
import { useRouter } from 'next/navigation'; // Client-side router
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { login } from '../action/user';  // Import your login action
import { signIn } from '@/auth';
import { IconBrandGoogle } from '@tabler/icons-react';

export default function Login() {
    const router = useRouter();  // Client-side router
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function handleLogin(e: any) {
        e.preventDefault();  // Prevent the form's default submission behavior
        setLoading(true);
        
        // Extract form data
        const email = e.target.email.value;
        const password = e.target.password.value;
        
        try {
            const formData = new FormData();
            formData.append('email', email);
            formData.append('password', password);
            const response = await login(formData);  // Pass the credentials to login
            if (response === 'success') {
                router.push('/');  // Redirect on successful login
            } else {
                setError('Login failed. Please check your credentials.');
            }
        } catch (err) {
            setError('An error occurred while logging in.');
        }

        setLoading(false);
    }

    return (
        <div className="mt-10 max-w-md w-full mx-auto rounded-none md:rounded-2xl p-4 md:p-8 shadow-input bg-white border border-[#121212] dark:bg-black">
            <form className="my-8" onSubmit={handleLogin}>
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

                {/* Display error message if login fails */}
                {error && <p className="text-red-500">{error}</p>}

                {/* Buttons: Back and Login */}
                <div className="flex justify-between items-center">
                    <Link href="/" passHref>
                        <Button type="button" variant="outline" className="w-24">
                            Back
                        </Button>
                    </Link>
                    <Button type="submit" className="w-24" disabled={loading}>
                        {loading ? 'Logging in...' : 'Login →'}
                    </Button>
                </div>

                <p className="text-right text-neutral-600 text-sm max-w-sm mt-4 dark:text-neutral-300">
                    Do not have an account? <Link href="/register" className="text-blue-500">Register</Link>
                </p>

                <div className="bg-gradient-to-r from-transparent via-neutral-300 dark:via-neutral-700 to-transparent my-8 h-[1px] w-full" />
            </form>

            <form onSubmit={async (e) => {
                e.preventDefault();
                await signIn('google');  // Google sign-in
            }}>
                <Button className="relative group/btn flex space-x-2 items-center justify-start px-4 w-full rounded-md h-10 font-medium shadow-input"
                    type="submit">
                    <IconBrandGoogle className="h-4 w-4" />
                    <span className="text-sm">Login with Google</span>
                </Button>
            </form>
        </div>
    );
}
