// Importer les fonctions de traduction
import { loadPreferredLanguage, changeLanguage, getTranslations } from './locales/index.js';

// Variables globales
let currentLanguage = 'en'; // Langue par défaut
let translations = {}; // Objet contenant les traductions

// Code simplifié pour éviter les problèmes de chargement
window.onload = async function() {
  console.log('Fenêtre chargée');

  // Charger la langue préférée avant d'initialiser l'application
  try {
    currentLanguage = await loadPreferredLanguage();
    translations = getTranslations(currentLanguage);
    console.log(`Langue chargée : ${currentLanguage}`);
    
    // Initialiser l'interface après un délai pour s'assurer que tout est chargé
    setTimeout(initApp, 500);
  } catch (error) {
    console.error('Erreur lors du chargement de la langue :', error);
    // Fallback à l'initialisation standard
    translations = getTranslations('fr');
    setTimeout(initApp, 500);
  }
};

// Fonction principale d'initialisation
function initApp() {
  console.log('Initialisation de l\'application');
  
  // Appliquer les traductions à l'interface
  applyTranslations();

  // Récupérer les éléments DOM de manière plus robuste
  var currentGamesContainer = document.getElementById('current-games');
  var upcomingGamesContainer = document.getElementById('upcoming-games');
  var mainEpicLinkButton = document.getElementById('main-epic-link');
  var languageToggleButton = document.getElementById('language-toggle');

  // Vérifier les éléments essentiels
  if (!currentGamesContainer || !upcomingGamesContainer || !mainEpicLinkButton) {
    console.error('Éléments DOM essentiels non trouvés');
    return;
  }

  // Ajouter l'écouteur d'événement pour le bouton principal
  mainEpicLinkButton.addEventListener('click', () => {
    chrome.tabs.create({ url: 'https://store.epicgames.com' });
  });
  
  // Ajouter l'écouteur d'événement pour le bouton de langue
  if (languageToggleButton) {
    languageToggleButton.addEventListener('click', async () => {
      // Basculer entre français et anglais
      const newLanguage = currentLanguage === 'fr' ? 'en' : 'fr';
      await changeLanguage(newLanguage);
    });
  }

  // Charger les jeux depuis le stockage local
  loadGames();

  // Écouter les mises à jour du background script
  chrome.runtime.onMessage.addListener(function(message) {
    if (message.action === 'gamesUpdated') {
      console.log('Mise à jour des jeux reçue');
      loadGames();
    }
  });

  // Fonction pour charger les jeux
  function loadGames() {
    chrome.storage.local.get(['currentFreeGames', 'upcomingFreeGames'], function(data) {
      // Traiter les jeux gratuits actuels
      if (data.currentFreeGames && data.currentFreeGames.length > 0) {
        displayGames(currentGamesContainer, data.currentFreeGames, 'current');
      } else {
        showNoGamesMessage(currentGamesContainer, translations.no_current_games);
      }

      // Traiter les jeux gratuits à venir
      if (data.upcomingFreeGames && data.upcomingFreeGames.length > 0) {
        displayGames(upcomingGamesContainer, data.upcomingFreeGames, 'upcoming');
      } else {
        showNoGamesMessage(upcomingGamesContainer, translations.no_upcoming_games);
      }
    });
  }

  // Fonction pour afficher les jeux
  function displayGames(container, games, type) {
    container.innerHTML = '';

    if (games.length === 0) {
        showNoGamesMessage(container, type === 'current' ? translations.no_current_games : translations.no_upcoming_games);
        return;
    }

    for (var i = 0; i < games.length; i++) {
      var gameCard = createGameCard(games[i], type);
      container.appendChild(gameCard);
    }
  }

  // Fonction pour créer une carte de jeu
  function createGameCard(game, type) {
    var gameCard = document.createElement('div');
    gameCard.className = 'game-card';
    gameCard.setAttribute('data-game-id', game.id);

    // Conteneur principal pour le visualiseur d\'images
    var imageViewer = document.createElement('div');
    imageViewer.className = 'image-viewer';

    // Conteneur pour les images (pour positionnement absolu)
    var imageContainer = document.createElement('div');
    imageContainer.className = 'image-container';

    let imagesToDisplay = [];
    const imageUrls = new Set(); // Use a Set to track unique image URLs

    if (game.keyImages && game.keyImages.length > 0) {
        // Filter for standard web image URLs and prioritize types, ensuring unique URLs
        const preferredTypes = ['OfferImageWide', 'DieselStoreFrontWide'];
        const secondaryTypes = ['OfferImageTall', 'DieselStoreFrontTall'];

        // Add preferred types first
        game.keyImages.forEach(img => {
            if (img.url && (img.url.startsWith('http://') || img.url.startsWith('https://')) && preferredTypes.includes(img.type) && !imageUrls.has(img.url)) {
                imagesToDisplay.push(img);
                imageUrls.add(img.url);
            }
        });

        // Add secondary types if not already added
        game.keyImages.forEach(img => {
             if (img.url && (img.url.startsWith('http://') || img.url.startsWith('https://')) && secondaryTypes.includes(img.type) && !imageUrls.has(img.url)) {
                imagesToDisplay.push(img);
                imageUrls.add(img.url);
            }
        });

        // Add any other image types with valid URLs if not already added
        game.keyImages.forEach(img => {
            if (img.url && (img.url.startsWith('http://') || img.url.startsWith('https://')) && !imageUrls.has(img.url)) {
                imagesToDisplay.push(img);
                imageUrls.add(img.url);
            }
        });
    }

    // If there are images to display, add them to the container
    if (imagesToDisplay.length > 0) {
        imagesToDisplay.forEach((img, index) => {
            const imgElement = document.createElement('img');
            imgElement.src = img.url;
            imgElement.alt = img.alt || game.title;
            imgElement.className = 'game-image';

            // Add error listener to remove the image element if it fails to load
            imgElement.addEventListener('error', function() {
                console.warn('Failed to load image:', this.src);
                const wasActive = this.classList.contains('active');
                this.remove(); // Remove the image element from the DOM

                // If the removed image was active, try to activate the next available image
                if (wasActive) {
                    const remainingImages = imageContainer.querySelectorAll('.game-image');
                    if (remainingImages.length > 0) {
                        // Activate the first remaining image
                        remainingImages[0].classList.add('active');
                    } else {
                        // If no images left, display the default icon
                         const defaultImgElement = document.createElement('img');
                         defaultImgElement.src = '../icons/icon128.png';
                         defaultImgElement.alt = 'Image par défaut';
                         defaultImgElement.className = 'game-image active';
                         imageContainer.appendChild(defaultImgElement);
                    }
                }

                // Check if navigation buttons are still needed
                updateNavigationButtons(gameCard);
            });

            imageContainer.appendChild(imgElement);
        });

        // Explicitly activate the first image element added
        const firstImageElement = imageContainer.querySelector('.game-image');
        if (firstImageElement) {
             firstImageElement.classList.add('active');
        }


        // Add navigation buttons if there's more than one image initially planned for display
        if (imagesToDisplay.length > 1) {
            const prevButton = document.createElement('button');
            prevButton.className = 'nav-button prev';
            prevButton.innerHTML = '&#10094;'; // Left arrow character
            prevButton.addEventListener('click', () => navigateImages(gameCard, -1));
            imageViewer.appendChild(prevButton);

            const nextButton = document.createElement('button');
            nextButton.className = 'nav-button next';
            nextButton.innerHTML = '&#10095;'; // Right arrow character
            nextButton.addEventListener('click', () => navigateImages(gameCard, 1));
            imageViewer.appendChild(nextButton);
        }

    } else {
        // If no images with URLs, display only the default icon
        const imgElement = document.createElement('img');
        imgElement.src = '../icons/icon128.png';
        imgElement.alt = 'Image par défaut';
        imgElement.className = 'game-image active'; // Make default image active
        imageContainer.appendChild(imgElement);
        // No navigation buttons added as there's only one image (the default)
    }

    imageViewer.appendChild(imageContainer);
    gameCard.appendChild(imageViewer);


    // Utiliser la description complète
    // Note: Les descriptions des jeux proviennent directement de l'API Epic Games
    // et peuvent ne pas être dans la même langue que l'interface
    var description = game.description || (currentLanguage === 'fr' ? 'Aucune description disponible.' : 'No description available.');

    // Formater les dates et déterminer le texte de la date
    var dateText = '';
    var dateClass = ''; // Classe pour styliser la date
    if (type === 'current') {
        const endDate = game.endDate ? formatDate(game.endDate) : 'Date inconnue';
        dateText = translations.free_until + ' ' + endDate;
        dateClass = 'date-current';
    } else if (type === 'upcoming') {
        const startDate = game.startDate ? formatDate(game.startDate) : 'Date inconnue';
        dateText = translations.free_from + ' ' + startDate;
        dateClass = 'date-upcoming';
    }


    // Construire le HTML de la partie info de la carte
    var gameInfo = document.createElement('div');
    gameInfo.className = 'game-info';
    gameInfo.innerHTML =
        '<div class="game-title">' + game.title + '</div>' +
        '<div class="game-date ' + dateClass + '">' + dateText + '</div>' +
        '<div class="game-description">' + description + '</div>';

    gameCard.appendChild(gameInfo);

    return gameCard;
  }

  // Function to navigate images
  function navigateImages(gameCard, direction) {
      const images = gameCard.querySelectorAll('.game-image');
      const currentActive = gameCard.querySelector('.game-image.active');
      let currentIndex = Array.from(images).indexOf(currentActive);

      // Remove active class from current image
      if (currentActive) {
          currentActive.classList.remove('active');
      }

      // Calculate next index
      currentIndex += direction;

      // Wrap around
      if (currentIndex >= images.length) {
          currentIndex = 0;
      } else if (currentIndex < 0) {
          currentIndex = images.length - 1;
      }

      // Add active class to the new image
      if (images[currentIndex]) {
          images[currentIndex].classList.add('active');
      }
  }

  // Function to update navigation button visibility
  function updateNavigationButtons(gameCard) {
      const images = gameCard.querySelectorAll('.image-container .game-image');
      const prevButton = gameCard.querySelector('.nav-button.prev');
      const nextButton = gameCard.querySelector('.nav-button.next');

      if (images.length <= 1) {
          if (prevButton) prevButton.style.display = 'none';
          if (nextButton) nextButton.style.display = 'none';
      } else {
           if (prevButton) prevButton.style.display = ''; // Or 'block', 'flex', etc.
           if (nextButton) nextButton.style.display = '';
      }
  }


  // Fonction pour appliquer les traductions à l'interface
  function applyTranslations() {
    // Obtenir l'année actuelle pour le copyright
    const currentYear = new Date().getFullYear();
    
    // Mettre à jour les textes de l'interface avec les traductions
    document.getElementById('extension-title').textContent = translations.extension_title;
    document.getElementById('extension-subtitle').textContent = translations.extension_subtitle;
    document.getElementById('main-epic-link').textContent = translations.main_button;
    document.getElementById('current-games-title').textContent = translations.current_games_title;
    document.getElementById('upcoming-games-title').textContent = translations.upcoming_games_title;
    document.getElementById('language-toggle').textContent = translations.language_button;
    document.getElementById('github-link').title = translations.github_title;
    document.getElementById('kofi-link').title = translations.kofi_title;
    document.getElementById('footer-text').textContent = translations.footer_text + ' © ' + currentYear;
    
    // Mettre à jour les messages de chargement s'ils sont visibles
    const loadingCurrent = document.getElementById('loading-current');
    const loadingUpcoming = document.getElementById('loading-upcoming');
    if (loadingCurrent) loadingCurrent.textContent = translations.loading;
    if (loadingUpcoming) loadingUpcoming.textContent = translations.loading;
  }

  // Fonction pour afficher un message quand aucun jeu n'est disponible
  function showNoGamesMessage(container, message) {
    container.innerHTML = '';
    var noGames = document.createElement('div');
    noGames.className = 'no-games';
    noGames.textContent = message;
    container.appendChild(noGames);
  }

  // Fonction pour formater les dates
  function formatDate(dateString) {
    try {
      var date = new Date(dateString);
      // Utiliser la langue actuelle pour le format de date
      const locale = currentLanguage === 'fr' ? 'fr-FR' : 'en-US';
      return date.toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' });
    } catch (e) {
      return currentLanguage === 'fr' ? 'Date inconnue' : 'Unknown date';
    }
  }

  // Le texte du footer est maintenant géré par la fonction applyTranslations

  // Ajouter les liens vers GitHub et Ko-fi
  const githubLink = document.getElementById('github-link');
  if (githubLink) {
    githubLink.addEventListener('click', (e) => {
      e.preventDefault();
      chrome.tabs.create({ url: 'https://github.com/apolololo/EpicFree' });
    });
  }

  const kofiLink = document.getElementById('kofi-link');
  if (kofiLink) {
    kofiLink.addEventListener('click', (e) => {
      e.preventDefault();
      chrome.tabs.create({ url: 'https://ko-fi.com/apo__' });
    });
  }
}
