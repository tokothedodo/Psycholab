import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { EXPERIMENTS_BY_CATEGORY, type ExperimentCategory } from '../data/experiments';
import { SCIENTIFIC_CATEGORIES } from '../data/experimentTaxonomy';
import './ExperimentCatalogPage.css';

const CATEGORY_CLASS_MAP: Record<ExperimentCategory, string> = {
  'perception-psychophysics': 'badge-perception',
  'attention': 'badge-cognitive',
  'memory-learning': 'badge-memory',
  'cognitive-processes': 'badge-cognitive',
  'judgment-decision-making': 'badge-decision',
  'behavioral-economics': 'badge-decision',
  'social-cognition': 'badge-social',
  'moral-psychology': 'badge-social',
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
  const { t } = useLanguage();
  return (
    <Link to={`/experiments/${id}`} className="experiment-card">
      <div className="experiment-card-header">
        <h3 className="experiment-name">{name}</h3>
        <span className={`category-pill ${CATEGORY_CLASS_MAP[category]}`}>
          {SCIENTIFIC_CATEGORIES.find(c => c.id === category)?.name || category}
        </span>
      </div>
      <p className="experiment-description">{description}</p>
      <div className="experiment-footer">
        <div className="experiment-citation">
          {citation}, {year}
        </div>
        <div className="flex items-center gap-2">
          <span className="duration-pill">{duration}m</span>
          <div className="start-button">
            {t('catalog.start')}
          </div>
        </div>
      </div>
    </Link>
  );
}

export function ExperimentCatalogPage() {
  const { t } = useLanguage();

  return (
    <div className="animate-fade-in">
      <header className="catalog-header">
        <div className="academic-container">
          <h1>{t('catalog.title')}</h1>
          <p>{t('catalog.subtitle')}</p>
        </div>
      </header>

      <main className="academic-container py-12">
        {EXPERIMENTS_BY_CATEGORY.map((category, idx) => {
          if (category.experiments.length === 0) return null;

          return (
            <section
              key={category.id}
              className="category-section animate-fade-up"
              style={{ animationDelay: `${idx * 100}ms` }}
            >
              <div className="category-header">
                <h2>{t(category.nameKey)}</h2>
                <span className="category-count">
                  {category.experiments.length} Experiments
                </span>
              </div>

              <div className="grid-catalog">
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
