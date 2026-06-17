import { Product } from '../types';
import { motion } from 'motion/react';

interface ProductCardProps {
  key?: string;
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      id={`product-card-${product.id}`}
      className="group min-w-[210px] max-w-[240px] md:min-w-0 md:max-w-none flex-shrink-0 bg-white dark:bg-zinc-900 rounded-[24px] overflow-hidden shadow-lg shadow-orange-100/50 dark:shadow-none hover:shadow-xl hover:shadow-orange-200/40 dark:hover:shadow-none hover:-translate-y-1 transition-all duration-300 border border-orange-50/70 dark:border-zinc-800/80 flex flex-col justify-between"
    >
      <div className="relative w-full aspect-[3/4] md:aspect-[4/5] bg-orange-50/30 dark:bg-zinc-800/30 overflow-hidden flex items-center justify-center">
        {/* Category Tag (Floating, subtle and clean) */}
        <div className="absolute top-3 left-3 z-20 flex flex-col sm:flex-row gap-1">
          <span className="px-2.5 py-1 bg-amber-500/90 dark:bg-amber-600/90 backdrop-blur-xs text-white text-[10px] font-bold rounded-lg shadow-sm font-display tracking-wide uppercase">
            {product.category}
          </span>
          {product.section && (
            <span className="px-2.5 py-1 bg-zinc-950/80 dark:bg-zinc-800/95 backdrop-blur-xs text-amber-250 text-[10px] font-bold rounded-lg shadow-sm font-display tracking-wide">
              🍬 {product.section}
            </span>
          )}
        </div>

        {/* Blurred Backdrop */}
        <img
          src={product.imageUrl}
          alt=""
          className="absolute inset-0 w-full h-full object-cover blur-md opacity-30 select-none pointer-events-none"
          referrerPolicy="no-referrer"
          loading="lazy"
        />

        {/* Main Photo (Fully fitted vertically and horizontally) */}
        <img
          src={product.imageUrl}
          alt={product.name}
          className="relative z-10 max-w-full max-h-full object-contain p-2 select-none pointer-events-none transition-transform duration-500 group-hover:scale-105"
          referrerPolicy="no-referrer"
          loading="lazy"
          onError={(e) => {
            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1581798459219-318e76aecc7b?q=80&w=600&auto=format&fit=crop';
          }}
        />
      </div>

      {/* Product Name footer */}
      <div className="p-3.5 bg-white dark:bg-zinc-900 border-t border-orange-50/40 dark:border-zinc-850/50 flex flex-col justify-between flex-grow">
        <h3 className="font-display font-black text-sm text-zinc-800 dark:text-zinc-150 line-clamp-2 leading-tight group-hover:text-orange-500 transition-colors">
          {product.name}
        </h3>
        <p className="text-[10px] text-zinc-400 dark:text-zinc-550 font-bold mt-1.5 uppercase tracking-wide flex flex-wrap items-center gap-1.5">
          <span>{product.category}</span>
          {product.section && (
            <>
              <span className="text-orange-400 dark:text-zinc-700 font-black">•</span>
              <span className="text-orange-600 dark:text-amber-400 font-extrabold">{product.section}</span>
            </>
          )}
        </p>
      </div>
    </motion.div>
  );
}
