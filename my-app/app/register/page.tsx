"use client"; 
import { Suspense } from "react";  
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { register } from "../action/user"; 
import { Button } from "@/components/ui/button";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

interface RegisterResponse {
  success: boolean;
  message?: string;
  emailExists?: boolean;
}

const Register = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";

  const [formData, setFormData] = useState({
    username: "",
    firstname: "",
    lastname: "",
    email: "",
    password: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
  
    try {
      const formDataToSend = new FormData();
      formDataToSend.append("username", formData.username);
      formDataToSend.append("firstname", formData.firstname);
      formDataToSend.append("lastname", formData.lastname);
      formDataToSend.append("email", formData.email);
      formDataToSend.append("password", formData.password);
      formDataToSend.append("callbackUrl", callbackUrl);
  
      // Envoi des données au serveur pour l'enregistrement
      const response = await register(formDataToSend);
  
      if (response.success) {
        toast.success(response.message);
        router.push(callbackUrl); // Redirection après succès
      } else {
        toast.error(response.message); // Affichage du message d'erreur
      }
    } catch (error) {
      console.error("Registration error:", error);
      toast.error("An error occurred during registration.");
    }
  };
  

  return (
    <div className="relative mt-10 max-w-md w-full mx-auto rounded-none md:rounded-2xl p-4 md:p-8 shadow-input bg-white border border-[#121212] dark:bg-black">
      <h2 className="font-bold text-xl text-neutral-800 dark:text-neutral-200">Créer un compte</h2>
      <form className="my-8" onSubmit={handleRegister}>
        <div className="flex flex-col md:flex-row space-y-2 md:space-y-0 md:space-x-2 mb-4">
          <div className="flex flex-col">
            <Label htmlFor="firstname" className="mb-2">Prénom</Label>
            <Input id="firstname" placeholder="Tyler" type="text" name="firstname" onChange={handleChange} />
          </div>
          <div className="flex flex-col">
            <Label htmlFor="lastname" className="mb-2">Nom</Label>
            <Input id="lastname" placeholder="Durden" type="text" name="lastname" onChange={handleChange} />
          </div>
        </div>

        <div className="flex flex-col mb-5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" placeholder="exemple@gmail.com" type="email" name="email" onChange={handleChange} />
        </div>

        <div className="flex flex-col mb-5">
          <Label htmlFor="password">Mot de passe</Label>
          <Input id="password" placeholder="***********" type="password" name="password" onChange={handleChange} />
        </div>

        <Button type="submit" className="ml-auto block">S&apos;enregistrer &rarr;</Button>
      </form>
    </div>
  );
};

// Composant wrapper avec Suspense
export default function RegisterPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <Register />
    </Suspense>
  );
}
