import React from 'react';
import { Row, Col, Card } from 'react-bootstrap';
import './RecruiterStyles.css';

/**
 * Composant d'affichage des statistiques des candidatures
 * Affiche les 3 états : Total, En cours, Acceptées, Refusées
 */
const ApplicationsStats = ({ stats }) => {
  const {
    total = 0,
    pending = 0,
    accepted = 0,
    rejected = 0
  } = stats || {};

  return (
    <div className="applications-stats mb-4">
      <Row className="g-3">
        <Col md={3}>
          <Card className="stats-card border-0 shadow-sm h-100">
            <Card.Body className="text-center p-4">
              <div className="stats-icon mb-3">
                <i className="bi bi-list-ul text-secondary" style={{ fontSize: '2.5rem' }}></i>
              </div>
              <div className="stats-number text-secondary fw-bold" style={{ fontSize: '2rem' }}>
                {total}
              </div>
              <div className="stats-label text-muted">
                Total
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col md={3}>
          <Card className="stats-card border-0 shadow-sm h-100">
            <Card.Body className="text-center p-4">
              <div className="stats-icon mb-3">
                <i className="bi bi-clock text-warning" style={{ fontSize: '2.5rem' }}></i>
              </div>
              <div className="stats-number text-warning fw-bold" style={{ fontSize: '2rem' }}>
                {pending}
              </div>
              <div className="stats-label text-muted">
                En cours
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col md={3}>
          <Card className="stats-card border-0 shadow-sm h-100">
            <Card.Body className="text-center p-4">
              <div className="stats-icon mb-3">
                <i className="bi bi-check-circle text-success" style={{ fontSize: '2.5rem' }}></i>
              </div>
              <div className="stats-number text-success fw-bold" style={{ fontSize: '2rem' }}>
                {accepted}
              </div>
              <div className="stats-label text-muted">
                Acceptées
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col md={3}>
          <Card className="stats-card border-0 shadow-sm h-100">
            <Card.Body className="text-center p-4">
              <div className="stats-icon mb-3">
                <i className="bi bi-x-circle text-danger" style={{ fontSize: '2.5rem' }}></i>
              </div>
              <div className="stats-number text-danger fw-bold" style={{ fontSize: '2rem' }}>
                {rejected}
              </div>
              <div className="stats-label text-muted">
                Refusées
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default ApplicationsStats;
