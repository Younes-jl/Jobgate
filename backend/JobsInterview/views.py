from django.shortcuts import render
from rest_framework import generics, permissions
from .models import JobOffer
from .serializers import JobOfferSerializer

class IsRecruiter(permissions.BasePermission):
    """
    Permission personnalisée pour autoriser uniquement les recruteurs.
    """
    def has_permission(self, request, view):
        # Assurons-nous d'abord que l'utilisateur est authentifié.
        if not (request.user and request.user.is_authenticated):
            return False

        # --- LIGNE DE DÉBOGAGE CÔTÉ SERVEUR ---
        # On va l'afficher dans le terminal docker-compose
        print(f"Vérification de permission pour {request.user.username}. Rôle trouvé : '{request.user.role}'")

        # La vérification simplifiée et robuste
        return request.user.role == 'RECRUITER'


class JobOfferListCreateView(generics.ListCreateAPIView):
    """
    Vue pour lister toutes les offres ou en créer une nouvelle.
    GET: Renvoie la liste de toutes les offres.
    POST: Crée une nouvelle offre (seuls les recruteurs peuvent le faire).
    """
    queryset = JobOffer.objects.all().order_by('-created_at') # On les trie par date de création
    serializer_class = JobOfferSerializer

    def get_permissions(self):
        # On applique des permissions différentes selon la méthode.
        if self.request.method == 'POST':
            # Seuls les recruteurs peuvent créer (POST).
            return [permissions.IsAuthenticated(), IsRecruiter()]
        # Tout le monde (même non connecté) peut voir la liste des offres (GET).
        return [permissions.AllowAny()]

    def perform_create(self, serializer):
        # Cette méthode est appelée lors d'un POST, juste avant de sauvegarder.
        # Elle associe automatiquement l'offre au recruteur actuellement connecté.
        serializer.save(created_by=self.request.user)


class RecruiterDashboardView(generics.ListAPIView):
    """
    Vue qui renvoie uniquement la liste des offres d'emploi
    créées par l'utilisateur (recruteur) actuellement connecté.
    Cette vue est protégée et nécessite d'être un recruteur.
    """
    serializer_class = JobOfferSerializer
    permission_classes = [permissions.IsAuthenticated, IsRecruiter] # On utilise notre permission personnalisée

    def get_queryset(self):
        """
        Cette méthode est la clé !
        Elle surcharge la méthode par défaut pour ne retourner
        que les objets liés à l'utilisateur actuel.
        """
        user = self.request.user
        # On filtre les JobOffer pour ne garder que celles où 'created_by' est l'utilisateur connecté.
        return JobOffer.objects.filter(created_by=user).order_by('-created_at')