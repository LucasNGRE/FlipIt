import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { register } from "../action/user";
import { Button } from "@/components/ui/button";

const Register = async () => {
  return (
    <div className="relative mt-10 max-w-md w-full mx-auto rounded-none md:rounded-2xl p-4 md:p-8 shadow-input bg-white border border-[#121212] dark:bg-black">
      <div className="absolute top-4 right-4">
      </div>

      <h2 className="font-bold text-xl text-neutral-800 dark:text-neutral-200">
        Créer un compte
      </h2>
      <p className="text-neutral-600 text-sm max-w-sm mt-2 dark:text-neutral-300">
        Merci de fournir les informations suivantes
      </p>

      <form className="my-8" action={register}>
        <div className="flex flex-col md:flex-row space-y-2 md:space-y-0 md:space-x-2 mb-4">
          <div className="flex flex-col">
            <Label htmlFor="firstname" className="mb-2">
              Prénom
            </Label>
            <Input
              id="firstname"
              placeholder="Tyler"
              type="text"
              name="firstname"
            />
          </div>
          <div className="flex flex-col">
            <Label htmlFor="lastname" className="mb-2">
              Nom
            </Label>
            <Input
              id="lastname"
              placeholder="Durden"
              type="text"
              name="lastname"
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
          />
        </div>

        <div className="flex flex-col mb-5">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            placeholder="***********"
            type="password"
            name="password"
          />
        </div>

        {/* P tag for login link below the inputs */}
        <p className="text-neutral-600 text-sm max-w-sm mt-2 dark:text-neutral-300">
          Déjà un compte? <Link href="/login" className="text-blue-500">Login</Link>
        </p>

        {/* Align the button to the right */}
        <Button type="submit" className="ml-auto block">Sign up &rarr;</Button>
      </form>
    </div>
  );
};

export default Register;
