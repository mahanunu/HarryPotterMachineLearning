// Variables globales
let video;
let classifier;
let isClassifying = false;
let lastPredictedClass = "";
let predictionConfidence = 0;

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
        
    } catch (error) {
        console.error("❌ Erreur d'initialisation:", error);
        document.getElementById("prediction").innerHTML = `⚠️ Erreur: ${error.message}`;
    }
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
    
    // Mettre à jour l'interface uniquement si la prédiction change
    if (label !== lastPredictedClass || Math.abs(confidence - predictionConfidence) > 5) {
        lastPredictedClass = label;
        predictionConfidence = confidence;
        
        // Mise à jour de l'affichage
        updateDisplay(label, confidence);
    }
}

// Mettre à jour l'interface
function updateDisplay(label, confidence) {
    // Afficher le résultat
    const predictionElement = document.getElementById("prediction");
    
    // Ajouter une classe CSS selon le sort détecté
    predictionElement.className = ""; // Réinitialiser les classes
    
    if (confidence < 40) {
        // Confiance faible
        predictionElement.innerHTML = `⚠️ Détection incertaine: ${label} (${confidence}%)`;
    } else {
        // Bon résultat
        predictionElement.innerHTML = `✨ ${label} (${confidence}%) ✨`;
        predictionElement.classList.add(label.toLowerCase());
        
        // Changement du fond selon le sort
        let hue = 240; // Bleu par défaut
        
        if (label === "Lumos") {
            hue = 60; // Jaune/doré
        } else if (label === "Expelliarmus") {
            hue = 0; // Rouge
        } else if (label === "Rien") {
            hue = 240; // Bleu
        }
        
        // Ajuster la saturation selon la confiance
        const saturation = 50 + (confidence / 2);
        document.body.style.backgroundColor = `hsl(${hue}, ${saturation}%, 20%)`;
    }
}

// Démarrer l'application quand la page est chargée
window.addEventListener('DOMContentLoaded', init);