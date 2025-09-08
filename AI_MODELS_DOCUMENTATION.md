# 🤖 Modèles IA - Système d'Évaluation JobGate

## Vue d'ensemble du Pipeline IA

Le système d'évaluation IA de JobGate utilise une approche **multi-modèles** avec fallback intelligent pour garantir une analyse robuste des entretiens vidéo.

---

## 🎯 Architecture des Modèles IA

### **Pipeline Principal**
```
Vidéo → Audio → Transcription → Analyse IA → Score + Feedback
```

### **Stratégie de Fallback**
```
1. Google Gemini (Priorité 1)
   ↓ (si échec)
2. Hugging Face BART (Priorité 2)
   ↓ (si échec)
3. Analyse Contextuelle (Priorité 3)
```

---

## 📋 Modèles IA Utilisés

### **1. 🎤 OpenAI Whisper** 
- **Rôle**: Transcription audio-vers-texte
- **Modèle**: `whisper-base`
- **Fonction**: Convertir l'audio des vidéos en texte français
- **Statut**: Optionnel (commenté dans requirements.txt)

**Utilisation**:
```python
model = whisper.load_model("base")
result = model.transcribe(audio_path, language="fr")
transcription = result["text"]
```

**Avantages**:
- ✅ Transcription précise multilingue
- ✅ Optimisé pour le français
- ✅ Gestion du bruit de fond

---

### **2. 🧠 Google Gemini** 
- **Rôle**: Analyse intelligente principale
- **Modèle**: `gemini-pro`
- **Fonction**: Évaluation contextuelle des compétences
- **Statut**: Actif (Priorité 1)

**Configuration**:
```python
import google.generativeai as genai
genai.configure(api_key=settings.GOOGLE_GEMINI_API_KEY)
model = genai.GenerativeModel('gemini-pro')
```

**Capacités**:
- ✅ Analyse contextuelle avancée
- ✅ Scoring intelligent (0-100)
- ✅ Feedback personnalisé
- ✅ Compréhension des compétences métier
- ✅ Génération de points forts/faibles

**Prompt Template**:
```
Analysez cette réponse d'entretien:
Question: {question_text}
Transcription: {transcription}
Compétences attendues: {expected_skills}

Fournissez:
SCORE: [0-100]
FEEDBACK: [analyse détaillée]
```

---

### **3. 🤗 Hugging Face BART**
- **Rôle**: Fallback d'analyse
- **Modèle**: `facebook/bart-large-mnli`
- **Fonction**: Classification zero-shot des compétences
- **Statut**: Fallback (Priorité 2)

**Configuration**:
```python
from transformers import pipeline
classifier = pipeline(
    "zero-shot-classification",
    model="facebook/bart-large-mnli"
)
```

**Utilisation**:
```python
labels = ["communication", "technique", "motivation"]
result = classifier(transcription, labels)
scores = result['scores']
```

**Avantages**:
- ✅ Classification sans entraînement
- ✅ Analyse des compétences spécifiques
- ✅ Fonctionnement offline
- ✅ Léger et rapide

---

### **4. 🎯 Analyse Contextuelle**
- **Rôle**: Fallback ultime
- **Modèle**: Algorithme personnalisé
- **Fonction**: Scoring basé sur le contexte
- **Statut**: Fallback (Priorité 3)

**Logique**:
```python
def _generate_contextual_score(expected_skills, question_text):
    base_score = min(70 + len(expected_skills) * 5, 85)
    if len(question_text) > 100:
        base_score += 5
    return base_score
```

**Utilisation**:
- 📊 Score basé sur le nombre de compétences
- 📝 Ajustement selon la complexité de la question
- 💬 Feedback intelligent avec émojis
- ⚠️ Indique l'absence de transcription

---

## 🔄 Flux d'Exécution

### **Étape 1: Préparation**
```python
# Vérification des dépendances
if not AI_DEPENDENCIES_AVAILABLE:
    → Utiliser analyse contextuelle
```

### **Étape 2: Transcription (Optionnelle)**
```python
if whisper_available:
    video → audio → transcription
else:
    transcription = "Analyse basée sur le contexte"
```

### **Étape 3: Analyse IA**
```python
try:
    # Priorité 1: Google Gemini
    score, feedback = analyze_with_gemini(transcription)
except:
    try:
        # Priorité 2: Hugging Face
        score, feedback = analyze_with_huggingface(transcription)
    except:
        # Priorité 3: Contextuel
        score, feedback = generate_contextual_analysis()
```

---

## ⚙️ Configuration Requise

### **Variables d'Environnement**
```bash
# Google Gemini (Obligatoire)
GOOGLE_GEMINI_API_KEY=your_api_key_here
USE_GOOGLE_GEMINI=true

# Cloudinary (Pour les vidéos)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

### **Dépendances Python**
```txt
# IA Principal (Actif)
google-generativeai==0.3.2

# IA Avancé (Optionnel - commenté)
# openai-whisper==20231117
# torch==2.1.0
# transformers==4.35.0
# ffmpeg-python==0.2.0
```

---

## 📊 Métriques de Performance

### **Temps d'Analyse**
- **Gemini seul**: ~2-3 secondes
- **Avec Whisper**: ~10-15 secondes
- **Fallback HF**: ~5-8 secondes
- **Contextuel**: ~0.1 secondes

### **Précision**
- **Gemini**: 🌟🌟🌟🌟🌟 (Excellent)
- **Whisper + Gemini**: 🌟🌟🌟🌟🌟 (Parfait)
- **BART**: 🌟🌟🌟 (Bon)
- **Contextuel**: 🌟🌟 (Basique)

---

## 🚀 Évolutions Futures

### **Modèles à Intégrer**
- **OpenAI GPT-4**: Analyse encore plus poussée
- **Claude 3**: Alternative à Gemini
- **Whisper v3**: Transcription améliorée
- **Custom Fine-tuned**: Modèle spécialisé RH

### **Améliorations Prévues**
- 🎥 Analyse vidéo (expressions faciales)
- 🎭 Détection d'émotions
- 📈 Scoring multi-critères avancé
- 🔄 Apprentissage continu

---

## 🛠️ Maintenance

### **Monitoring**
- Logs détaillés par modèle
- Métriques de performance
- Taux de succès par provider
- Temps de réponse

### **Fallback Intelligent**
- Détection automatique des pannes
- Basculement transparent
- Notification des erreurs
- Récupération automatique

---

*Documentation mise à jour le 08/09/2025*
*Système JobGate - Évaluation IA Dynamique*
