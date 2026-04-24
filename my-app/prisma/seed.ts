import { PrismaClient, Condition } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const users = [
  { firstName: "Lucas", lastName: "N", email: "lucas@flipit.com" },
  { firstName: "Hadrien", lastName: "T", email: "hadrien@flipit.com" },
  { firstName: "Jeremy", lastName: "M", email: "jeremy@flipit.com" },
  { firstName: "Hugo", lastName: "R", email: "hugo@flipit.com" },
  { firstName: "Marie", lastName: "D", email: "marie@flipit.com" },
];

const products: {
  title: string;
  description: string;
  price: number;
  condition: Condition;
  brand: string;
  size: string;
  images: string[];
}[] = [
  {
    title: "Paire de Vans neuve",
    description: "Vans Old Skool neuves, jamais portées, taille 45.",
    price: 45,
    condition: "Neuf",
    brand: "Vans",
    size: "45",
    images: [
      "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800",
    ],
  },
  {
    title: "Planche Pro Model Aurelien Giraud",
    description: "Planche neuve 8.5 pouces, jamais montée.",
    price: 55,
    condition: "Neuf",
    brand: "Primitive",
    size: "8.5",
    images: [
      "https://images.unsplash.com/photo-1547447134-cd3f5c716030?w=800",
    ],
  },
  {
    title: "Trucks Venture utilisés",
    description: "Trucks Venture 5.8 en bon état, légèrement utilisés.",
    price: 35,
    condition: "Moyen_etat",
    brand: "Venture",
    size: "5.8",
    images: [
      "https://images.unsplash.com/photo-1520045892732-304bc3ac5d8e?w=800",
    ],
  },
  {
    title: "Casquette Polar",
    description: "Casquette Polar Skate Co., taille unique.",
    price: 5,
    condition: "Mauvais_etat",
    brand: "Polar",
    size: "L",
    images: [
      "https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=800",
    ],
  },
  {
    title: "Roues Spitfire 52mm",
    description: "Roues Spitfire Formula Four 52mm, très peu utilisées.",
    price: 30,
    condition: "Comme_neuf",
    brand: "Spitfire",
    size: "52mm",
    images: [
      "https://images.unsplash.com/photo-1597586124394-fedd0d895823?w=800",
    ],
  },
  {
    title: "Nike SB Dunk Low neuves",
    description: "Nike SB Dunk Low Pro coloris Fog, taille 42.",
    price: 110,
    condition: "Neuf",
    brand: "Nike SB",
    size: "42",
    images: [
      "https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=800",
    ],
  },
  {
    title: "Deck Almost 8.0",
    description: "Planche Almost en bon état, grip inclus.",
    price: 25,
    condition: "Bon_etat",
    brand: "Almost",
    size: "8.0",
    images: [
      "https://images.unsplash.com/photo-1547447134-cd3f5c716030?w=800",
    ],
  },
  {
    title: "Bearings Bones Reds",
    description: "Roulements Bones Reds, pack de 8, neufs.",
    price: 12,
    condition: "Neuf",
    brand: "Bones",
    size: "Standard",
    images: [
      "https://images.unsplash.com/photo-1520045892732-304bc3ac5d8e?w=800",
    ],
  },
  {
    title: "T-shirt HUF skate",
    description: "T-shirt HUF taille M, légèrement porté.",
    price: 15,
    condition: "Bon_etat",
    brand: "HUF",
    size: "M",
    images: [
      "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800",
    ],
  },
  {
    title: "Grip Mob blanc",
    description: "Grip tape Mob transparent/blanc, neuf dans l'emballage.",
    price: 8,
    condition: "Neuf",
    brand: "Mob",
    size: "9x33",
    images: [
      "https://images.unsplash.com/photo-1547447134-cd3f5c716030?w=800",
    ],
  },
  {
    title: "Trucks Independent 149",
    description: "Trucks Indy Stage 11, 149mm, comme neufs.",
    price: 50,
    condition: "Comme_neuf",
    brand: "Independent",
    size: "149",
    images: [
      "https://images.unsplash.com/photo-1520045892732-304bc3ac5d8e?w=800",
    ],
  },
  {
    title: "Hoodie Thrasher noir",
    description: "Sweat Thrasher Magazine Hood, taille L, bon état.",
    price: 40,
    condition: "Bon_etat",
    brand: "Thrasher",
    size: "L",
    images: [
      "https://images.unsplash.com/photo-1556821840-3a63f15732ce?w=800",
    ],
  },
  {
    title: "Emerica Reynolds G6",
    description: "Chaussures Emerica Reynolds G6 taille 43, très peu portées.",
    price: 65,
    condition: "Comme_neuf",
    brand: "Emerica",
    size: "43",
    images: [
      "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800",
    ],
  },
  {
    title: "Planche Powell Peralta 8.25",
    description: "Deck Powell Peralta Flight, légère et solide, bon état.",
    price: 38,
    condition: "Bon_etat",
    brand: "Powell Peralta",
    size: "8.25",
    images: [
      "https://images.unsplash.com/photo-1547447134-cd3f5c716030?w=800",
    ],
  },
  {
    title: "Roues OJ 54mm",
    description: "Roues OJ Super Juice 54mm 78a, idéales pour le street.",
    price: 22,
    condition: "Moyen_etat",
    brand: "OJ Wheels",
    size: "54mm",
    images: [
      "https://images.unsplash.com/photo-1597586124394-fedd0d895823?w=800",
    ],
  },
];

async function main() {
  console.log("Nettoyage de la base...");
  await prisma.message.deleteMany();
  await prisma.conversation.deleteMany();
  await prisma.offer.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.productImage.deleteMany();
  await prisma.product.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.authenticator.deleteMany();
  await prisma.user.deleteMany();

  console.log("Création des utilisateurs...");
  const hashedPassword = await bcrypt.hash("Password123!", 10);
  const createdUsers = await Promise.all(
    users.map((u) =>
      prisma.user.create({
        data: { ...u, password: hashedPassword },
      })
    )
  );

  console.log("Création des produits...");
  for (let i = 0; i < products.length; i++) {
    const { images, ...productData } = products[i];
    const owner = createdUsers[i % createdUsers.length];
    await prisma.product.create({
      data: {
        ...productData,
        userId: owner.id,
        images: {
          create: images.map((url) => ({ url, altText: productData.title })),
        },
      },
    });
  }

  console.log("Seed terminé !");
  console.log("Comptes créés (mot de passe : Password123!) :");
  users.forEach((u) => console.log(` - ${u.email}`));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
