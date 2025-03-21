import { auth } from '@/lib/auth';

export const getSession = async () => {
  try {
    console.log('Tentative de récupération de la session...');
    const session = await auth(); // Appelle la fonction d'auth pour obtenir la session
    
    // Vérifie si la session existe après l'appel
    if (!session) {
      console.log('Aucune session trouvée');
    } else {
      console.log('Session trouvée:', session); // Log de la session pour voir l'ID utilisateur
    }

    return session;
  } catch (error) {
    console.error('Erreur lors de la récupération de la session:', error);
    return null;
  }
};
