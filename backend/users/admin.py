from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import CustomUser

class CustomUserAdmin(UserAdmin):
    """
    Cette classe permet de personnaliser l'affichage de notre CustomUser
    dans l'interface d'administration.
    """
    # On ajoute notre champ 'role' aux formulaires de création et d'édition.
    # On copie les fieldsets de base et on ajoute le nôtre.
    fieldsets = UserAdmin.fieldsets + (
        ('Rôle personnalisé', {'fields': ('role',)}),
    )
    add_fieldsets = UserAdmin.add_fieldsets + (
        ('Rôle personnalisé', {'fields': ('role',)}),
    )
    # On ajoute 'role' à la liste des colonnes affichées.
    list_display = ['username', 'email', 'first_name', 'last_name', 'role', 'is_staff']

# On enregistre notre modèle CustomUser avec sa configuration d'admin personnalisée.
admin.site.register(CustomUser, CustomUserAdmin)