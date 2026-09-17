import React from 'react';
import Header from '../Header/Header';
import Footer from '../Footer/Footer';
import FloatingCart from '../FloatingCart/FloatingCart';
import { usePageTracking } from '../../hooks/usePageTracking';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  usePageTracking();
  return (
    <>
      <Header />
      <main className="content">{children}</main>
      <Footer />
      <FloatingCart />
    </>
  );
};

export default Layout;
