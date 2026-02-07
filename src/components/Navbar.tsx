import React, { FC } from 'react';
import './Navbar.css';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { getRoute } from '../utils/getRoute';
import { GAME_DETAIL_ROUTE } from '../constants/routes';

interface NavbarProps {
  gameId?: string;
  title?: string;
}

const Navbar: FC<NavbarProps> = ({ gameId, title = "This is my map App" }) => {
  const navigate = useNavigate();

  const handleBack = () => {
    if (gameId) {
      navigate(getRoute(GAME_DETAIL_ROUTE, { gameId }));
    } else {
      navigate(-1);
    }
  };

  return (
    <div className="heading">
      <div className="navbar-container">
        <button onClick={handleBack} className="back-button">
          <ChevronLeft size={20} />
          <span>Back</span>
        </button>
        <h1>{title}</h1>
      </div>
    </div>
  );
}

export default Navbar;
