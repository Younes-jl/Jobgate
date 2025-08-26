from django.core.management.base import BaseCommand
from django.conf import settings
from interviews.firebase_storage import initialize_firebase, FirebaseStorage
import tempfile
import os

class Command(BaseCommand):
    help = 'Test Firebase Storage connection and functionality'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--upload-test',
            action='store_true',
            help='Test file upload to Firebase Storage'
        )
    
    def handle(self, *args, **options):
        self.stdout.write("🔥 Test de connexion Firebase Storage...")
        
        # Vérifier les configurations
        use_firebase = getattr(settings, 'USE_FIREBASE_STORAGE', False)
        bucket_name = getattr(settings, 'FIREBASE_STORAGE_BUCKET', None)
        
        self.stdout.write(f"USE_FIREBASE_STORAGE: {use_firebase}")
        self.stdout.write(f"FIREBASE_STORAGE_BUCKET: {bucket_name}")
        
        if not use_firebase:
            self.stdout.write(
                self.style.WARNING("Firebase Storage est désactivé. Activez avec USE_FIREBASE_STORAGE=true")
            )
            return
        
        if not bucket_name:
            self.stdout.write(
                self.style.ERROR("FIREBASE_STORAGE_BUCKET n'est pas configuré")
            )
            return
        
        try:
            # Test d'initialisation de Firebase
            self.stdout.write("🔌 Initialisation de Firebase...")
            initialize_firebase()
            self.stdout.write(self.style.SUCCESS("✅ Firebase initialisé avec succès"))
            
            # Test de création du storage
            self.stdout.write("📁 Création du storage Firebase...")
            storage = FirebaseStorage()
            self.stdout.write(self.style.SUCCESS("✅ Storage Firebase créé avec succès"))
            
            if options['upload_test']:
                self.test_file_upload(storage)
            
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f"❌ Erreur lors du test Firebase: {str(e)}")
            )
            self.stdout.write("Vérifiez votre configuration Firebase dans les variables d'environnement")
    
    def test_file_upload(self, storage):
        """Test l'upload d'un fichier test"""
        self.stdout.write("📤 Test d'upload de fichier...")
        
        try:
            # Créer un fichier test temporaire
            test_content = b"Test content for Firebase Storage upload"
            test_filename = "test/firebase_test.txt"
            
            # Upload du fichier
            self.stdout.write(f"Upload de {test_filename}...")
            saved_name = storage._save(test_filename, test_content)
            self.stdout.write(self.style.SUCCESS(f"✅ Fichier uploadé: {saved_name}"))
            
            # Test d'existence
            exists = storage.exists(saved_name)
            self.stdout.write(f"Fichier existe: {exists}")
            
            # Test de taille
            if exists:
                size = storage.size(saved_name)
                self.stdout.write(f"Taille du fichier: {size} bytes")
                
                # Test d'URL
                url = storage.url(saved_name)
                if url:
                    self.stdout.write(f"URL signée: {url[:50]}...")
                
                # Suppression du fichier test
                self.stdout.write("🗑️ Suppression du fichier test...")
                storage.delete(saved_name)
                self.stdout.write(self.style.SUCCESS("✅ Fichier test supprimé"))
            
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f"❌ Erreur lors du test d'upload: {str(e)}")
            )
