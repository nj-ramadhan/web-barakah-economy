import React from 'react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';

const Card = styled.div`
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  margin-bottom: 20px;
  background: white;
`;

const CardImage = styled.img`
  width: 100%;
  height: 100px;
  object-fit: cover;
`;

const CardContent = styled.div`
  padding: 15px;
`;

const CardTitle = styled.h3`
  font-size: 18px;
  margin-bottom: 10px;
  font-weight: bold;
  color: #222;
`;

const DonateButton = styled.button`
  background-color: #0C6E43;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 8px 12px;
  font-weight: bold;
  width: 100%;
  cursor: pointer;
  text-transform: uppercase;
  font-size: 14px;
  
  &:hover {
    background-color: #07522F;
  }
`;

const CampaignCard = ({ campaign }) => {
  return (
    <Card>
      <CardImage 
        src={campaign.thumbnail} 
        alt={campaign.title} 
      />
      <CardContent>
        <CardTitle>{campaign.title}</CardTitle>
        <Link to={`/donate/${campaign.id}`}>
          <DonateButton>DONASI SEKARANG</DonateButton>
        </Link>
      </CardContent>
    </Card>
  );
};

export default CampaignCard;