import fr from './fr.js';
import en from './en.js';

// Objet contenant toutes les traductions
const translations = {
  fr,
  en
};

// Langue par défaut
const DEFAULT_LANGUAGE = 'en';

// Fonction pour charger la langue préférée
async function loadPreferredLanguage() {
  try {
    // Essayer de récupérer la langue sauvegardée
    const result = await new Promise((resolve) => {
      chrome.storage.local.get('language', (data) => {
        resolve(data.language);
      });
    });
    
    // Si une langue est sauvegardée, l'utiliser
    if (result) {
      return result;
    }
    
    // Sinon, utiliser la langue par défaut
    return DEFAULT_LANGUAGE;
  } catch (error) {
    console.error('Erreur lors du chargement de la langue :', error);
    return DEFAULT_LANGUAGE;
  }
}

// Fonction pour changer la langue
async function changeLanguage(lang) {
  if (!translations[lang]) {
    console.error(`Langue non supportée : ${lang}`);
    return false;
  }
  
  try {
    // Sauvegarder la nouvelle préférence de langue
    await new Promise((resolve) => {
      chrome.storage.local.set({ language: lang }, resolve);
    });
    
    // Recharger la page pour appliquer la nouvelle langue
    window.location.reload();
    return true;
  } catch (error) {
    console.error('Erreur lors du changement de langue :', error);
    return false;
  }
}

// Fonction pour obtenir les traductions dans la langue spécifiée
function getTranslations(lang) {
  return translations[lang] || translations[DEFAULT_LANGUAGE];
}

export { loadPreferredLanguage, changeLanguage, getTranslations };