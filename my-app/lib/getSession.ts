import { auth } from '@/auth';
import { cache } from 'react';

export const getSession = cache(async () => {
  try {
    const session = await auth(); // Appelle la fonction d'auth pour obtenir la session
    if (!session) {
      console.log('Aucune session trouvée');
    } else {
      console.log('Session trouvée:', session); // Tu devrais maintenant voir l'ID utilisateur ici
    }
    return session;
  } catch (error) {
    console.error('Erreur lors de la récupération de la session:', error);
    return null;
  }
});
