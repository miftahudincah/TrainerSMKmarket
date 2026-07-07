import React, { useState } from 'react';
import { Container, Row, Col } from 'react-bootstrap';
import UploadZone from './UploadZone';
import Gallery from './Gallery';

const Dashboard = () => {
  const [refreshGallery, setRefreshGallery] = useState(0);

  const handleUploadSuccess = () => {
    setRefreshGallery(prev => prev + 1);
  };

  return (
    <Container className="py-4">
      <Row>
        <Col lg={4}>
          <UploadZone onUploadSuccess={handleUploadSuccess} />
        </Col>
        <Col lg={8}>
          <Gallery refresh={refreshGallery} />
        </Col>
      </Row>
    </Container>
  );
};

export default Dashboard;