# FlipIt - Marketplace for Second-Hand Skateboarding Equipment 🛹
![Project Screenshot](./public/flipit.png)
FlipIt is a marketplace platform that connects sellers and buyers of second-hand skateboarding equipment. This project uses **Next.js** for the front-end, **Tailwind CSS** for responsive design, and **Prisma** for managing the PostgreSQL database.

## Prerequisites ⚙️

Before you begin, ensure you have the following installed on your machine:

- **Nextjs**
- **Authjs**
- **Typescript**
- **Tailwindcss**
- **PostgreSQL** 🗄️
- **Prisma** 🔧

## Installation 🛠️

1. Clone this repository:
   ```bash
   git clone https://github.com/yourusername/flipit.git
   ```
2. Install the dependencies:
   ```bash
   npm install
   ```
3. Configure your local database. Important: The database has not been migrated to the cloud. To test the app, you will need to use your own local PostgreSQL instance.

- Create a PostgreSQL database locally.
- Modify the .env file in the root directory to reflect your local database settings:
   ```bash
   DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/DATABASE_NAME"
   ```
   **Replace USER, PASSWORD, and DATABASE_NAME with your own credentials and database name.**
4. Run the Prisma migrations to create the tables in your database:
  ```bash
   npx prisma migrate dev
   ```
5. Start the development server:
```bash
   npm run dev
   ```
  **The application will be available at: http://localhost:3000 🌐.**

## Features ✨

- User authentication (sign up, log in) 🔐
- Marketplace for buying and selling second-hand skateboarding equipment 💸
- Product management (add, edit, delete) 📦
- Shopping cart and checkout process 🛒

## Changes Made 📝

- Local Database: We have not migrated the database to the cloud. Make sure to set up a local PostgreSQL database and modify the .env file accordingly.
- Authentication System: Implemented authentication using NextAuth.js with Google and Credentials providers.
- Dark Mode: Integrated shadcn for dark mode 🌙 and adjusted the design based on the theme.

## Authors ✍️
- **Lucas NEGRE (https://github.com/LucasNGRE)** 🧑‍💻 - Full Stack dev
- **Hadrien TAYAC (https://github.com/Iaskasan)** 👩‍💻 - Full Stack dev
Feel free to reach out to us if you have any questions or suggestions!
