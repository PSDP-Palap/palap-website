import React, { useState, useRef } from 'react';
import './Homepage.css';

// --- TypeScript Interfaces ---
interface ServiceItem { title: string; icon: string; }
interface FeatureItem { title: string; desc: string; icon: string; }
interface RecommendItem { title: string; desc: string; image: string; }

const Home: React.FC = () => {
  const [isHeroShrunk, setIsHeroShrunk] = useState(false);
  const [isNavVisible, setIsNavVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleScroll = () => {
    if (!containerRef.current) return;
    const scrollTop = containerRef.current.scrollTop;

    // Shrink hero effect
    setIsHeroShrunk(scrollTop > 50);

    // Navbar becomes visible after scrolling past the hero
    setIsNavVisible(scrollTop > 100);
  };

  const services: ServiceItem[] = [
    { title: 'ซื้อของ', icon: '🍲' }, 
    { title: 'รับ - ส่ง', icon: '🚐' },
    { title: 'ดูแล', icon: '🦮' },
    { title: 'โรงพยาบาล', icon: '🏥' },
    { title: 'คำแนะนำ', icon: '⭐' },
  ];

  const features: FeatureItem[] = [
    { title: 'รับ - ส่ง', desc: 'บริการรับส่งสัตว์เลี้ยงของคุณ ไปถึงสถานพยาบาล รวดเร็ว ปลอดภัย ไว้ใจได้', icon: '💉' },
    { title: 'ซื้อของ', desc: 'ดูแลสัตว์เลี้ยงอย่างใกล้ชิด ทำให้สัตว์เลี้ยงไม่เครียด', icon: '🎾' },
    { title: 'ดูแล', desc: 'ดูแลสัตว์เลี้ยงอย่างใกล้ชิด ทำให้สัตว์เลี้ยงไม่เครียด', icon: '🍙' },
    { title: 'ฝากเลี้ยง', desc: 'ดูแลสัตว์เลี้ยงอย่างใกล้ชิด ทำให้สัตว์เลี้ยงไม่เครียด', icon: '🛏️' },
  ];

  const recommendations: RecommendItem[] = Array(6).fill({
    title: 'ซื้อของ',
    desc: 'บริการซื้อของสัตว์เลี้ยงที่คุณต้องการ ไม่ต้องไปเองให้เสียเวลา',
    image: 'https://placehold.co/150x100/e0e0e0/black?text=Product+Image' 
  });

  return (
    <>
      {/* 1. Navbar moved outside the scroll container to ensure it stays on top */}
      <nav className={`navbar ${isNavVisible ? 'visible' : ''}`}>
        <div className="logo-container">
          <span className="logo-icon">🐾</span>
          <span className="logo-text">Palap</span>
        </div>
        <ul className="nav-links">
          <li><a href="#home">HOME</a></li>
          <li><a href="#service">SERVICE</a></li>
          <li><a href="#login">LOGIN/REGISTER</a></li>
        </ul>
      </nav>

      {/* 2. Main Scroll Container */}
      <div className="home-container" ref={containerRef} onScroll={handleScroll}>
        
        {/* Section 1: Hero */}
        <div className={`hero-section snap-section ${isHeroShrunk ? 'scrolled' : 'full-screen'}`}>
          <div className="hero-content">
            <div className="hero-text">
              <h1>Palap</h1>
              <h2>LET'S ME TAKE CARE YOUR PETS</h2>
              <button className="pill-btn">Try now</button>
            </div>
            <div className="hero-image">
              <img src="https://placehold.co/300x400/transparent/brown?text=Dog" alt="Hero Dog" />
            </div>
          </div>
        </div>

        {/* Section 2: Combined Service & Promo */}
        <section id="service" className="combined-services-promo snap-section">
          <div className="content-wrapper">
            <h3 className="section-title">SERVICE</h3>
            <div className="services-grid">
              {services.map((service, index) => (
                <div className="service-card" key={index}>
                  <div className="service-icon">{service.icon}</div>
                  <p>{service.title}</p>
                </div>
              ))}
            </div>

            <div className="promo-banners-wrapper">
              <div className="promo-card promo-left">
                <div className="promo-text">
                  <h2>สัตว์เลี้ยงคุณยิ้ม<br/>เราก็ยิ้มมม...</h2>
                  <button className="white-btn">ลองเลย</button>
                </div>
                <img src="https://placehold.co/200x250/transparent/white?text=Shiba" className="promo-img shiba-img" alt="Shiba" />
              </div>
              <div className="promo-card promo-right">
                <img src="https://placehold.co/200x250/transparent/white?text=Bird" className="promo-img bird-img" alt="Bird" />
                <div className="promo-text text-right">
                  <h2>ดูแลครบ<br/>จบที่เดียว<br/>เพื่อสัตว์เลี้ยง</h2>
                  <button className="white-btn">ลองเลย</button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section 3: Mid Banner */}
        <section className="mid-banner snap-section">
          <div className="mid-banner-overlay">
            <h2>เรื่องของสัตว์เลี้ยง ไว้ใจให้ <strong>Palap</strong> ช่วยคุณ</h2>
          </div>
        </section>

        {/* Section 4: Features */}
        <section className="features-section snap-section">
          <div className="features-grid">
            {features.map((feature, index) => (
              <div className="feature-item" key={index}>
                <div className="feature-icon-circle">{feature.icon}</div>
                <h4>{feature.title}</h4>
                <p>{feature.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Section 5: Recommendations */}
        <section className="recommend-section snap-section">
          <h3>RECOMMEND</h3>
          <div className="recommend-grid">
            {recommendations.map((item, index) => (
              <div className="recommend-card" key={index}>
                <img src={item.image} alt="Products" className="product-image" />
                <h4>{item.title}</h4>
                <p>{item.desc}</p>
                <a href="#learnmore" className="learn-more">LEARN MORE ---&gt;</a>
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  );
};

export default Home;