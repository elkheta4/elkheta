'use client';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

const HeaderActions = ({ children }) => {
  const [mounted, setMounted] = useState(false);
  const [container, setContainer] = useState(null);

  useEffect(() => {
    setMounted(true);
    setContainer(document.getElementById('header-right-actions'));
  }, []);

  if (!mounted || !container) return null;

  return createPortal(children, container);
};

export default HeaderActions;
