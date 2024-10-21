"use client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { register } from "../action/user"; // Adjust path if needed
import { Button } from "@/components/ui/button";
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from "react";
import { toast } from 'sonner';

interface RegisterResponse {
  success: boolean;
  message?: string; // Add more properties if needed
  emailExists?: boolean; // To indicate if email is already in use
}

const Register = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/';

  // Form data state
  const [formData, setFormData] = useState({
    username: '',
    firstname: '',
    lastname: '',
    email: '',
    password: ''
  });

  // Handle input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  // Handle registration form submission
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('username', formData.username);
      formDataToSend.append('firstname', formData.firstname);
      formDataToSend.append('lastname', formData.lastname);
      formDataToSend.append('email', formData.email);
      formDataToSend.append('password', formData.password);
      formDataToSend.append('callbackUrl', callbackUrl);  // Add callback URL

      // Call the register function
      const response: RegisterResponse = await register(formDataToSend);

      if (response.success) {
        toast.success('Registration successful');
        router.push(callbackUrl); // Redirect on success
      } else if (response.emailExists) {
        // If the email already exists, show error without redirection
        toast.error('Email already in use.');
      } else {
        // Handle other registration errors
        toast.error(response.message || 'Registration failed. Please try again.');
      }
    } catch (error) {
      toast.error('An error occurred during registration.');
    }
  };
  
  return (
    <div className="relative mt-10 max-w-md w-full mx-auto rounded-none md:rounded-2xl p-4 md:p-8 shadow-input bg-white border border-[#121212] dark:bg-black">
      <div className="absolute top-4 right-4"></div>

      <h2 className="font-bold text-xl text-neutral-800 dark:text-neutral-200">
        Créer un compte
      </h2>
      <p className="text-neutral-600 text-sm max-w-sm mt-2 dark:text-neutral-300">
        Merci de fournir les informations suivantes
      </p>

      {/* Registration Form */}
      <form className="my-8" onSubmit={handleRegister}>
        <div className="flex flex-col md:flex-row space-y-2 md:space-y-0 md:space-x-2 mb-4">
          <div className="flex flex-col">
            <Label htmlFor="firstname" className="mb-2">Prénom</Label>
            <Input
              id="firstname"
              placeholder="Tyler"
              type="text"
              name="firstname"
              onChange={handleChange}
            />
          </div>
          <div className="flex flex-col">
            <Label htmlFor="lastname" className="mb-2">Nom</Label>
            <Input
              id="lastname"
              placeholder="Durden"
              type="text"
              name="lastname"
              onChange={handleChange}
            />
          </div>
        </div>

        <div className="flex flex-col mb-5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            placeholder="exemple@gmail.com"
            type="email"
            name="email"
            onChange={handleChange}
          />
        </div>

        <div className="flex flex-col mb-5">
          <Label htmlFor="password">Mot de passe</Label>
          <Input
            id="password"
            placeholder="***********"
            type="password"
            name="password"
            onChange={handleChange}
          />
        </div>

        {/* Link to login page with callbackUrl */}
        <p className="text-neutral-600 text-sm max-w-sm mt-2 dark:text-neutral-300">
          Déjà un compte?{' '}
          <Link href={`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`} className="text-blue-500">
            Se connecter
          </Link>
        </p>

        {/* Submit button for registration */}
        <Button type="submit" className="ml-auto block">S'enregistrer &rarr;</Button>
      </form>
    </div>
  );
};

export default Register;
