import os
import json
import tempfile
from datetime import datetime, timedelta
from io import BytesIO
from django.conf import settings
from django.core.files.base import ContentFile
from django.core.files.storage import Storage
from django.utils.deconstruct import deconstructible
import firebase_admin
from firebase_admin import credentials, storage
import logging

logger = logging.getLogger(__name__)

# Initialize Firebase Admin SDK
def initialize_firebase():
    """
    Initialize Firebase Admin SDK with service account credentials
    """
    if not firebase_admin._apps:
        try:
            # Try to get credentials from environment variable (JSON string)
            firebase_creds = os.getenv('FIREBASE_CREDENTIALS')
            if firebase_creds:
                # Parse JSON string
                cred_dict = json.loads(firebase_creds)
                cred = credentials.Certificate(cred_dict)
            else:
                # Try to get credentials from file path
                firebase_creds_path = getattr(settings, 'FIREBASE_CREDENTIALS_PATH', None)
                if firebase_creds_path and os.path.exists(firebase_creds_path):
                    cred = credentials.Certificate(firebase_creds_path)
                else:
                    raise ValueError("Firebase credentials not found. Set FIREBASE_CREDENTIALS or FIREBASE_CREDENTIALS_PATH")
            
            # Initialize app with storage bucket
            firebase_admin.initialize_app(cred, {
                'storageBucket': getattr(settings, 'FIREBASE_STORAGE_BUCKET', None)
            })
            logger.info("Firebase initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize Firebase: {e}")
            raise

@deconstructible
class FirebaseStorage(Storage):
    """
    Custom Django storage backend for Firebase Cloud Storage
    """
    
    def __init__(self, bucket_name=None):
        self.bucket_name = bucket_name or getattr(settings, 'FIREBASE_STORAGE_BUCKET', None)
        if not self.bucket_name:
            raise ValueError("Firebase storage bucket name is required")
        
        # Initialize Firebase if not already done
        initialize_firebase()
        self.bucket = storage.bucket(self.bucket_name)
    
    def _open(self, name, mode='rb'):
        """
        Retrieve the specified file from Firebase Storage
        """
        try:
            blob = self.bucket.blob(name)
            if not blob.exists():
                raise FileNotFoundError(f"File {name} not found in Firebase Storage")
            
            # Download file content
            file_content = blob.download_as_bytes()
            return ContentFile(file_content)
        except Exception as e:
            logger.error(f"Error opening file {name}: {e}")
            raise
    
    def _save(self, name, content):
        """
        Save a file to Firebase Storage
        """
        try:
            # Generate unique filename with timestamp if needed
            if self.exists(name):
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                name_parts = name.rsplit('.', 1)
                if len(name_parts) == 2:
                    name = f"{name_parts[0]}_{timestamp}.{name_parts[1]}"
                else:
                    name = f"{name}_{timestamp}"
            
            blob = self.bucket.blob(name)
            
            # Handle different content types
            if hasattr(content, 'read'):
                if hasattr(content, 'seek'):
                    content.seek(0)
                file_content = content.read()
            else:
                file_content = content
            
            # Upload to Firebase Storage
            blob.upload_from_string(file_content)
            
            # Make the file publicly accessible (optional)
            # blob.make_public()
            
            logger.info(f"File {name} uploaded successfully to Firebase Storage")
            return name
            
        except Exception as e:
            logger.error(f"Error saving file {name}: {e}")
            raise
    
    def delete(self, name):
        """
        Delete a file from Firebase Storage
        """
        try:
            blob = self.bucket.blob(name)
            if blob.exists():
                blob.delete()
                logger.info(f"File {name} deleted successfully from Firebase Storage")
            else:
                logger.warning(f"File {name} not found for deletion")
        except Exception as e:
            logger.error(f"Error deleting file {name}: {e}")
            raise
    
    def exists(self, name):
        """
        Check if a file exists in Firebase Storage
        """
        try:
            blob = self.bucket.blob(name)
            return blob.exists()
        except Exception as e:
            logger.error(f"Error checking if file {name} exists: {e}")
            return False
    
    def listdir(self, path):
        """
        List the contents of the specified path in Firebase Storage
        """
        try:
            if path and not path.endswith('/'):
                path += '/'
            
            blobs = self.bucket.list_blobs(prefix=path, delimiter='/')
            
            directories = []
            files = []
            
            for blob in blobs:
                name = blob.name[len(path):] if path else blob.name
                if '/' in name:
                    directories.append(name.split('/')[0])
                else:
                    files.append(name)
            
            # Remove duplicates and sort
            directories = sorted(list(set(directories)))
            files = sorted(files)
            
            return directories, files
        except Exception as e:
            logger.error(f"Error listing directory {path}: {e}")
            return [], []
    
    def size(self, name):
        """
        Return the total size, in bytes, of the file referenced by name
        """
        try:
            blob = self.bucket.blob(name)
            if blob.exists():
                blob.reload()
                return blob.size
            else:
                raise FileNotFoundError(f"File {name} not found")
        except Exception as e:
            logger.error(f"Error getting size of file {name}: {e}")
            raise
    
    def url(self, name):
        """
        Return a URL where the file referenced by name can be accessed
        """
        try:
            blob = self.bucket.blob(name)
            if blob.exists():
                # Generate a signed URL that expires in 1 hour
                return blob.generate_signed_url(
                    expiration=datetime.utcnow() + timedelta(hours=1),
                    method='GET'
                )
            else:
                return None
        except Exception as e:
            logger.error(f"Error generating URL for file {name}: {e}")
            return None
    
    def get_accessed_time(self, name):
        """
        Return the last accessed time (as a datetime) of the file
        """
        # Firebase Storage doesn't track access time, return creation time
        return self.get_created_time(name)
    
    def get_created_time(self, name):
        """
        Return the creation time (as a datetime) of the file
        """
        try:
            blob = self.bucket.blob(name)
            if blob.exists():
                blob.reload()
                return blob.time_created
            else:
                raise FileNotFoundError(f"File {name} not found")
        except Exception as e:
            logger.error(f"Error getting created time of file {name}: {e}")
            raise
    
    def get_modified_time(self, name):
        """
        Return the last modified time (as a datetime) of the file
        """
        try:
            blob = self.bucket.blob(name)
            if blob.exists():
                blob.reload()
                return blob.updated
            else:
                raise FileNotFoundError(f"File {name} not found")
        except Exception as e:
            logger.error(f"Error getting modified time of file {name}: {e}")
            raise

    def get_public_url(self, name):
        """
        Return a public URL for the file (if the file is made public)
        """
        try:
            blob = self.bucket.blob(name)
            if blob.exists():
                return f"https://storage.googleapis.com/{self.bucket_name}/{name}"
            else:
                return None
        except Exception as e:
            logger.error(f"Error generating public URL for file {name}: {e}")
            return None

def get_firebase_download_url(file_path):
    """
    Utility function to get a signed download URL for a Firebase Storage file
    """
    try:
        initialize_firebase()
        bucket = storage.bucket(getattr(settings, 'FIREBASE_STORAGE_BUCKET'))
        blob = bucket.blob(file_path)
        
        if blob.exists():
            return blob.generate_signed_url(
                expiration=datetime.utcnow() + timedelta(hours=24),
                method='GET'
            )
        else:
            return None
    except Exception as e:
        logger.error(f"Error generating download URL for {file_path}: {e}")
        return None
