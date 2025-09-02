"""
Service pour la gestion des vidéos avec Cloudinary.
"""
import cloudinary
import cloudinary.uploader
import cloudinary.api
from django.conf import settings
import logging

logger = logging.getLogger(__name__)

class CloudinaryVideoService:
    """
    Service pour gérer l'upload, la suppression et la récupération de vidéos sur Cloudinary.
    """
    
    @staticmethod
    def is_configured():
        """
        Vérifie si Cloudinary est correctement configuré.
        """
        try:
            import cloudinary
            config = cloudinary.config()
            cloud_name = config.cloud_name
            api_key = config.api_key
            api_secret = config.api_secret
            
            logger.info(f"Cloudinary runtime config - Cloud Name: {cloud_name}, API Key: {api_key[:10] if api_key else None}..., API Secret: {'***' if api_secret else None}")
            
            configured = all([cloud_name, api_key, api_secret])
            logger.info(f"Cloudinary is configured: {configured}")
            
            return configured
        except Exception as e:
            logger.error(f"Erreur vérification config Cloudinary: {e}")
            return False
    
    @staticmethod
    def upload_video(video_file, public_id=None, folder=None):
        """
        Upload une vidéo sur Cloudinary avec optimisation pour les entretiens.
        
        Args:
            video_file: Fichier vidéo à uploader
            public_id: ID public pour la vidéo (optionnel)
            folder: Dossier de destination sur Cloudinary (optionnel)
        
        Returns:
            dict: Résultat de l'upload avec URLs et métadonnées
        """
        if not CloudinaryVideoService.is_configured():
            logger.error("Cloudinary n'est pas configuré. Vérifiez les variables d'environnement.")
            return None
        
        try:
            upload_options = {
                'resource_type': 'video',
                'quality': 'auto:best',
                'video_codec': 'h264',
                'audio_codec': 'aac',
                'format': 'mp4',
                'folder': folder or 'jobgate/interviews',
                'use_filename': True,
                'unique_filename': True,
                'overwrite': False
            }
            
            if public_id:
                upload_options['public_id'] = public_id
            
            result = cloudinary.uploader.upload(video_file, **upload_options)
            
            logger.info(f"Vidéo uploadée avec succès sur Cloudinary: {result.get('public_id')}")
            return result
            
        except Exception as e:
            logger.error(f"Erreur lors de l'upload sur Cloudinary: {str(e)}")
            return None
    
    @staticmethod
    def delete_video(public_id):
        """
        Supprime une vidéo de Cloudinary.
        
        Args:
            public_id: ID public de la vidéo à supprimer
        
        Returns:
            bool: True si la suppression a réussi
        """
        if not CloudinaryVideoService.is_configured():
            logger.error("Cloudinary n'est pas configuré correctement")
            return False
        
        try:
            result = cloudinary.uploader.destroy(public_id, resource_type='video')
            success = result.get('result') == 'ok'
            
            if success:
                logger.info(f"Vidéo supprimée avec succès de Cloudinary: {public_id}")
            else:
                logger.warning(f"Échec de la suppression de la vidéo: {public_id}")
            
            return success
            
        except Exception as e:
            logger.error(f"Erreur lors de la suppression sur Cloudinary: {str(e)}")
            return False
    
    @staticmethod
    def get_video_info(public_id):
        """
        Récupère les informations d'une vidéo depuis Cloudinary.
        
        Args:
            public_id: ID public de la vidéo
        
        Returns:
            dict: Informations de la vidéo ou None si erreur
        """
        if not CloudinaryVideoService.is_configured():
            logger.error("Cloudinary n'est pas configuré correctement")
            return None
        
        try:
            result = cloudinary.api.resource(public_id, resource_type='video')
            return result
            
        except Exception as e:
            logger.error(f"Erreur lors de la récupération des infos vidéo: {str(e)}")
            return None
    
    @staticmethod
    def get_streaming_url(public_id, quality='auto:best'):
        """
        Génère une URL de streaming optimisée pour une vidéo.
        
        Args:
            public_id: ID public de la vidéo
            quality: Qualité de la vidéo (auto:best, auto:good, auto:low, etc.)
        
        Returns:
            str: URL de streaming sécurisée
        """
        if not CloudinaryVideoService.is_configured():
            logger.error("Cloudinary n'est pas configuré correctement")
            return None
        
        try:
            url = cloudinary.CloudinaryVideo(public_id).build_url(
                quality=quality,
                format='mp4',
                secure=True
            )
            return url
            
        except Exception as e:
            logger.error(f"Erreur lors de la génération de l'URL de streaming: {str(e)}")
            return None
    
    @staticmethod
    def get_video_thumbnail(public_id, width=320, height=240):
        """
        Génère une miniature pour une vidéo.
        
        Args:
            public_id: ID public de la vidéo
            width: Largeur de la miniature
            height: Hauteur de la miniature
        
        Returns:
            str: URL de la miniature
        """
        if not CloudinaryVideoService.is_configured():
            logger.error("Cloudinary n'est pas configuré correctement")
            return None
        
        try:
            url = cloudinary.CloudinaryVideo(public_id).build_url(
                width=width,
                height=height,
                crop='fill',
                format='jpg',
                secure=True,
                resource_type='video'
            )
            return url
            
        except Exception as e:
            logger.error(f"Erreur lors de la génération de la miniature: {str(e)}")
            return None
