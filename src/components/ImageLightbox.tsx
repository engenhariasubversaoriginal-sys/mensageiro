import React from 'react';
import { motion } from 'motion/react';
import { X, Download } from 'lucide-react';

interface ImageLightboxProps {
  imageUrl: string | null;
  onClose: () => void;
}

export const ImageLightbox: React.FC<ImageLightboxProps> = ({
  imageUrl,
  onClose,
}) => {
  if (!imageUrl) return null;

  return (
    <div id="image-lightbox-overlay" className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-lg p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative max-w-4xl max-h-[90vh] flex flex-col items-center justify-center"
      >
        <div className="absolute -top-12 right-0 flex items-center gap-2">
          <a
            href={imageUrl}
            download="shutdown-imagem.jpg"
            className="p-2 bg-slate-800 text-white rounded-full hover:bg-slate-700 transition-colors"
            title="Baixar imagem"
          >
            <Download className="w-5 h-5" />
          </a>
          <button
            onClick={onClose}
            className="p-2 bg-slate-800 text-white rounded-full hover:bg-slate-700 transition-colors"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <img
          src={imageUrl}
          alt="Visualização em tamanho real"
          className="max-w-full max-h-[80vh] object-contain rounded-2xl shadow-2xl border border-slate-800"
        />
      </motion.div>
    </div>
  );
};
