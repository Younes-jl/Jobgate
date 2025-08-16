/**
 * Formate une date au format ISO en date lisible
 * @param {string} isoDateString - Date au format ISO
 * @returns {string} Date formatée
 */
export const formatDate = (isoDateString) => {
  if (!isoDateString) return '';
  
  const date = new Date(isoDateString);
  
  // Options de formatage
  const options = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  };
  
  return date.toLocaleDateString('fr-FR', options);
};

/**
 * Calcule le temps écoulé depuis une date donnée
 * @param {string} isoDateString - Date au format ISO
 * @returns {string} Temps écoulé (ex: "il y a 2 jours")
 */
export const timeAgo = (isoDateString) => {
  if (!isoDateString) return '';
  
  const date = new Date(isoDateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);
  
  if (diffInSeconds < 60) {
    return 'il y a quelques secondes';
  }
  
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `il y a ${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''}`;
  }
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `il y a ${diffInHours} heure${diffInHours > 1 ? 's' : ''}`;
  }
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 30) {
    return `il y a ${diffInDays} jour${diffInDays > 1 ? 's' : ''}`;
  }
  
  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) {
    return `il y a ${diffInMonths} mois`;
  }
  
  const diffInYears = Math.floor(diffInMonths / 12);
  return `il y a ${diffInYears} an${diffInYears > 1 ? 's' : ''}`;
};
