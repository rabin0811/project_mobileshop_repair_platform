import { motion } from 'framer-motion';
import { Construction } from 'lucide-react';
import { EmptyState } from '@mobileshop/ui';

export function PlaceholderPage({ title }: { title: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
      <h1 className="mb-6 text-2xl font-bold text-ink">{title}</h1>
      <EmptyState icon={Construction} title={`${title} coming soon`} description="Planned for a later phase." />
    </motion.div>
  );
}
