// src/components/campaigns/CampaignSlider.js - Updated version
import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';

const SliderContainer = styled.div`
  position: relative;
  width: 100%;
  height: 400px;
  overflow: hidden;
  margin-bottom: 30px;
  border-radius: 8px;
`;

const SlideWrapper = styled.div`
  display: flex;
  transition: transform 0.5s ease;
  height: 100%;
  transform: translateX(-${props => props.activeIndex * 100}%);
`;

const Slide = styled.div`
  min-width: 100%;
  height: 100%;
  position: relative;
  background-image: url(${props => props.image});
  background-size: cover;
  background-position: center;
`;

const SlideContent = styled.div`
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 30px 20px;
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.8));
  color: white;
`;

const SlideTitle = styled.h2`
  font-size: 28px;
  font-weight: bold;
  margin-bottom: 10px;
  text-shadow: 1px 1px 3px rgba(0, 0, 0, 0.6);
`;

const DonateButton = styled.button`
  background-color: #0C6E43;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 10px 20px;
  font-weight: bold;
  cursor: pointer;
  text-transform: uppercase;
  margin-top: 15px;
  
  &:hover {
    background-color: #07522F;
  }
`;

const IndicatorContainer = styled.div`
  position: absolute;
  bottom: 15px;
  width: 100%;
  display: flex;
  justify-content: center;
  gap: 8px;
  z-index: 2;
`;

const Indicator = styled.button`
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background-color: ${props => props.active ? '#FFD700' : 'rgba(255, 255, 255, 0.5)'};
  border: none;
  cursor: pointer;
  transition: background-color 0.3s ease;
`;

const SliderControls = styled.div`
  position: absolute;
  top: 50%;
  width: 100%;
  display: flex;
  justify-content: space-between;
  transform: translateY(-50%);
  z-index: 2;
`;

const ControlButton = styled.button`
  background-color: rgba(0, 0, 0, 0.5);
  color: white;
  border: none;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  margin: 0 15px;
  transition: background-color 0.3s ease;
  
  &:hover {
    background-color: rgba(0, 0, 0, 0.8);
  }
`;

const CampaignSlider = ({ featuredCampaigns }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const intervalRef = useRef(null);
  
  // Clear interval on component unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);
  
  const stopAutoPlay = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };
  
  // Pause auto-play on hover
  const handleMouseEnter = () => {
    stopAutoPlay();
  };
  
  const handleMouseLeave = () => {
    startAutoPlay();
  };
  
  const goToSlide = (index) => {
    setActiveIndex(index);
    // Reset timer on manual navigation
    stopAutoPlay();
    startAutoPlay();
  };
  
  const goToPrev = () => {
    const newIndex = activeIndex === 0 ? featuredCampaigns.length - 1 : activeIndex - 1;
    goToSlide(newIndex);
  };
  
  const goToNext = () => {
    const newIndex = (activeIndex + 1) % featuredCampaigns.length;
    goToSlide(newIndex);
  };
  
  // Handle touchscreen swipe
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);
  
  const handleTouchStart = (e) => {
    setTouchStart(e.targetTouches[0].clientX);
    stopAutoPlay(); // Pause on touch
  };
  
  const handleTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };
  
  const handleTouchEnd = () => {
    if (touchStart - touchEnd > 50) {
      // Swipe left - go next
      goToNext();
    }
    
    if (touchStart - touchEnd < -50) {
      // Swipe right - go prev
      goToPrev();
    }
    
    startAutoPlay(); // Resume autoplay after touch
  };
  
  if (!featuredCampaigns || featuredCampaigns.length === 0) {
    return null;
  }

  return (
    <SliderContainer 
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <SlideWrapper activeIndex={activeIndex}>
        {featuredCampaigns.map((campaign, index) => (
          <Slide key={campaign.id} image={campaign.thumbnail}>
            <SlideContent>
              <SlideTitle>{campaign.title}</SlideTitle>
              <p>{campaign.description?.substring(0, 100) || ''}...</p>
              <Link to={`/donate/${campaign.id}`}>
                <DonateButton>DONASI SEKARANG</DonateButton>
              </Link>
            </SlideContent>
          </Slide>
        ))}
      </SlideWrapper>
      
      {featuredCampaigns.length > 1 && (
        <>
          <SliderControls>
            <ControlButton onClick={goToPrev}>
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6"></polyline>
              </svg>
            </ControlButton>
            <ControlButton onClick={goToNext}>
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            </ControlButton>
          </SliderControls>
          
          <IndicatorContainer>
            {featuredCampaigns.map((_, index) => (
              <Indicator 
                key={index} 
                active={index === activeIndex}
                onClick={() => goToSlide(index)}
              />
            ))}
          </IndicatorContainer>
        </>
      )}
    </SliderContainer>
  );
};

export default CampaignSlider;