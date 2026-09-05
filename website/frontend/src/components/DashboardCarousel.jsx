import React, { useRef } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Navigation, Pagination, EffectFade } from 'swiper/modules';
import {
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Clock,
  HardHat,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  MapPin,
  IndianRupee,
  Activity
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useProject } from '../context/ProjectContext';

// Import Swiper styles
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import 'swiper/css/effect-fade';

export default function DashboardCarousel() {
  const { setActiveProjectId, activeProject } = useProject();
  const prevRef = useRef(null);
  const nextRef = useRef(null);

  const slides = [
    {
      id: 'PRJ-01',
      title: 'Sector 4 Crude Oil Pipeline Expansion',
      subtitle: 'Critical Infrastructure • Cross-Country Mainline',
      location: 'Upper Assam Basin (Dibrugarh)',
      budget: '₹45.2 Cr',
      progress: 38,
      varianceDays: -4,
      spi: '0.88',
      workers: 68,
      status: 'Critical Path Active',
      statusType: 'danger', // danger, warning, success, info
      bgImage: 'https://images.unsplash.com/photo-1541888946425-d0fbb186156a?auto=format&fit=crop&w=1600&q=80',
      description: 'Continuous pipeline stringing, automatic welding, and trenching across high-water-table clay sectors. Real-time WBS reconciliation active.',
      highlight: '🚨 Critical Path: Mainline Joint Welding (ACT-04) pacing hydrotest milestone'
    },
    {
      id: 'PRJ-02',
      title: 'Assam Gas Processing Plant Unit-2',
      subtitle: 'High Pressure Gas Dehydration & Compression',
      location: 'Duliajan Industrial Area',
      budget: '₹128.5 Cr',
      progress: 62,
      varianceDays: +2,
      spi: '1.03',
      workers: 142,
      status: 'On Schedule',
      statusType: 'success',
      bgImage: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=1600&q=80',
      description: 'Centrifugal compressor skid alignment, TEG contactor column erection, and tie-in manifold fabrication proceeding ahead of planned baseline.',
      highlight: '🟢 Milestone Complete: 250T Heavy Crawler crane lift executed safely'
    },
    {
      id: 'PRJ-03',
      title: 'Numaligarh Refined Products Dispatch Terminal',
      subtitle: 'Storage Tankage & Pumping Station',
      location: 'Golaghat District',
      budget: '₹64.8 Cr',
      progress: 19,
      varianceDays: -8,
      spi: '0.79',
      workers: 54,
      status: 'Delay Risk: Supply Chain',
      statusType: 'warning',
      bgImage: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=1600&q=80',
      description: 'Foundation civil pours on tank pad 03 stalled due to delayed high-tensile rebar shipment. Planner buffer reallocation initiated.',
      highlight: '⚠️ Mitigation In Progress: Fast-tracking auxiliary booster pump piping'
    },
    {
      id: 'PRJ-04',
      title: 'Brahmaputra River Crossing HDD Pipeline',
      subtitle: 'Trenchless Horizontal Directional Drilling',
      location: 'Sadiya Corridor',
      budget: '₹92.0 Cr',
      progress: 8,
      varianceDays: 0,
      spi: '1.00',
      workers: 35,
      status: 'Mobilization & Survey',
      statusType: 'info',
      bgImage: 'https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?auto=format&fit=crop&w=1600&q=80',
      description: 'Geotechnical soil resistivity profiling and 500T HDD drill rig assembly in progress along the southern river bank corridor.',
      highlight: '🔍 Survey Benchmark: Sonar bathymetric scanning 100% verified'
    }
  ];

  const getBadgeClasses = (type) => {
    switch (type) {
      case 'danger':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/40 shadow-rose-500/10';
      case 'warning':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-amber-500/10';
      case 'success':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-emerald-500/10';
      default:
        return 'bg-sky-500/20 text-sky-300 border-sky-500/40 shadow-sky-500/10';
    }
  };

  return (
    <div className="relative w-full rounded-3xl overflow-hidden shadow-xl border border-slate-200/80 group">
      <Swiper
        modules={[Autoplay, Navigation, Pagination, EffectFade]}
        effect="fade"
        speed={800}
        autoplay={{
          delay: 5500,
          disableOnInteraction: false,
          pauseOnMouseEnter: true,
        }}
        pagination={{
          clickable: true,
          dynamicBullets: true,
        }}
        navigation={{
          prevEl: '.custom-swiper-prev',
          nextEl: '.custom-swiper-next',
        }}
        loop={true}
        className="w-full h-[360px] sm:h-[320px] md:h-[300px]"
      >
        {slides.map((slide) => {
          const isActive = activeProject?.id === slide.id;

          return (
            <SwiperSlide key={slide.id} className="relative w-full h-full select-none">
              {/* Background Image with Dark Contrast Gradient Overlay */}
              <div
                className="absolute inset-0 bg-cover bg-center transition-transform duration-700 ease-out transform scale-100 hover:scale-105"
                style={{ backgroundImage: `url(${slide.bgImage})` }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/85 to-slate-950/50 backdrop-blur-[1px]" />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent" />
              </div>

              {/* Slide Content */}
              <div className="relative h-full flex flex-col justify-between p-6 sm:p-8 max-w-5xl z-10">
                {/* Top Row: Badges & Location */}
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border shadow-sm flex items-center gap-1.5 backdrop-blur-md ${getBadgeClasses(slide.statusType)}`}>
                    <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
                    {slide.status}
                  </span>

                  <span className="px-3 py-1 rounded-full text-xs font-medium text-slate-300 bg-white/10 backdrop-blur-md border border-white/15 flex items-center gap-1.5">
                    <MapPin size={12} className="text-amber-400" />
                    {slide.location}
                  </span>

                  {isActive && (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-amber-400 text-slate-950 shadow-md flex items-center gap-1">
                      <Sparkles size={11} /> Active in View
                    </span>
                  )}
                </div>

                {/* Middle Row: Title & Highlights */}
                <div className="space-y-2 mt-2">
                  <div className="text-[11px] font-bold text-amber-400 uppercase tracking-widest">
                    {slide.subtitle}
                  </div>
                  <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-white tracking-tight leading-snug drop-shadow-md">
                    {slide.title}
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-300 max-w-2xl line-clamp-2 leading-relaxed">
                    {slide.description}
                  </p>
                  <div className="text-xs font-semibold text-amber-300/90 flex items-center gap-1.5 bg-black/40 backdrop-blur-md px-3 py-1 rounded-xl w-fit border border-white/10">
                    {slide.highlight}
                  </div>
                </div>

                {/* Bottom Row: Key Metrics & Amazon-Style Quick CTAs */}
                <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-white/10 mt-auto">
                  {/* Quick Metrics */}
                  <div className="flex items-center gap-4 sm:gap-6 text-xs text-slate-300">
                    <div>
                      <div className="text-[10px] uppercase text-slate-400 font-bold">Budget</div>
                      <div className="font-extrabold text-white text-sm">{slide.budget}</div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase text-slate-400 font-bold">Progress</div>
                      <div className="font-extrabold text-amber-400 text-sm">{slide.progress}%</div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase text-slate-400 font-bold">SPI Index</div>
                      <div className="font-mono font-bold text-white text-sm">{slide.spi}</div>
                    </div>
                    <div className="hidden sm:block">
                      <div className="text-[10px] uppercase text-slate-400 font-bold">Workforce</div>
                      <div className="font-bold text-white text-sm flex items-center gap-1">
                        <HardHat size={13} className="text-amber-400" /> {slide.workers} On-Site
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveProjectId(slide.id)}
                      className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-white backdrop-blur-md border border-white/20 transition active:scale-95 flex items-center gap-1.5"
                    >
                      Select Project
                    </button>
                    <Link
                      to="/schedule-explorer"
                      className="px-4 py-1.5 rounded-xl text-xs font-bold bg-amber-400 hover:bg-amber-300 text-slate-950 transition shadow-lg shadow-amber-500/20 active:scale-95 flex items-center gap-1.5"
                    >
                      P6 Schedule <ArrowRight size={13} />
                    </Link>
                  </div>
                </div>
              </div>
            </SwiperSlide>
          );
        })}
      </Swiper>

      {/* Custom Amazon-Style Navigation Arrows */}
      <button
        type="button"
        className="custom-swiper-prev absolute left-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-slate-950/60 hover:bg-slate-950/90 text-white flex items-center justify-center backdrop-blur-md border border-white/20 transition-all opacity-0 group-hover:opacity-100 shadow-xl cursor-pointer hover:scale-110"
        aria-label="Previous Project"
      >
        <ChevronLeft size={20} />
      </button>
      <button
        type="button"
        className="custom-swiper-next absolute right-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-slate-950/60 hover:bg-slate-950/90 text-white flex items-center justify-center backdrop-blur-md border border-white/20 transition-all opacity-0 group-hover:opacity-100 shadow-xl cursor-pointer hover:scale-110"
        aria-label="Next Project"
      >
        <ChevronRight size={20} />
      </button>
    </div>
  );
}
