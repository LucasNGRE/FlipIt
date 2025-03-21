"use server";

import prisma from "@/lib/db";
import { hash } from "bcryptjs";
import { CredentialsSignin } from "next-auth";
import { signIn, signOut } from "@/lib/auth"; // Assurez-vous d'importer depuis 'next-auth/react'
import { redirect } from "next/navigation";

const login = async (formData: FormData) => {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  try {
    await signIn("credentials", {
        redirect: false,
        email,
        password,
      });
      return true;
    } catch (error) {
    // handle the error
    const someError = error as CredentialsSignin;
    console.error(error);
    return someError.cause;
  };
};

const register = async (formData: FormData) => {
  const firstName = formData.get("firstname") as string;
  const lastName = formData.get("lastname") as string;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!firstName || !lastName || !email || !password) {
    throw new Error("Please fill all fields");
  }

  try {
    // Check if the user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new Error("User already exists");
    }

    const hashedPassword = await hash(password, 12);
    console.log("Creating user with data:", { firstName, lastName, email, hashedPassword });

    await prisma.user.create({
      data: {
        firstName,
        lastName,
        email,
        password: hashedPassword,
      },
    });
    console.log("User created successfully 🥂");
    return { success: true, message: "Registration successful!" };
  } catch (error) {
    console.error("Error during registration:", error);
    return { success: false, message: (error instanceof Error ? error.message : "An error occurred during registration") };
  }
};


const fetchAllUsers = async () => {
  const users = await prisma.user.findMany();
  return users;
};

const performSignOut = async () => {
  await signOut({ redirect: false });
};


export { register, login, fetchAllUsers, performSignOut };