import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Truck, Package } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const formSchema = z.object({
  modeDelivraison: z.enum(["standard", "express"], {
    required_error: "Veuillez sélectionner un mode de livraison.",
  }),
  nomComplet: z.string().min(2, {
    message: "Le nom complet doit contenir au moins 2 caractères.",
  }),
  adresse: z.string().min(5, {
    message: "L'adresse doit contenir au moins 5 caractères.",
  }),
  complementAdresse: z.string().optional(),
  codePostal: z.string().regex(/^\d{5}$/, {
    message: "Le code postal doit contenir 5 chiffres.",
  }),
  ville: z.string().min(2, {
    message: "La ville doit contenir au moins 2 caractères.",
  }),
  pays: z.string().min(2, {
    message: "Veuillez sélectionner un pays.",
  }),
})

export default function ShippingForm() {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      modeDelivraison: "standard",
      nomComplet: "",
      adresse: "",
      complementAdresse: "",
      codePostal: "",
      ville: "",
      pays: "fr",
    },
  })

  function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true)
    // Simuler un appel API
    setTimeout(() => {
      console.log(values)
      setIsSubmitting(false)
      // Ici, vous enverriez normalement les données à votre backend ou mettriez à jour l'état de votre application
    }, 1000)
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Informations de livraison</CardTitle>
        <CardDescription>Choisissez votre mode de livraison et entrez votre adresse de livraison.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((onSubmit))} className="space-y-8">
            <FormField
              control={form.control}
              name="modeDelivraison"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>Mode de livraison</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="flex flex-col space-y-1 sm:flex-row sm:space-x-4 sm:space-y-0"
                    >
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="standard" />
                        </FormControl>
                        <FormLabel className="font-normal">
                          <Truck className="w-4 h-4 inline-block mr-2" />
                          Livraison standard (3-5 jours)
                        </FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="express" />
                        </FormControl>
                        <FormLabel className="font-normal">
                          <Package className="w-4 h-4 inline-block mr-2" />
                          Livraison express (1-2 jours)
                        </FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="nomComplet"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nom complet</FormLabel>
                    <FormControl>
                      <Input placeholder="Jean Dupont" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="adresse"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Adresse</FormLabel>
                    <FormControl>
                      <Input placeholder="123 rue de la Paix" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="complementAdresse"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Complément d&apos;adresse (Optionnel)</FormLabel>
                    <FormControl>
                      <Input placeholder="Appartement 4B" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="codePostal"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Code postal</FormLabel>
                    <FormControl>
                      <Input placeholder="75001" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="ville"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ville</FormLabel>
                    <FormControl>
                      <Input placeholder="Paris" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="pays"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pays</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionnez un pays" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="fr">France</SelectItem>
                        <SelectItem value="be">Belgique</SelectItem>
                        <SelectItem value="ch">Suisse</SelectItem>
                        <SelectItem value="lu">Luxembourg</SelectItem>
                        <SelectItem value="mc">Monaco</SelectItem>
                        {/* Ajoutez d'autres pays si nécessaire */}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </form>
        </Form>
      </CardContent>
      <CardFooter>
        <Button type="submit" className="w-full" disabled={isSubmitting} onClick={form.handleSubmit(onSubmit)}>
          {isSubmitting ? "Enregistrement..." : "Enregistrer les informations"}
        </Button>
      </CardFooter>
    </Card>
  )
}