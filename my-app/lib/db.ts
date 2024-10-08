import { PrismaClient } from '@prisma/client'

const prismaClientSingleton = () => {
  return new PrismaClient()
}

declare const globalThis: {
  prismaGlobal: ReturnType<typeof prismaClientSingleton>;
} & typeof global;

const prisma = globalThis.prismaGlobal ?? prismaClientSingleton()

export default prisma

if (process.env.NODE_ENV !== 'production') globalThis.prismaGlobal = prisma

export const getProductById = async (id: number) => {
  // Remplacez ceci par votre logique réelle pour interroger la base de données
  // Par exemple, si vous utilisez Prisma, vous pourriez avoir quelque chose comme :
  const product = await prisma.product.findUnique({
    where: { id: Number(id) },
  });
  return product;
};