import React from 'react';
import { Link } from 'react-router-dom';
import HeaderHome from '../components/layout/HeaderHome';
import NavigationButton from '../components/layout/Navigation';

const AcademyMain = () => {
  return (
    <div className="body">
      <HeaderHome />

      <div className="px-4 py-8 mb-20 max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <span className="w-1.5 h-6 bg-green-600 rounded-full"></span>
          Academy
        </h1>

        <div className="grid grid-cols-2 gap-4 lg:gap-8">
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
