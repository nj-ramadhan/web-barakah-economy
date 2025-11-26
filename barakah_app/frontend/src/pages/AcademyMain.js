import React from 'react';
import { Link } from 'react-router-dom';
import HeaderHome from '../components/layout/HeaderHome';
import NavigationButton from '../components/layout/Navigation';

const AcademyMain = () => {
  return (
    <div className="body">
      <HeaderHome />

      <div className="px-4 py-6">
        <h1 className="text-xl font-bold mb-4">ACADEMY</h1>

        <div className="grid grid-cols-2 gap-4">
          <Link 
            to="/academy/ecourse"
            className="p-4 bg-white shadow rounded text-center"
          >
            E-Course
          </Link>

          <Link 
            to="/academy/articles"
            className="p-4 bg-white shadow rounded text-center"
          >
            Articles
          </Link>
        </div>
      </div>

      <NavigationButton />
    </div>
  );
};

export default AcademyMain;
