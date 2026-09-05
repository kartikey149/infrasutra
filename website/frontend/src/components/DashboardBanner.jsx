import React from 'react';
import { useTranslation } from 'react-i18next';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Pagination, Navigation } from 'swiper/modules';
import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatNumber } from '../utils/dateFormatter';

// Swiper core and module styles
import 'swiper/css';
import 'swiper/css/pagination';
import 'swiper/css/navigation';

export default function DashboardBanner() {
  const { t, i18n } = useTranslation();

  const bannerSlides = [
    {
      id: 1,
      tag: t('banner.slide1.tag', 'SITE PROGRESS UPDATE'),
      tagColor: 'bg-amber-500 text-slate-950',
      title: t('banner.slide1.title', 'Mainline Pipeline Trenching: 68% Execution Achieved'),
      subtitle: t('banner.slide1.subtitle', 'Sector 4 Crude Oil Pipeline Alignment • Chainage 0 to 14 km'),
      description: t('banner.slide1.description', 'Excavation and trench grading are progressing across lowland clay zones. Auto-linking of daily field voice logs with Primavera P6 schedule is active.'),
      metricLabel: t('banner.slide1.metricLabel', 'WBS PROGRESS'),
      metricValue: `${formatNumber(68, i18n.language)}%`,
      bgImage: 'https://images.unsplash.com/photo-1541888946425-d0fbb186156a?auto=format&fit=crop&w=1600&q=80',
      ctaText: t('banner.slide1.ctaText', 'View Schedule'),
      ctaLink: '/schedule-explorer'
    },
    {
      id: 2,
      tag: t('banner.slide2.tag', 'SAFETY & COMPLIANCE'),
      tagColor: 'bg-emerald-500 text-slate-950',
      title: t('banner.slide2.title', 'Zero Lost-Time Incidents (LTI) Milestone: 180 Days Safe'),
      subtitle: t('banner.slide2.subtitle', 'Assam Gas Processing Plant Unit-2 • Heavy Machinery Zone'),
      description: t('banner.slide2.description', '142 workers on-site adhering to mandatory PPE and daily toolbox safety briefings. Zero gas leaks or electrical compliance violations reported.'),
      metricLabel: t('banner.slide2.metricLabel', 'SAFETY SCORE'),
      metricValue: `${formatNumber(100, i18n.language)}%`,
      bgImage: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=1600&q=80',
      ctaText: t('banner.slide2.ctaText', 'Safety Audit Log'),
      ctaLink: '/analytics'
    },
    {
      id: 3,
      tag: t('banner.slide3.tag', 'MONTHLY COMPLETION METRIC'),
      tagColor: 'bg-sky-500 text-slate-950',
      title: t('banner.slide3.title', 'Monthly Execution Velocity: +14% Surge in Welding Output'),
      subtitle: t('banner.slide3.subtitle', 'Numaligarh Dispatch Terminal & Interconnecting Piping'),
      description: t('banner.slide3.description', 'Deployment of dual automatic welding bugs has accelerated joint completion, recovering 3 days of previous monsoon float lag.'),
      metricLabel: t('banner.slide3.metricLabel', 'SPI EFFICIENCY'),
      metricValue: formatNumber(1.04, i18n.language),
      bgImage: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=1600&q=80',
      ctaText: t('banner.slide3.ctaText', 'Review Velocity'),
      ctaLink: '/analytics'
    },
    {
      id: 4,
      tag: t('banner.slide4.tag', 'LOGISTICS & PROCUREMENT'),
      tagColor: 'bg-indigo-500 text-white',
      title: t('banner.slide4.title', 'Material Dispatch: 1,200 MT Pipe Spools Cleared for Stringing'),
      subtitle: t('banner.slide4.subtitle', 'Brahmaputra HDD River Crossing • Sadiya Storage Yard'),
      description: t('banner.slide4.description', 'API 5L X70 line pipes received 100% mill test certificates. Final ultrasonic inspection completed ahead of trenchless pull-back.'),
      metricLabel: t('banner.slide4.metricLabel', 'DISPATCHED'),
      metricValue: `${formatNumber(1200, i18n.language)} MT`,
      bgImage: 'https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?auto=format&fit=crop&w=1600&q=80',
      ctaText: t('banner.slide4.ctaText', 'Inspect Logistics'),
      ctaLink: '/field-update'
    }
  ];

  return (
    <div className="w-full rounded-3xl overflow-hidden shadow-xl border border-slate-200/80 bg-slate-950">
      <Swiper
        modules={[Autoplay, Pagination, Navigation]}
        spaceBetween={0}
        slidesPerView={1}
        loop={true}
        autoplay={{
          delay: 3000,
          disableOnInteraction: false,
          pauseOnMouseEnter: true
        }}
        pagination={{
          clickable: true,
          dynamicBullets: true
        }}
        navigation={true}
        className="w-full h-[320px] sm:h-[290px] md:h-[270px] amazon-banner-swiper"
      >
        {bannerSlides.map((slide) => (
          <SwiperSlide key={slide.id} className="relative w-full h-full select-none">
            {/* High-Resolution Background Image with Multi-Gradient Overlay */}
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url(${slide.bgImage})` }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/80 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent to-transparent" />
            </div>

            {/* Banner Slide Content Overlay */}
            <div className="relative z-10 h-full flex flex-col justify-between p-6 sm:p-8 max-w-4xl text-white">
              {/* Tag & Subtitle */}
              <div className="flex items-center gap-3">
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${slide.tagColor}`}>
                  {slide.tag}
                </span>
                <span className="text-xs text-slate-300 truncate hidden sm:inline-block">
                  {slide.subtitle}
                </span>
              </div>

              {/* Title & Description */}
              <div className="space-y-1.5 my-auto">
                <h2 className="text-lg sm:text-xl md:text-2xl font-black tracking-tight leading-snug drop-shadow-md">
                  {slide.title}
                </h2>
                <p className="text-xs sm:text-sm text-slate-300 line-clamp-2 max-w-2xl leading-relaxed">
                  {slide.description}
                </p>
              </div>

              {/* Bottom Metrics Bar & Call-to-Action */}
              <div className="flex items-center justify-between pt-2 border-t border-white/10">
                <div className="flex items-center gap-3">
                  <div className="text-[10px] text-slate-400 font-bold uppercase">
                    {slide.metricLabel}:
                  </div>
                  <div className="text-sm sm:text-base font-extrabold text-amber-400 font-mono">
                    {slide.metricValue}
                  </div>
                </div>

                <Link
                  to={slide.ctaLink}
                  className="px-4 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold transition-all shadow-md active:scale-95 flex items-center gap-1.5"
                >
                  <span>{slide.ctaText}</span>
                  <ChevronRight size={14} />
                </Link>
              </div>
            </div>
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
}
