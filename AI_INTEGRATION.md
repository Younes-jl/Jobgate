# 🤖 Intégration IA - Google Gemini pour Génération de Questions

## 📋 Vue d'ensemble

L'intégration Google Gemini permet aux recruteurs de générer automatiquement des questions d'entrevue pertinentes basées sur les offres d'emploi. Cette fonctionnalité utilise l'API Google Gemini avec 15 requêtes gratuites par minute.

## ⚙️ Configuration

### Variables d'environnement (.env)
```bash
# Configuration Google Gemini
USE_GOOGLE_GEMINI=true
GOOGLE_GEMINI_API_KEY=AIzaSyBKxedeY80RD30tP_7bshhAZfYNCUCEVms

# Configuration alternatives (désactivées)
USE_OPENAI=false
USE_HUGGINGFACE=false
```

### Fonctionnalités IA activées
- ✅ Google Gemini (gemini-1.5-flash)
- ✅ Système de fallback avec questions prédéfinies
- ✅ Analyse de qualité des questions
- ✅ Paramètres de sécurité configurés
- ✅ Limite de 15 requêtes/minute (gratuit)

## 🚀 Endpoints API

### 1. Génération de Questions IA
**POST** `/api/ai/generate-questions/`

**Authentification:** Requise (Recruteurs uniquement)

**Body JSON:**
```json
{
  "job_title": "Développeur Full Stack",
  "job_description": "Nous recherchons un développeur expérimenté en React et Django...",
  "required_skills": ["React", "Django", "PostgreSQL", "Docker"],
  "experience_level": "intermediate",
  "question_count": 5,
  "difficulty_level": "medium"
}
```

**Paramètres:**
- `job_title` (string, requis): Titre du poste
- `job_description` (string, requis): Description détaillée du poste
- `required_skills` (array): Liste des compétences requises
- `experience_level` (string): `junior` | `intermediate` | `senior`
- `question_count` (integer): 1-20 questions (défaut: 5)
- `difficulty_level` (string): `easy` | `medium` | `hard`

**Réponse de succès (200):**
```json
{
  "success": true,
  "questions": [
    {
      "question": "Pouvez-vous expliquer votre approche pour optimiser les performances d'une application React ?",
      "category": "Technical Skills",
      "difficulty": "medium",
      "quality_score": 8.5,
      "quality_feedback": ["Question pertinente", "Bonne complexité"]
    }
  ],
  "metadata": {
    "job_title": "Développeur Full Stack",
    "experience_level": "intermediate",
    "difficulty_level": "medium",
    "generated_count": 5,
    "ai_provider": "google_gemini"
  }
}
```

### 2. Analyse de Qualité de Question
**POST** `/api/ai/analyze-question/`

**Authentification:** Requise (Recruteurs uniquement)

**Body JSON:**
```json
{
  "question": "Décrivez votre expérience avec React hooks."
}
```

**Réponse:**
```json
{
  "success": true,
  "question": "Décrivez votre expérience avec React hooks.",
  "analysis": {
    "score": 7.5,
    "feedback": ["Question technique pertinente", "Permet d'évaluer l'expérience"],
    "suggestions": ["Pourrait être plus spécifique sur les hooks utilisés"]
  }
}
```

### 3. Modèles de Questions Prédéfinies
**GET** `/api/ai/question-templates/`

**Authentification:** Requise (Recruteurs uniquement)

**Query Parameters:**
- `category` (optionnel): Filtrer par catégorie
- `experience_level` (optionnel): Filtrer par niveau

**Réponse:**
```json
{
  "success": true,
  "templates": {
    "Technical Skills": [
      {
        "question": "Expliquez les principes SOLID en programmation",
        "category": "Technical Skills",
        "difficulty": "medium"
      }
    ],
    "Problem Solving": [
      {
        "question": "Comment abordez-vous un bug complexe ?",
        "category": "Problem Solving", 
        "difficulty": "easy"
      }
    ]
  },
  "total_questions": 50,
  "categories_count": 8
}
```

## 📊 Architecture Technique

### Service IA (ai_service.py)
```python
class AIInterviewQuestionGenerator:
    def __init__(self):
        # Configuration Google Gemini
        self.model = genai.GenerativeModel('gemini-1.5-flash')
        
    def generate_questions(self, job_title, job_description, **kwargs):
        # Génération avec Gemini + fallback
        pass
```

### Système de Fallback
1. **Google Gemini (primaire)** - 15 requêtes/minute gratuites
2. **Questions prédéfinies (fallback)** - 50+ questions de haute qualité

### Paramètres de Sécurité Google Gemini
```python
safety_settings = [
    {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
    {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
    {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
    {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"}
]
```

## 🔐 Sécurité et Autorisations

- **Authentification JWT requise**
- **Rôle Recruteur uniquement** pour toutes les API IA
- **Rate limiting:** 15 requêtes/minute (Google Gemini)
- **Validation des entrées** pour tous les paramètres
- **Filtrage de contenu** via paramètres de sécurité Google

## 🧪 Exemples d'utilisation Frontend

### React - Génération de Questions
```javascript
const generateQuestions = async (jobData) => {
  const response = await fetch('/api/ai/generate-questions/', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      job_title: jobData.title,
      job_description: jobData.description,
      required_skills: jobData.skills,
      experience_level: 'intermediate',
      question_count: 8,
      difficulty_level: 'medium'
    })
  });
  
  const data = await response.json();
  return data.questions;
};
```

### Intégration avec Création de Campagne
```javascript
// Dans RecruiterDashboard.js ou component similaire
const handleGenerateAIQuestions = async () => {
  try {
    const aiQuestions = await generateQuestions({
      title: jobOffer.title,
      description: jobOffer.description,
      skills: jobOffer.required_skills
    });
    
    // Ajouter aux questions de la campagne
    setCampaignQuestions(prev => [...prev, ...aiQuestions]);
  } catch (error) {
    console.error('Erreur génération IA:', error);
  }
};
```

## 📈 Monitoring et Logs

### Logs disponibles
- Génération de questions (succès/échec)
- Utilisation API Gemini
- Activation du système de fallback
- Erreurs de validation

### Métriques suivies
- Nombre de questions générées par utilisateur
- Taux de succès Google Gemini vs Fallback
- Score moyen de qualité des questions
- Temps de réponse API

## 🚨 Gestion d'erreurs

### Erreurs fréquentes
- **403 Forbidden:** Utilisateur non-recruteur
- **400 Bad Request:** Paramètres invalides
- **500 Internal Server Error:** Erreur Google Gemini
- **Rate Limit:** Plus de 15 requêtes/minute

### Système de Fallback automatique
Si Google Gemini échoue, le système bascule automatiquement sur des questions prédéfinies de haute qualité organisées par catégorie et niveau de difficulté.

## 🔄 Prochaines évolutions

### Fonctionnalités planifiées
- [ ] Cache intelligent pour questions fréquentes
- [ ] Personnalisation des templates par secteur
- [ ] Analyse sentiment des réponses candidates
- [ ] Export des questions en PDF
- [ ] Intégration avec d'autres modèles IA

### Optimisations techniques
- [ ] Mise en cache Redis pour les questions
- [ ] Batch processing pour économiser les requêtes
- [ ] Analytics avancées sur l'utilisation IA
- [ ] Tests A/B sur les types de questions

---

**🎯 Objectif:** Permettre aux recruteurs de créer des campagnes d'entrevue avec des questions personnalisées et pertinentes grâce à l'intelligence artificielle, tout en maintenant un service gratuit et performant.
