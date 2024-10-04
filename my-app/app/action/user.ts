"use server";

import prisma from "@/lib/db";
import { hash } from "bcryptjs";
import { signIn, signOut } from "next-auth/react";
import { redirect } from "next/navigation";

const login = async (formData: FormData) => {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  try {
    const res = await signIn("credentials", {
      redirect: false, // prevent automatic redirection
      email,
      password,
    });

    // Check if the login was successful
    if (res?.error) {
      console.error(res.error); // Handle the error
      return res.error; // Return the error message
    }

    // If successful, manually redirect to the homepage
    redirect("/"); // This works if you're using this on the server side

  } catch (error) {
    console.error("An unexpected error occurred:", error);
    return "An unexpected error occurred";
  }
};

const register = async (formData: FormData) => {
  const firstName = formData.get("firstname") as string;
  const lastName = formData.get("lastname") as string;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!firstName || !lastName || !email || !password) {
    throw new Error("Please fill all fields");
  }

  // Check if the user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });
  if (existingUser) throw new Error("User already exists");

  const hashedPassword = await hash(password, 12);

  await prisma.user.create({
    data: {
      firstName,
      lastName,
      email,
      password: hashedPassword,
    },
  });
  console.log(`User created successfully 🥂`);
  redirect("/login");
};

const fetchAllUsers = async () => {
  const users = await prisma.user.findMany();
  return users;
};

const performSignOut = async () => {
  await signOut({ redirect: false });
};


export { register, login, fetchAllUsers, performSignOut };
