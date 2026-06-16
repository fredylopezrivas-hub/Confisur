import { MapPin, Phone, ExternalLink } from 'lucide-react';
import { motion } from 'motion/react';

export function SedesContacts() {
  const sedes = [
    {
      name: 'Sede Delicias',
      phone: '+58 414-4536647',
      address: 'Av. Delicias, Maracaibo, Venezuela',
      whatsappUrl: 'https://api.whatsapp.com/send/?phone=584144536647&text&type=phone_number&app_absent=0',
      color: 'from-orange-500 to-amber-500',
    },
    {
      name: 'Sede Sierra Maestra',
      phone: '+58 424-6020247',
      address: 'Zona Sierra Maestra, San Francisco, Venezuela',
      whatsappUrl: 'https://api.whatsapp.com/send/?phone=584246020247&text&type=phone_number&app_absent=0',
      color: 'from-amber-500 to-orange-500',
    }
  ];

  return (
    <div className="py-8 bg-orange-50/50 dark:bg-zinc-950/20 rounded-[32px] p-6 border border-orange-100/50 dark:border-zinc-850/80 my-8">
      <div className="text-center max-w-xl mx-auto mb-6">
        <span className="px-3 py-1 bg-orange-100 dark:bg-orange-950 text-orange-600 dark:text-orange-400 text-xs font-bold rounded-full font-display">
          📍 Canales de Contacto Directo
        </span>
        <h3 className="text-2xl font-display font-black text-zinc-850 dark:text-zinc-100 mt-2">
          Nuestras Sedes & Entregas
        </h3>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          Comunícate directamente con la sucursal más cercana para retiros o envíos a domicilio.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sedes.map((sede) => (
          <motion.div
            key={sede.name}
            whileHover={{ y: -4 }}
            className="bg-white dark:bg-zinc-900 rounded-2xl p-5 shadow-sm border border-orange-50 dark:border-zinc-800/80 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="flex items-center gap-1 bg-green-50 dark:bg-green-950/30 text-green-600 dark:text-green-400 font-display font-medium text-xs px-2.5 py-1 rounded-full border border-green-100/80 dark:border-green-950">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-ping" />
                  WhatsApp Directo
                </span>
                <MapPin className="w-4 h-4 text-orange-400" />
              </div>

              <h4 className="font-display font-black text-lg text-zinc-850 dark:text-zinc-100 mb-1">
                {sede.name}
              </h4>
              <p className="text-xs text-zinc-450 dark:text-zinc-400 flex items-center gap-1.5 mb-1">
                <span className="font-medium text-zinc-500">Dirección:</span> {sede.address}
              </p>
              <p className="text-xs text-zinc-400 dark:text-zinc-500 flex items-center gap-1.5 mb-4">
                <Phone className="w-3.5 h-3.5 text-zinc-400" />
                <span>{sede.phone}</span>
              </p>
            </div>

            <a
              id={`whatsapp-contact-${sede.name.toLowerCase().replace(/\s+/g, '-')}`}
              href={sede.whatsappUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-green-500 hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-700 text-white font-display font-bold text-sm rounded-xl shadow-md shadow-green-500/10 transition-all hover:scale-102 active:scale-95"
            >
              <span>Escribir a {sede.name}</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
