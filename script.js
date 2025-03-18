// Variables globales
let video;
let classifier;
let isClassifying = false;
let lastPredictedClass = "";
let predictionConfidence = 0;
let currentSpellEffect = null;

// URL du modèle - IMPORTANT: Vérifiez que c'est le bon URL!
const MODEL_URL = "https://teachablemachine.withgoogle.com/models/0qq6XVmWu/";

// Fonction principale d'initialisation
async function init() {
    console.log("🚀 Initialisation de l'application...");
    
    try {
        // Vérifier si ml5 est disponible
        if (typeof ml5 === 'undefined') {
            throw new Error("La bibliothèque ml5.js n'est pas chargée");
        }
        
        console.log("✅ ml5.js détecté, version:", ml5.version);
        
        // Initialiser la webcam
        await setupWebcam();
        
        // Charger le modèle une fois la webcam prête
        await loadModel();
        
        // Commencer la classification
        startClassification();
        
        // Ajouter les écouteurs d'événements pour les items de sort
        setupSpellItemListeners();
        
    } catch (error) {
        console.error("❌ Erreur d'initialisation:", error);
        document.getElementById("prediction").innerHTML = `⚠️ Erreur: ${error.message}`;
    }
}

// Ajouter des écouteurs d'événements pour les items de sort
function setupSpellItemListeners() {
    const spellItems = document.querySelectorAll('.spell-item');
    spellItems.forEach(item => {
        item.addEventListener('click', function() {
            const spellName = this.getAttribute('data-spell');
            // Simuler la détection de ce sort pour voir l'effet
            updateDisplay(spellName, 90);
        });
    });
}

// Configuration de la webcam
async function setupWebcam() {
    return new Promise((resolve, reject) => {
        console.log("🔄 Configuration de la webcam...");
        
        video = document.getElementById("webcam");
        
        // Paramètres vidéo pour améliorer la performance
        video.width = 640;
        video.height = 480;
        
        // Accéder à la webcam
        navigator.mediaDevices.getUserMedia({ 
            video: { 
                facingMode: "user",
                width: { ideal: 640 },
                height: { ideal: 480 }
            } 
        })
        .then(stream => {
            video.srcObject = stream;
            
            video.onloadeddata = () => {
                console.log("✅ Webcam prête, dimensions:", video.videoWidth, "x", video.videoHeight);
                resolve();
            };
        })
        .catch(err => {
            console.error("❌ Erreur d'accès à la webcam:", err);
            reject(new Error("Impossible d'accéder à la webcam. Vérifiez les permissions."));
        });
    });
}

// Chargement du modèle Teachable Machine
async function loadModel() {
    return new Promise((resolve, reject) => {
        console.log("🔄 Chargement du modèle depuis:", MODEL_URL);
        
        // S'assurer que l'URL se termine par "model.json"
        const modelJsonUrl = MODEL_URL.endsWith('/') 
            ? MODEL_URL + "model.json" 
            : MODEL_URL + "/model.json";
            
        console.log("URL complet du modèle:", modelJsonUrl);
        
        // Charger le modèle avec ml5
        classifier = ml5.imageClassifier(modelJsonUrl, () => {
            console.log("✅ Modèle chargé avec succès!");
            resolve();
        });
        
        // Ajouter un timeout au cas où le chargement échoue
        setTimeout(() => {
            if (!classifier) {
                reject(new Error("Timeout lors du chargement du modèle"));
            }
        }, 10000); // 10 secondes maximum
    });
}

// Démarrer la classification vidéo
function startClassification() {
    console.log("🔄 Démarrage de la classification...");
    
    if (isClassifying) return;
    
    // Vérifier que tout est prêt
    if (!video || !video.readyState || video.readyState < 2) {
        console.warn("⚠️ La vidéo n'est pas encore prête");
        setTimeout(startClassification, 500);
        return;
    }
    
    if (!classifier) {
        console.error("❌ Le modèle n'est pas chargé");
        document.getElementById("prediction").innerHTML = "⚠️ Modèle non disponible";
        return;
    }
    
    // Lancer la boucle de classification
    classifyFrame();
}

// Classifier une image de la webcam
function classifyFrame() {
    if (isClassifying) return;
    isClassifying = true;
    
    // Vérifier que la vidéo est toujours active
    if (!video.videoWidth || !video.videoHeight) {
        console.warn("⚠️ Flux vidéo interrompu");
        isClassifying = false;
        setTimeout(classifyFrame, 1000);
        return;
    }
    
    // Effectuer la classification
    classifier.classify(video, (error, results) => {
        isClassifying = false;
        
        if (error) {
            console.error("❌ Erreur de classification:", error);
            document.getElementById("prediction").innerHTML = "⚠️ Erreur de détection";
            setTimeout(classifyFrame, 1000);
            return;
        }
        
        // Traiter les résultats
        handleResults(results);
        
        // Continuer la boucle
        setTimeout(classifyFrame, 500);
    });
}

