import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { EXPERIMENTS_BY_CATEGORY, type ExperimentCategory } from '../data/experiments';
import { SCIENTIFIC_CATEGORIES } from '../data/experimentTaxonomy';

const CATEGORY_COLORS: Record<ExperimentCategory, string> = {
  'perception-psychophysics': 'bg-blue-100 text-blue-800 border-blue-200',
  'attention': 'bg-amber-100 text-amber-800 border-amber-200',
  'memory-learning': 'bg-purple-100 text-purple-800 border-purple-200',
  'cognitive-processes': 'bg-teal-100 text-teal-800 border-teal-200',
  'judgment-decision-making': 'bg-orange-100 text-orange-800 border-orange-200',
  'behavioral-economics': 'bg-green-100 text-green-800 border-green-200',
  'social-cognition': 'bg-pink-100 text-pink-800 border-pink-200',
  'moral-psychology': 'bg-rose-100 text-rose-800 border-rose-200',
};

interface ExperimentCardProps {
  id: string;
  name: string;
  description: string;
  citation: string;
  year: number;
  duration: number;
  category: ExperimentCategory;
}

function ExperimentCard({ id, name, description, citation, year, duration, category }: ExperimentCardProps) {
  return (
    <Link
      to={`/experiments/${id}`}
      className="block p-5 bg-white border border-border rounded hover:border-primary transition-colors group"
    >
      <div className="flex justify-between items-start mb-2">
        <h3 className="mb-0 group-hover:text-primary transition-colors text-base">{name}</h3>
        <span className={`text-xs px-2 py-1 rounded border whitespace-nowrap ml-2 ${CATEGORY_COLORS[category]}`}>
          {SCIENTIFIC_CATEGORIES.find(c => c.id === category)?.name || category}
        </span>
      </div>
      <p className="text-sm text-gray-600 mb-3">{description}</p>
      <div className="flex justify-between items-center text-xs text-gray-500">
        <span className="italic">{citation}, {year}</span>
        <span>{duration} min</span>
      </div>
    </Link>
  );
}

export function ExperimentCatalogPage() {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      <header className="bg-primary text-white py-8 border-b border-navy-800">
        <div className="academic-container">
          <h1 className="mb-2 text-white">{t('catalog.title')}</h1>
          <p className="text-secondary opacity-90 text-lg">{t('catalog.subtitle')}</p>
        </div>
      </header>

      <main className="academic-container py-8 flex-1">
        {EXPERIMENTS_BY_CATEGORY.map((category) => {
          const catDef = SCIENTIFIC_CATEGORIES.find(c => c.id === category.id);
          if (category.experiments.length === 0) return null;

          return (
            <section key={category.id} className="mb-12">
              <div className="flex justify-between items-end border-b border-border pb-2 mb-6 group">
                <div>
                  <h2 className="mb-0">{t(category.nameKey)}</h2>
                  {catDef && (
                    <p className="text-xs text-text-muted mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {catDef.theoreticalBasis} · <em>{catDef.journalOfReference}</em>
                    </p>
                  )}
                </div>
                <span className="text-text-secondary text-sm">
                  {category.experiments.length} {t('catalog.experiments')}
                </span>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                {[...category.experiments]
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((exp) => (
                    <ExperimentCard
                      key={exp.id}
                      id={exp.id}
                      name={t(exp.nameKey) || exp.name}
                      description={t(exp.descriptionKey) || exp.description}
                      citation={exp.citation}
                      year={exp.year}
                      duration={exp.duration}
                      category={exp.category}
                    />
                  ))}
              </div>
            </section>
          );
        })}
      </main>
    </div>
  );
}
