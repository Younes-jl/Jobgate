from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q
from .notification_models import Notification
from .notification_service import NotificationService
from rest_framework import serializers

class NotificationSerializer(serializers.ModelSerializer):
    icon_class = serializers.CharField(source='get_icon_class', read_only=True)
    priority_color = serializers.CharField(source='get_priority_color', read_only=True)
    time_ago = serializers.SerializerMethodField()
    
    class Meta:
        model = Notification
        fields = [
            'id', 'title', 'message', 'notification_type', 'priority',
            'is_read', 'created_at', 'read_at', 'action_url',
            'icon_class', 'priority_color', 'time_ago'
        ]
    
    def get_time_ago(self, obj):
        from django.utils import timezone
        from datetime import timedelta
        
        now = timezone.now()
        diff = now - obj.created_at
        
        if diff.days > 0:
            return f"il y a {diff.days} jour{'s' if diff.days > 1 else ''}"
        elif diff.seconds > 3600:
            hours = diff.seconds // 3600
            return f"il y a {hours} heure{'s' if hours > 1 else ''}"
        elif diff.seconds > 60:
            minutes = diff.seconds // 60
            return f"il y a {minutes} minute{'s' if minutes > 1 else ''}"
        else:
            return "à l'instant"

class NotificationViewSet(viewsets.ModelViewSet):
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Filtrer les notifications pour l'utilisateur connecté uniquement"""
        return Notification.objects.filter(recipient=self.request.user)
    
    @action(detail=False, methods=['get'])
    def recent(self, request):
        """Obtenir les 5 notifications les plus récentes"""
        notifications = NotificationService.get_recent_notifications(request.user, limit=5)
        serializer = self.get_serializer(notifications, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def unread_count(self, request):
        """Obtenir le nombre de notifications non lues"""
        count = NotificationService.get_unread_count(request.user)
        return Response({'unread_count': count})
    
    @action(detail=False, methods=['post'])
    def mark_as_read(self, request):
        """Marquer des notifications comme lues"""
        notification_ids = request.data.get('notification_ids', [])
        
        if notification_ids:
            # Marquer des notifications spécifiques
            updated_count = NotificationService.mark_notifications_as_read(
                request.user, 
                notification_ids
            )
        else:
            # Marquer toutes les notifications comme lues
            updated_count = NotificationService.mark_notifications_as_read(request.user)
        
        return Response({
            'message': f'{updated_count} notification(s) marquée(s) comme lue(s)',
            'updated_count': updated_count
        })
    
    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        """Marquer une notification spécifique comme lue"""
        notification = self.get_object()
        notification.mark_as_read()
        
        serializer = self.get_serializer(notification)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def by_type(self, request):
        """Filtrer les notifications par type"""
        notification_type = request.query_params.get('type')
        
        queryset = self.get_queryset()
        if notification_type:
            queryset = queryset.filter(notification_type=notification_type)
        
        # Pagination
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['delete'])
    def clear_read(self, request):
        """Supprimer toutes les notifications lues"""
        deleted_count = request.user.notifications.filter(is_read=True).delete()[0]
        return Response({
            'message': f'{deleted_count} notification(s) supprimée(s)',
            'deleted_count': deleted_count
        })