// Traiter les résultats de la classification
function handleResults(results) {
    if (!results || results.length === 0) {
        console.warn("⚠️ Pas de résultats retournés");
        document.getElementById("prediction").innerHTML = "⚠️ Aucun résultat";
        return;
    }
    
    // Log des résultats complets pour débogage
    console.log("Résultats bruts:", JSON.stringify(results));
    
    // Extraire la prédiction principale
    const topPrediction = results[0];
    const label = topPrediction.label;
    const confidence = Math.round(topPrediction.confidence * 100);
    
    console.log(`Classe: "${label}" avec confiance: ${confidence}%`);
    
    // Mettre à jour l'affichage uniquement si la prédiction change
    // ou si la confiance change significativement
    if (label !== lastPredictedClass || Math.abs(confidence - predictionConfidence) > 5) {
        lastPredictedClass = label;
        predictionConfidence = confidence;
        
        // Mise à jour de l'affichage avec des effets visuels
        updateDisplay(label, confidence);
    }
}

// Mettre à jour l'interface avec des effets visuels
function updateDisplay(label, confidence) {
    const predictionElement = document.getElementById("prediction");
    const appContainer = document.querySelector('.app-container');
    const wandElement = document.querySelector('.wand');
    const webcamFrame = document.querySelector('.webcam-frame');
    const spellDetector = document.querySelector('.spell-detector');
    
    // Réinitialiser les classes et effets précédents
    document.body.classList.remove('lumos-active', 'expelliarmus-active');
    appContainer.classList.remove('lumos-active', 'expelliarmus-active');
    wandElement.classList.remove('lumos-wand', 'expelliarmus-wand');
    webcamFrame.classList.remove('lumos-active', 'expelliarmus-active');
    
    // Supprimer les anciens effets visuels
    const oldEffects = document.querySelectorAll('.spell-effect');
    oldEffects.forEach(effect => effect.remove());
    
    // Réinitialiser le style de la prédiction
    predictionElement.style.color = '';
    predictionElement.style.textShadow = '';
    
    // Appliquer les effets en fonction du sort détecté si la confiance est suffisante
    if (label === "Lumos" && confidence > 60) {
        // Effet Lumos
        document.body.classList.add('lumos-active');
        appContainer.classList.add('lumos-active');
        wandElement.classList.add('lumos-wand');
        webcamFrame.classList.add('lumos-active');
        
        // Créer l'effet de lumière
        const lightEffect = document.createElement('div');
        lightEffect.className = 'spell-effect lumos-light';
        spellDetector.appendChild(lightEffect);
        
        predictionElement.innerHTML = `✨ Lumos (${confidence}%) ✨`;
        predictionElement.style.color = '#FFD700';
        predictionElement.style.textShadow = '0 0 10px rgba(255, 215, 0, 0.8)';
    } 
    else if (label === "Expelliarmus" && confidence > 60) {
        // Effet Expelliarmus
        document.body.classList.add('expelliarmus-active');
        appContainer.classList.add('expelliarmus-active');
        wandElement.classList.add('expelliarmus-wand');
        webcamFrame.classList.add('expelliarmus-active');
        
        // Créer l'effet d'onde de choc
        const shockwaveEffect = document.createElement('div');
        shockwaveEffect.className = 'spell-effect expelliarmus-shockwave';
        spellDetector.appendChild(shockwaveEffect);
        
        predictionElement.innerHTML = `⚡ Expelliarmus (${confidence}%) ⚡`;
        predictionElement.style.color = '#FF4500';
        predictionElement.style.textShadow = '0 0 10px rgba(255, 69, 0, 0.8)';
    }
    else {
        // Pas de sort ou confiance trop faible
        predictionElement.innerHTML = confidence > 50 ? 
            `${label} (${confidence}%)` : 
            "En attente d'un sort...";
        predictionElement.style.color = '#E0E0E0';
        predictionElement.style.textShadow = 'none';
    }
    
    // Ajouter un son (optionnel)
    // playSpellSound(label, confidence);
}

// Fonction pour jouer un son en fonction du sort (à implémenter si souhaité)
function playSpellSound(spell, confidence) {
    // Implémentation future possible
}

// Démarrer l'application quand la page est chargée
window.addEventListener('DOMContentLoaded', init);