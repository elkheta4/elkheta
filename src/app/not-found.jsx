'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Home } from 'lucide-react';
import './not-found.css';

export default function NotFound() {
  const router = useRouter();

  return (
    <div className="not-found-container">
      <div className="nf-content">
        <Image
          src="/images/logo.webp"
          alt="Logo"
          width={400}
          height={400}
          className="nf-logo"
        />
        <h1 className="nf-code">404</h1>
        <h2 className="nf-title">إيه ده؟ إنت رايح فين؟</h2>
        <p className="nf-desc">
          شكلك تهت يا بطل! الصفحة اللي بتدور عليها مش هنا.
          ممكن تكون اتمسحت أو الرابط غلط.
        </p>

        <div className="nf-actions">
          <button
            onClick={() => router.back()}
            className="nf-btn secondary"
          >
            <ArrowLeft size={20} />
            ارجع خطوة
          </button>

          <Link href="/" className="nf-btn primary">
            <Home size={20} />
            روح الرئيسية
          </Link>
        </div>
      </div>
    </div>
  );
}
