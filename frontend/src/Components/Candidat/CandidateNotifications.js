import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Badge, Button, Alert, Spinner, Modal } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import api from '../../services/api';
import './CandidateStyles.css';

const CandidateNotifications = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [showModal, setShowModal] = useState(false);

  // Charger toutes les notifications
  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await api.get('/interviews/notifications/');
      setNotifications(response.data);
    } catch (error) {
      console.error('Erreur lors du chargement des notifications:', error);
      setError('Impossible de charger les notifications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchNotifications();
    }
  }, [user]);

  // Marquer une notification comme lue
  const markAsRead = async (notificationId) => {
    try {
      await api.post(`/interviews/notifications/${notificationId}/mark_read/`);
      setNotifications(prev => 
        prev.map(notif => 
          notif.id === notificationId 
            ? { ...notif, is_read: true, read_at: new Date().toISOString() }
            : notif
        )
      );
    } catch (error) {
      console.error('Erreur lors du marquage comme lu:', error);
    }
  };

  // Marquer toutes les notifications comme lues
  const markAllAsRead = async () => {
    try {
      await api.post('/interviews/notifications/mark_as_read/');
      setNotifications(prev => 
        prev.map(notif => ({ 
          ...notif, 
          is_read: true, 
          read_at: new Date().toISOString() 
        }))
      );
    } catch (error) {
      console.error('Erreur lors du marquage de toutes comme lues:', error);
    }
  };

  // Ouvrir le détail d'une notification
  const openNotificationDetail = (notification) => {
    setSelectedNotification(notification);
    setShowModal(true);
    if (!notification.is_read) {
      markAsRead(notification.id);
    }
  };

  // Obtenir l'icône selon le type de notification
  const getNotificationIcon = (type) => {
    switch (type) {
      case 'INTERVIEW_INVITATION':
        return 'bi-camera-video';
      case 'APPLICATION_STATUS':
        return 'bi-briefcase';
      case 'INTERVIEW_REMINDER':
        return 'bi-alarm';
      case 'JOB_MATCH':
        return 'bi-star';
      case 'PROFILE_UPDATE':
        return 'bi-person-gear';
      case 'SYSTEM':
        return 'bi-info-circle';
      default:
        return 'bi-bell';
    }
  };

  // Obtenir la couleur selon le type de notification
  const getNotificationColor = (type) => {
    switch (type) {
      case 'INTERVIEW_INVITATION':
        return 'success';
      case 'APPLICATION_STATUS':
        return 'info';
      case 'INTERVIEW_REMINDER':
        return 'warning';
      case 'JOB_MATCH':
        return 'primary';
      case 'PROFILE_UPDATE':
        return 'secondary';
      case 'SYSTEM':
        return 'dark';
      default:
        return 'primary';
    }
  };

  // Obtenir la couleur selon la priorité
  const getPriorityBadge = (priority) => {
    switch (priority) {
      case 'URGENT':
        return { variant: 'danger', text: 'Urgent' };
      case 'HIGH':
        return { variant: 'warning', text: 'Élevée' };
      case 'MEDIUM':
        return { variant: 'info', text: 'Moyenne' };
      case 'LOW':
      default:
        return { variant: 'secondary', text: 'Faible' };
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  if (loading) {
    return (
      <Container className="py-5 text-center">
        <Spinner animation="border" variant="primary" />
        <p className="mt-3">Chargement des notifications...</p>
      </Container>
    );
  }

  return (
    <div className="position-relative">
      <Container fluid className="py-4">
      <Row>
        <Col md={12}>
          <Card className="shadow-sm">
            <Card.Header className="bg-light">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h5 className="mb-0">
                    <i className="bi bi-bell me-2"></i>
                    Toutes les notifications
                    {unreadCount > 0 && (
                      <Badge bg="danger" className="ms-2">{unreadCount}</Badge>
                    )}
                  </h5>
                  <small className="text-muted">
                    Gérez toutes vos notifications en un seul endroit
                  </small>
                </div>
                <div>
                  {unreadCount > 0 && (
                    <Button 
                      variant="outline-primary" 
                      size="sm" 
                      className="me-2"
                      onClick={markAllAsRead}
                    >
                      <i className="bi bi-check-all me-1"></i>
                      Tout marquer comme lu
                    </Button>
                  )}
                  <Button 
                    variant="outline-secondary" 
                    size="sm"
                    onClick={() => navigate('/candidate/details')}
                  >
                    <i className="bi bi-arrow-left me-1"></i>
                    Retour
                  </Button>
                </div>
              </div>
            </Card.Header>
            <Card.Body>
              {error && (
                <Alert variant="danger" dismissible onClose={() => setError(null)}>
                  {error}
                </Alert>
              )}

              {notifications.length === 0 ? (
                <div className="text-center py-5">
                  <i className="bi bi-bell-slash" style={{ fontSize: '3rem', color: '#6c757d' }}></i>
                  <p className="mt-3 text-muted">Aucune notification pour le moment</p>
                  <Button variant="primary" size="sm" onClick={() => navigate('/candidate/offers')}>
                    Explorer les offres
                  </Button>
                </div>
              ) : (
                <div className="notifications-list">
                  {notifications.map((notification) => (
                    <Card 
                      key={notification.id} 
                      className={`mb-3 border-0 shadow-sm notification-card ${!notification.is_read ? 'unread' : ''}`}
                      style={{ cursor: 'pointer' }}
                      onClick={() => openNotificationDetail(notification)}
                    >
                      <Card.Body className="p-4">
                        <div className="d-flex align-items-start">
                          <div 
                            className={`notification-icon me-3 bg-${getNotificationColor(notification.notification_type)} text-white`}
                          >
                            <i className={`bi ${getNotificationIcon(notification.notification_type)}`}></i>
                          </div>
                          <div className="flex-grow-1">
                            <div className="d-flex justify-content-between align-items-start mb-2">
                              <h6 className={`mb-1 ${!notification.is_read ? 'fw-bold' : ''}`}>
                                {notification.title}
                                {!notification.is_read && (
                                  <span className="text-primary ms-2">•</span>
                                )}
                              </h6>
                              <div className="d-flex align-items-center">
                                <Badge 
                                  bg={getPriorityBadge(notification.priority).variant}
                                  className="me-2"
                                >
                                  {getPriorityBadge(notification.priority).text}
                                </Badge>
                                <small className="text-muted">
                                  {new Date(notification.created_at).toLocaleDateString('fr-FR', {
                                    day: '2-digit',
                                    month: '2-digit',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </small>
                              </div>
                            </div>
                            <p className="text-muted mb-0">
                              {notification.message.length > 150 
                                ? `${notification.message.substring(0, 150)}...`
                                : notification.message}
                            </p>
                            <div className="mt-2">
                              <Badge 
                                bg="light" 
                                text="dark" 
                                className="me-2"
                              >
                                {notification.notification_type_display}
                              </Badge>
                              {notification.is_read && (
                                <small className="text-success">
                                  <i className="bi bi-check-circle me-1"></i>
                                  Lu le {new Date(notification.read_at).toLocaleDateString('fr-FR')}
                                </small>
                              )}
                            </div>
                          </div>
                        </div>
                      </Card.Body>
                    </Card>
                  ))}
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Modal de détail de notification */}
      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            <i className={`bi ${getNotificationIcon(selectedNotification?.notification_type)} me-2`}></i>
            {selectedNotification?.title}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedNotification && (
            <>
              <div className="mb-3">
                <Badge 
                  bg={getPriorityBadge(selectedNotification.priority).variant}
                  className="me-2"
                >
                  Priorité: {getPriorityBadge(selectedNotification.priority).text}
                </Badge>
                <Badge bg="light" text="dark">
                  {selectedNotification.notification_type_display}
                </Badge>
              </div>
              
              <div className="mb-3">
                <strong>Message:</strong>
                <p className="mt-2">{selectedNotification.message}</p>
              </div>
              
              <div className="text-muted">
                <small>
                  <i className="bi bi-calendar me-1"></i>
                  Reçu le {new Date(selectedNotification.created_at).toLocaleDateString('fr-FR', {
                    weekday: 'long',
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </small>
                {selectedNotification.is_read && (
                  <div className="mt-1">
                    <small className="text-success">
                      <i className="bi bi-check-circle me-1"></i>
                      Lu le {new Date(selectedNotification.read_at).toLocaleDateString('fr-FR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </small>
                  </div>
                )}
              </div>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>
            Fermer
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
    </div>
  );
};

export default CandidateNotifications;
