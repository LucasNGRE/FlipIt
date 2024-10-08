import { NextRequest, NextResponse } from 'next/server';
import { auth } from "@/auth";
import { currentUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const session = await currentUser();
    // Vérifie si la session est valide
    if (!session) {
      return new NextResponse(JSON.stringify({ message: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  
    // Si l'utilisateur est authentifié, continue avec la logique de la réponse
    return new NextResponse(JSON.stringify({ message: 'Hello, authenticated world!' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  