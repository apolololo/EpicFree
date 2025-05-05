// URL de l'API Epic Games pour les jeux gratuits
const EPIC_API_URL = 'https://store-site-backend-static.ak.epicgames.com/freeGamesPromotions';

// Initialisation de l'extension
chrome.runtime.onInstalled.addListener(() => {
  console.log('APO Epic Games Free Notifier installé');

  // Initialiser les paramètres par défaut
  chrome.storage.local.set({
    // notificationsEnabled: true, // Removed notification setting
    lastCheck: null, // Keep lastCheck for potential future use or manual refresh indication
    language: 'en' // Langue par défaut (anglais)
  });

  // Effectuer une première vérification immédiate
  fetchFreeGames();
});

// Écouter les messages de la popup (seulement pour fetch si nécessaire, mais le rafraîchissement automatique est supprimé)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'fetchFreeGames') {
    // Ce bloc peut être simplifié car le MIN_CHECK_INTERVAL est moins pertinent sans rafraîchissement automatique
    // On peut simplement déclencher le fetch
    fetchFreeGames();
    sendResponse({ success: true });
    return true; // Indique que sendResponse sera appelé de manière asynchrone
  }
  // Removed updateNotificationSettings listener
});

// Fonction principale pour récupérer les jeux gratuits
function fetchFreeGames() {
  // Enregistrer l'heure de la vérification
  const now = new Date();
  chrome.storage.local.set({ lastCheck: now.toISOString() });

  // Ajouter des paramètres de requête pour éviter la mise en cache
  const timestamp = now.getTime();
  // Note: locale and country parameters are kept as they affect the results
  const url = `${EPIC_API_URL}?locale=fr-FR&country=FR&allowCountries=FR&t=${timestamp}`;

  fetch(url)
    .then(response => {
      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      if (!data || !data.data || !data.data.Catalog || !data.data.Catalog.searchStore) {
        console.error('Format de données inattendu de l\'API Epic Games');
        return;
      }

      const games = data.data.Catalog.searchStore.elements;

      // Filtrer les jeux gratuits actuels et à venir
      const freeGames = games.filter(game => {
        return game.promotions &&
               (game.promotions.promotionalOffers.length > 0 ||
                game.promotions.upcomingPromotionalOffers.length > 0);
      });

      // Séparer les jeux gratuits actuels et à venir
      const currentFreeGames = [];
      const upcomingFreeGames = [];

      freeGames.forEach(game => {
        if (game.promotions.promotionalOffers.length > 0) {
          const offers = game.promotions.promotionalOffers[0].promotionalOffers;
          if (offers && offers.length > 0) {
            const startDate = new Date(offers[0].startDate);
            const endDate = new Date(offers[0].endDate);
            if (now >= startDate && now <= endDate && offers[0].discountSetting.discountPercentage === 0) {
              game.startDate = offers[0].startDate;
              game.endDate = offers[0].endDate;
              currentFreeGames.push(game);
            }
          }
        }

        if (game.promotions.upcomingPromotionalOffers.length > 0) {
          const offers = game.promotions.upcomingPromotionalOffers[0].promotionalOffers;
          if (offers && offers.length > 0) {
            const startDate = new Date(offers[0].startDate);
            const endDate = new Date(offers[0].endDate);
            if (now < startDate && offers[0].discountSetting.discountPercentage === 0) {
              game.startDate = offers[0].startDate;
              game.endDate = offers[0].endDate;
              upcomingFreeGames.push(game);
            }
          }
        }
      });

      // Removed checkForNewFreeGames call and notification logic

      // Sauvegarder les données
      const timestamp = now.toISOString();
      chrome.storage.local.set({
        currentFreeGames: currentFreeGames,
        upcomingFreeGames: upcomingFreeGames,
        lastUpdated: timestamp // Keep lastUpdated for display in popup if needed
      });

      // Informer la popup que les données ont été mises à jour
      chrome.runtime.sendMessage({
        action: 'gamesUpdated',
        timestamp: timestamp
      }, () => {
        if (chrome.runtime.lastError) {
          // This warning is expected if the popup is not open
          // console.warn('Aucun listener pour le message gamesUpdated.');
        }
      });

      console.log(`Données mises à jour: ${currentFreeGames.length} jeux gratuits actuels, ${upcomingFreeGames.length} jeux à venir`);
    })
    .catch(error => {
      console.error('Erreur lors de la récupération des jeux gratuits:', error);
    });
}

// Removed notification click listener
